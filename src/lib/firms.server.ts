import { clampDays, clampRadius, FIRMS_SOURCES, parseFirmsCsv, radiusBox, type FirmsResult } from "./firms";
const BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
export async function fetchFirms(lat: number, lon: number, radius: number, dayRange: number, key: string | undefined, fetcher: typeof fetch = fetch, now = new Date()): Promise<FirmsResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Invalid farm coordinates");
  const radiusKm = clampRadius(radius), days = clampDays(dayRange);
  const base: FirmsResult = { state: "error", message: "", checkedAt: now.toISOString(), radiusKm, days, sources: [], detections: [], invalidRows: 0 };
  if (!key) return { ...base, state: "not_configured", message: "NASA FIRMS is not connected. Nearby fire detections are unknown." };
  const box = radiusBox(lat, lon, radiusKm);
  await Promise.all(FIRMS_SOURCES.map(async (source) => {
    try {
      const res = await fetcher(`${BASE}/${encodeURIComponent(key)}/${source}/${box}/${days}`, { signal: AbortSignal.timeout(15_000) });
      const text = await res.text();
      if (!res.ok || /invalid|error|exceed/i.test(text.slice(0, 200)) && !text.startsWith("latitude")) throw new Error("FIRMS failure");
      const { detections, invalid } = parseFirmsCsv(text, source, lat, lon, radiusKm);
      base.detections.push(...detections); base.invalidRows += invalid; base.sources.push({ source, ok: true });
    } catch { base.sources.push({ source, ok: false }); }
  }));
  base.detections.sort((a, b) => a.distanceKm - b.distanceKm || b.detectedAt.localeCompare(a.detectedAt));
  const ok = base.sources.filter((s) => s.ok).length;
  if (!ok) return { ...base, state: "error", message: "NASA FIRMS could not be reached. Nearby fire detections are unknown." };
  const partial = ok < FIRMS_SOURCES.length;
  if (base.detections.length) return { ...base, state: partial ? "partial" : "available", message: `${base.detections.length} satellite heat detection(s) within ${radiusKm} km in the last ${days} day(s).${partial ? " Some satellite sources failed, so others may be missing." : ""}` };
  return { ...base, state: partial ? "partial" : "no_results", message: `No satellite heat detections were reported within ${radiusKm} km in the last ${days} day(s). This does not mean there is no fire: clouds, smoke, timing between passes and small fires can cause misses.${partial ? " Some satellite sources failed." : ""}` };
}
