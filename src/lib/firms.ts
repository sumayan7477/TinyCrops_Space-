export const FIRMS_MAP = "https://firms.modaps.eosdis.nasa.gov/map/";
export const FIRMS_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"] as const;
export type FirmsSource = (typeof FIRMS_SOURCES)[number];
/** Nominal pixel size at nadir, from FIRMS product documentation. */
export const PIXEL_M: Record<FirmsSource, number> = { VIIRS_SNPP_NRT: 375, VIIRS_NOAA20_NRT: 375, VIIRS_NOAA21_NRT: 375, MODIS_NRT: 1000 };
export const STALE_MS = 30 * 60 * 1000;
export interface FirmsDetection { source: FirmsSource; latitude: number; longitude: number; distanceKm: number; detectedAt: string; confidence: string | null; frp: number | null; daynight: string | null }
export interface FirmsResult {
  state: "available" | "no_results" | "not_configured" | "error" | "partial";
  message: string; checkedAt: string; radiusKm: number; days: number;
  sources: { source: FirmsSource; ok: boolean }[]; detections: FirmsDetection[]; invalidRows: number;
}
export const clampRadius = (r: number) => Math.min(100, Math.max(1, Math.round(Number.isFinite(r) ? r : 25)));
export const clampDays = (d: number) => Math.min(5, Math.max(1, Math.round(Number.isFinite(d) ? d : 2)));
const validCoord = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** Bounding box enclosing the radius (west,south,east,north), clipped to valid ranges. */
export function radiusBox(lat: number, lon: number, km: number) {
  const dLat = km / 111.32;
  const dLon = Math.abs(lat) > 89 ? 180 : km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const f = (n: number) => n.toFixed(4);
  return [f(Math.max(-180, lon - dLon)), f(Math.max(-90, lat - dLat)), f(Math.min(180, lon + dLon)), f(Math.min(90, lat + dLat))].join(",");
}
/** Parses FIRMS CSV; rows with invalid coordinates or time are counted, never placed. */
export function parseFirmsCsv(csv: string, source: FirmsSource, farmLat: number, farmLon: number, radiusKm: number) {
  const lines = csv.trim().split(/\r?\n/);
  const head = (lines.shift() ?? "").split(",").map((h) => h.trim());
  if (!head.includes("latitude") || !head.includes("acq_date")) throw new Error("Unexpected FIRMS response");
  const detections: FirmsDetection[] = [];
  let invalid = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const c = line.split(","); const v = (k: string) => c[head.indexOf(k)]?.trim() ?? "";
    const lat = Number(v("latitude")), lon = Number(v("longitude")), date = v("acq_date"), time = v("acq_time").padStart(4, "0");
    if (!v("latitude") || !v("longitude") || !validCoord(lat, lon) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}$/.test(time)) { invalid++; continue; }
    const d = distanceKm(farmLat, farmLon, lat, lon);
    if (d > radiusKm) continue;
    const frp = Number(v("frp"));
    detections.push({ source, latitude: lat, longitude: lon, distanceKm: Math.round(d * 10) / 10, detectedAt: `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`, confidence: v("confidence") || null, frp: v("frp") && Number.isFinite(frp) ? frp : null, daynight: v("daynight") || null });
  }
  return { detections, invalid };
}
export const isStale = (checkedAt: string, now = Date.now()) => !(now - Date.parse(checkedAt) < STALE_MS);
export function confidenceLabel(c: string | null) {
  if (!c) return "not given";
  return ({ l: "low", n: "nominal", h: "high" } as Record<string, string>)[c.toLowerCase()] ?? `${c}%`;
}
