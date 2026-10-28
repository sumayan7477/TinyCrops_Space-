// Pure validation helpers for Sentinel-2 requests (shared by server route and tests).
export const MAX_RANGE_DAYS = 120;
export const FARM_HALF_SIZE_DEG = 0.0025; // ~250-280 m each way when no parcel boundary exists

export function validateCoords(lat: unknown, lon: unknown): string | null {
  if (typeof lat !== "number" || typeof lon !== "number" || !isFinite(lat) || !isFinite(lon)) return "Farm coordinates are missing.";
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return "Farm coordinates are out of range.";
  if (lat === 0 && lon === 0) return "Farm coordinates look unset (0, 0).";
  return null;
}

export function validateRange(from: unknown, to: unknown, now = new Date()): string | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof from !== "string" || typeof to !== "string" || !re.test(from) || !re.test(to)) return "Dates must be YYYY-MM-DD.";
  const f = Date.parse(from + "T00:00:00Z"), t = Date.parse(to + "T00:00:00Z");
  if (isNaN(f) || isNaN(t)) return "Invalid date.";
  if (f > t) return "Start date must be before end date.";
  if (t > now.getTime()) return "End date cannot be in the future.";
  if (f < Date.parse("2017-03-28T00:00:00Z")) return "Sentinel-2 L2A data starts in 2017.";
  if ((t - f) / 86400000 > MAX_RANGE_DAYS) return `Date range is limited to ${MAX_RANGE_DAYS} days.`;
  return null;
}

export function farmBbox(lat: number, lon: number): [number, number, number, number] {
  const d = FARM_HALF_SIZE_DEG;
  return [lon - d, lat - d, lon + d, lat + d];
}

/** Returns a GeoJSON Polygon/MultiPolygon geometry if the stored boundary is usable. */
export function usableBoundary(b: unknown): { type: "Polygon" | "MultiPolygon"; coordinates: unknown } | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const g = (o["type"] === "Feature" ? o["geometry"] : o) as Record<string, unknown> | undefined;
  if (g && (g["type"] === "Polygon" || g["type"] === "MultiPolygon") && Array.isArray(g["coordinates"])) return g as never;
  return null;
}
