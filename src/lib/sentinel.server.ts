// Copernicus Data Space / Sentinel Hub service (server-only). Secrets never leave this module.
const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SH = "https://sh.dataspace.copernicus.eu/api/v1";

export class SentinelError extends Error {
  constructor(public kind: "auth" | "api" | "config", message: string) { super(message); }
}

let cached: { token: string; exp: number } | null = null;

export async function getToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const id = process.env["COPERNICUS_CLIENT_ID"], secret = process.env["COPERNICUS_CLIENT_SECRET"];
  if (!id || !secret) throw new SentinelError("config", "Copernicus credentials are not configured on the server.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!res.ok) {
    console.error("CDSE token error", res.status, (await res.text()).slice(0, 200));
    throw new SentinelError("auth", "Copernicus rejected the credentials. Check the client ID and secret.");
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

// NDVI = (B08 - B04) / (B08 + B04); cloud, shadow, snow and no-data pixels masked via the SCL band.
const EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:["B04","B08","SCL","dataMask"]}],output:[{id:"ndvi",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]}}
function evaluatePixel(s){var bad=[0,1,3,8,9,10,11].indexOf(s.SCL)>=0;var d=s.B08+s.B04;var n=d===0?0:(s.B08-s.B04)/d;return{ndvi:[n],dataMask:[(s.dataMask==1&&!bad&&d!==0)?1:0]}}`;

export interface NdviPoint { date: string; mean: number; min: number; max: number; validPixels: number; maskedPixels: number; cloudCoverPct: number | null }

type Geo = { bbox: [number, number, number, number] } | { geometry: unknown };

async function sh(path: string, body: unknown, token: string) {
  const res = await fetch(`${SH}${path}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401 || res.status === 403) throw new SentinelError("auth", "Sentinel Hub denied access for this account.");
  if (res.status === 429) throw new SentinelError("api", "Sentinel Hub quota or rate limit reached. Try again later.");
  if (!res.ok) {
    console.error("Sentinel Hub error", path, res.status, (await res.text()).slice(0, 300));
    throw new SentinelError("api", `Sentinel Hub request failed (${res.status}).`);
  }
  return res.json();
}

export async function fetchNdvi(geo: Geo, from: string, to: string): Promise<NdviPoint[]> {
  const token = await getToken();
  const bounds = "bbox" in geo
    ? { bbox: geo.bbox, properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" } }
    : { geometry: geo.geometry, properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" } };
  const timeRange = { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` };
  const [stats, cat] = await Promise.all([
    sh("/statistics", {
      input: { bounds, data: [{ type: "sentinel-2-l2a", dataFilter: { maxCloudCoverage: 90 } }] },
      aggregation: { timeRange, aggregationInterval: { of: "P1D" }, evalscript: EVALSCRIPT, resx: 0.0001, resy: 0.0001 },
    }, token),
    sh("/catalog/1.0.0/search", {
      collections: ["sentinel-2-l2a"],
      ...("bbox" in geo ? { bbox: geo.bbox } : { intersects: geo.geometry }),
      datetime: `${timeRange.from}/${timeRange.to}`, limit: 100,
      fields: { include: ["properties.datetime", "properties.eo:cloud_cover"] },
    }, token).catch(() => ({ features: [] })),
  ]);
  const cloud = new Map<string, number>();
  for (const f of (cat as { features?: { properties: Record<string, unknown> }[] }).features ?? []) {
    const d = String(f.properties["datetime"]).slice(0, 10), c = Number(f.properties["eo:cloud_cover"]);
    if (isFinite(c)) cloud.set(d, Math.min(cloud.get(d) ?? 100, c));
  }
  const out: NdviPoint[] = [];
  for (const row of (stats as { data?: { interval: { from: string }; outputs?: { ndvi?: { bands: { B0: { stats: Record<string, number> } } } } }[] }).data ?? []) {
    const s = row.outputs?.ndvi?.bands.B0.stats;
    if (!s || !s["sampleCount"] || s["sampleCount"] <= s["noDataCount"]! || !isFinite(s["mean"]!)) continue;
    const date = row.interval.from.slice(0, 10);
    out.push({ date, mean: s["mean"]!, min: s["min"]!, max: s["max"]!, validPixels: s["sampleCount"] - s["noDataCount"]!, maskedPixels: s["noDataCount"]!, cloudCoverPct: cloud.get(date) ?? null });
  }
  return out;
}
