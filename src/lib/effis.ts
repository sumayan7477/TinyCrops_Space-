export const EFFIS_VIEWER = "https://forest-fire.emergency.copernicus.eu/apps/effis.csv/";
export const EFFIS_DOWNLOADS = "https://forest-fire.emergency.copernicus.eu/downloads-instructions";
export type EffisState = "available" | "no_data" | "unsupported" | "error";
export interface EffisLayer { name: string; queryable: boolean; defaultTime: string | null; extent: string | null; bounds: number[] | null }
export interface EffisResult {
  checkedAt: string; serviceResponded: boolean; layers: EffisLayer[];
  danger: { state: EffisState; message: string; date: string | null; category: string | null; fwi: number | null; queriedDates: string[] };
  fires: { state: EffisState; message: string; queryResponded: boolean; time: string | null };
}
export function inBounds(lat: number, lon: number, b: number[] | null) {
  return b?.length === 4 && lon >= b[0] && lat >= b[1] && lon <= b[2] && lat <= b[3];
}
export function currentForecast(date: string | null, now = new Date()) { return date === now.toISOString().slice(0, 10); }
/** Numeric DR codes and map colours are never interpreted without a verified mapping. */
export function parseDangerHtml(html: string, requestedDate: string) {
  const rows = [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/gi)];
  const values = new Map(rows.map((r) => [r[1].trim(), r[2].trim()]));
  const date = values.get("Date");
  if (date !== requestedDate) return null;
  const text = values.get("Fire Weather Index (FWI)");
  const fwi = text && /^\d+(\.\d+)?$/.test(text) ? Number(text) : null;
  const raw = values.get("Danger Risk (DR)")?.toLowerCase();
  const category = raw && ["very low", "low", "moderate", "high", "very high", "extreme", "very extreme"].includes(raw) ? raw : null;
  return fwi !== null || category ? { date, fwi, category } : null;
}