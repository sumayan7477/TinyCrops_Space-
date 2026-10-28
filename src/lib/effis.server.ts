import { XMLParser, XMLValidator } from "fast-xml-parser";
import { inBounds, parseDangerHtml, type EffisLayer, type EffisResult } from "./effis";
const ENDPOINT = "https://maps.effis.emergency.copernicus.eu/effis";
const array = <T,>(v: T | T[] | undefined): T[] => v === undefined ? [] : Array.isArray(v) ? v : [v];
export function readCapabilities(xml: string): EffisLayer[] {
  if (XMLValidator.validate(xml) !== true || !xml.includes("WMT_MS_Capabilities")) throw new Error("Invalid EFFIS catalogue");
  const root = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false }).parse(xml);
  const out: EffisLayer[] = [];
  const walk = (layer: any, inherited = false) => {
    const queryable = layer["@_queryable"] === undefined ? inherited : String(layer["@_queryable"]) === "1";
    if (typeof layer.Name === "string") {
      const time = array<any>(layer.Extent).find((e) => e["@_name"] === "time");
      const box = layer.LatLonBoundingBox;
      const bounds = box ? ["minx", "miny", "maxx", "maxy"].map((k) => Number(box[`@_${k}`])) : null;
      out.push({ name: layer.Name, queryable, defaultTime: time?.["@_default"] ?? null, extent: time?.["#text"] ?? null, bounds: bounds?.every(Number.isFinite) ? bounds : null });
    }
    array<any>(layer.Layer).forEach((l) => walk(l, queryable));
  };
  array<any>(root.WMT_MS_Capabilities?.Capability?.Layer).forEach((l) => walk(l));
  if (!out.length) throw new Error("Empty EFFIS catalogue");
  return out;
}
async function textRequest(params: Record<string, string>, fetcher: typeof fetch) {
  const url = new URL(ENDPOINT);
  Object.entries({ SERVICE: "WMS", VERSION: "1.1.1", ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetcher(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error("EFFIS service failure");
  const text = await res.text();
  if (/<ServiceException|<ExceptionReport/i.test(text)) throw new Error("EFFIS rejected query");
  return text;
}
function pointParams(layer: string, lat: number, lon: number, time: string) {
  return { REQUEST: "GetFeatureInfo", LAYERS: layer, QUERY_LAYERS: layer, STYLES: "", SRS: "EPSG:4326", BBOX: [lon - .001, lat - .001, lon + .001, lat + .001].join(","), WIDTH: "101", HEIGHT: "101", X: "50", Y: "50", FORMAT: "image/png", INFO_FORMAT: "text/html", FEATURE_COUNT: "1", TIME: time };
}
export async function fetchEffis(lat: number, lon: number, fetcher: typeof fetch = fetch, now = new Date()): Promise<EffisResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Invalid farm coordinates");
  const result: EffisResult = {
    checkedAt: now.toISOString(), serviceResponded: false, layers: [],
    danger: { state: "error", message: "Fire-danger information is unavailable. Check official local warnings.", date: null, category: null, fwi: null, queriedDates: [] },
    fires: { state: "unsupported", message: "Nearby fires cannot be checked completely through this map service. No absence of fires is inferred. Consult the official viewer or downloadable active-fire data.", queryResponded: false, time: null },
  };
  try {
    const all = readCapabilities(await textRequest({ REQUEST: "GetCapabilities" }, fetcher));
    result.serviceResponded = true;
    result.layers = all.filter((l) => ["mf010.query", "mf010.fwi", "viirs.hs.query", "modis.hs.query", "noaa.hs.query"].includes(l.name));
    const danger = all.find((l) => l.name === "mf010.query");
    const fire = all.find((l) => l.name === "viirs.hs.query");
    await Promise.all([
      (async () => {
        if (!danger?.queryable) { result.danger.state = "unsupported"; result.danger.message = "The fire-danger location layer is missing or not queryable."; return; }
        if (!inBounds(lat, lon, danger.bounds)) { result.danger.state = "unsupported"; result.danger.message = "This farm is outside the advertised regional fire-danger query coverage."; return; }
        const today = now.toISOString().slice(0, 10);
        const dates = [today];
        const d = danger.defaultTime;
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== today && Math.abs(Date.parse(d) - Date.parse(today)) <= 7 * 86400000) dates.push(d);
        let responded = false;
        for (const date of dates) {
          result.danger.queriedDates.push(date);
          try {
            const html = await textRequest(pointParams(danger.name, lat, lon, date), fetcher);
            responded = true;
            const reading = parseDangerHtml(html, date);
            if (reading) { result.danger = { ...result.danger, ...reading, state: "available", message: "Regional forecast, not a prediction for an individual field." }; return; }
          } catch { /* Try only the other advertised recent date. */ }
        }
        result.danger.state = responded ? "no_data" : "error";
        result.danger.message = responded ? "EFFIS responded but supplied no usable dated fire-danger value for this farm. Risk level is unknown." : "EFFIS fire-danger queries failed or timed out. Risk level is unknown.";
      })(),
      (async () => {
        if (!fire?.queryable) { result.fires.message = "The active-fire query layer is missing or not queryable. Nearby fires are unknown."; return; }
        const time = `${new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10)}/${now.toISOString().slice(0, 10)}`;
        result.fires.time = time;
        try { await textRequest({ ...pointParams(fire.name, lat, lon, time), INFO_FORMAT: "text/plain" }, fetcher); result.fires.queryResponded = true; }
        catch { result.fires.state = "error"; result.fires.message = "The active-fire point query failed or timed out. Nearby fires remain unknown."; }
      })(),
    ]);
  } catch { result.danger.message = "EFFIS is unavailable or its layer catalogue could not be read. No current fire-risk assessment is available."; }
  return result;
}