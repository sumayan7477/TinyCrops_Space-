// Rule-based NDVI trend analysis. Compares a parcel only with its own history;
// no universal "healthy" threshold is used anywhere.

export interface NdviObs {
  observed_at: string;
  mean_value: number | null;
  cloud_cover_pct: number | null;
  quality: string | null;
}

export interface TrendPoint {
  date: string;
  ndvi: number;
  sceneCloud: number | null;
  clearFraction: number | null;
  reliable: boolean;
  reason?: string;
}

export type Change = "increase" | "decrease" | "stable" | "single_drop" | "not_comparable";

export interface TrendAnalysis {
  points: TrendPoint[];
  reliableCount: number;
  approximateBoundary: boolean;
  cloudRisk: boolean;
  tooFew: boolean;
  largestGapDays: number;
  change: Change;
  delta: number | null;
  compared?: { from: string; to: string; fromValue: number; toValue: number };
  notComparableReason?: string;
}

// Rule parameters (documented in UI as rule-based)
export const RULES = {
  minReliable: 3,
  minClearFraction: 0.5, // at least half of parcel pixels cloud-free
  maxSceneCloud: 60, // scene-level cloud cover above which residual haze is likely
  noiseBand: 0.05, // NDVI changes smaller than this are treated as no clear change
  minSpanDays: 5,
  maxSpanDays: 90,
  gapWarnDays: 20,
};

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function parseClearFraction(q: string | null): number | null {
  if (!q) return null;
  const m = q.match(/(\d+) clear px, (\d+) masked/);
  if (!m) return null;
  const c = Number(m[1]), k = Number(m[2]);
  return c + k > 0 ? c / (c + k) : null;
}

export function analyzeNdvi(obs: NdviObs[]): TrendAnalysis {
  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
  const sorted = obs.filter((o) => validDate(o.observed_at) && o.mean_value != null && Number.isFinite(Number(o.mean_value)) && Number(o.mean_value) >= -1 && Number(o.mean_value) <= 1).sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  const counts = new Map<string, number>();
  sorted.forEach((o) => counts.set(o.observed_at, (counts.get(o.observed_at) ?? 0) + 1));
  const points: TrendPoint[] = sorted.map((o) => {
    const cf = parseClearFraction(o.quality);
    let reason: string | undefined;
    if ((counts.get(o.observed_at) ?? 0) > 1) reason = "duplicate observation date";
    else if (cf == null) reason = "parcel pixel quality unknown";
    else if (cf < RULES.minClearFraction) reason = `only ${Math.round(cf * 100)}% of parcel pixels usable after masking`;
    else if (o.cloud_cover_pct != null && o.cloud_cover_pct > RULES.maxSceneCloud) reason = `scene ${Math.round(o.cloud_cover_pct)}% cloudy`;
    return { date: o.observed_at, ndvi: Number(o.mean_value), sceneCloud: o.cloud_cover_pct, clearFraction: cf, reliable: !reason, reason };
  });
  const rel = points.filter((p) => p.reliable);
  const approximateBoundary = sorted.some((o) => (o.quality ?? "").includes("farm-point"));
  const cloudRisk = points.some((p) => !p.reliable || (p.clearFraction != null && p.clearFraction < 0.8));
  let largestGapDays = 0;
  for (let i = 1; i < rel.length; i++) {
    const previous = rel[i - 1], current = rel[i];
    if (previous && current) largestGapDays = Math.max(largestGapDays, days(previous.date, current.date));
  }
  const last = rel.at(-1);
  const window = last ? rel.filter((p) => days(p.date, last.date) <= RULES.maxSpanDays) : [];
  const tooFew = window.length < RULES.minReliable;
  const base = { points, reliableCount: rel.length, approximateBoundary, cloudRisk, tooFew, largestGapDays };
  if (!last || tooFew) return { ...base, change: "not_comparable", delta: null, notComparableReason: `Need at least ${RULES.minReliable} clear observations within ${RULES.maxSpanDays} days (have ${window.length}).` };
  const first = window[0];
  if (!first) return { ...base, change: "not_comparable", delta: null };
  const span = days(first.date, last.date);
  if (span < RULES.minSpanDays) return { ...base, change: "not_comparable", delta: null, notComparableReason: `Clear observations span only ${span} days.` };
  for (let i = 1; i < window.length; i++) {
    const previous = window[i - 1], current = window[i];
    if (previous && current && days(previous.date, current.date) > RULES.gapWarnDays) return { ...base, change: "not_comparable", delta: null, notComparableReason: "A long gap between clear observations prevents a reliable trend comparison." };
  }
  const delta = Number((last.ndvi - first.ndvi).toFixed(3));
  const compared = { from: first.date, to: last.date, fromValue: first.ndvi, toValue: last.ndvi };
  let change: Change = "stable";
  if (delta >= RULES.noiseBand) change = "increase";
  else if (delta <= -RULES.noiseBand) {
    const prev = window.at(-2);
    change = prev && prev !== first && prev.ndvi - first.ndvi <= -RULES.noiseBand ? "decrease" : "single_drop";
  }
  return { ...base, change, delta, compared };
}

export function parcelAdvice(obs: NdviObs[], details: { boundary: boolean; crop: string | null; stage: string | null }, today = new Date().toISOString().slice(0, 10)) {
  const analysis = analyzeNdvi(obs);
  const latest = analysis.points.at(-1);
  const latestClear = analysis.points.filter((p) => p.reliable).at(-1);
  const stale = !!latestClear && days(latestClear.date, today) > RULES.gapWarnDays;
  const approximate = !details.boundary || analysis.approximateBoundary;
  const limited = !latest || !latest.reliable || stale || approximate || analysis.change === "not_comparable";
  let summary = "We need a clearer satellite image before making a reliable comparison.";
  let action = "Continue field checks while waiting for clearer images.";
  if (!latest) summary = "No usable satellite readings saved for this field yet.";
  else if (approximate) { summary = "The image area may include land outside this field."; action = "Save a field boundary before relying on a field comparison."; }
  else if (stale) summary = "The last clear image is too old to describe today's field.";
  else if (!limited) {
    if (analysis.change === "stable") { summary = "No clear change detected. Continue your usual field checks."; action = "Continue your usual field checks."; }
    if (analysis.change === "increase") { summary = "Green vegetation cover appears to have increased."; action = "Check whether the change fits the crop's growth or recent fieldwork."; }
    if (analysis.change === "decrease" || analysis.change === "single_drop") { summary = "Possible vegetation decline. Inspect this area before deciding on treatment."; action = analysis.change === "single_drop" ? "Make a visual field check; one lower reading alone does not confirm a continuing decline." : "Walk the field and compare with recent harvest, weather and fieldwork before deciding what to do."; }
  }
  return { analysis, summary, action, stale, limited, approximate, latestDate: latest?.date, clearDate: latestClear?.date,
    missingCropDetails: !details.crop || !details.stage,
    needsInspection: !limited && (analysis.change === "decrease" || analysis.change === "single_drop") };
}
