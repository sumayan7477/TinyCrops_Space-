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
  const sorted = obs.filter((o) => o.mean_value != null).sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  const points: TrendPoint[] = sorted.map((o) => {
    const cf = parseClearFraction(o.quality);
    let reason: string | undefined;
    if (cf != null && cf < RULES.minClearFraction) reason = `only ${Math.round(cf * 100)}% of parcel cloud-free`;
    else if (o.cloud_cover_pct != null && o.cloud_cover_pct > RULES.maxSceneCloud) reason = `scene ${Math.round(o.cloud_cover_pct)}% cloudy`;
    return { date: o.observed_at, ndvi: Number(o.mean_value), sceneCloud: o.cloud_cover_pct, clearFraction: cf, reliable: !reason, reason };
  });
  const rel = points.filter((p) => p.reliable);
  const approximateBoundary = sorted.some((o) => (o.quality ?? "").includes("farm-point"));
  const cloudRisk = points.some((p) => !p.reliable || (p.clearFraction != null && p.clearFraction < 0.8));
  const tooFew = rel.length < RULES.minReliable;
  let largestGapDays = 0;
  for (let i = 1; i < rel.length; i++) largestGapDays = Math.max(largestGapDays, days(rel[i - 1]!.date, rel[i]!.date));

  const base = { points, reliableCount: rel.length, approximateBoundary, cloudRisk, tooFew, largestGapDays };
  if (tooFew) return { ...base, change: "not_comparable", delta: null, notComparableReason: `Need at least ${RULES.minReliable} clear observations (have ${rel.length}).` };

  const last = rel[rel.length - 1]!;
  // Earliest reliable point within maxSpanDays of the latest
  const first = rel.find((p) => days(p.date, last.date) <= RULES.maxSpanDays)!;
  const span = days(first.date, last.date);
  if (span < RULES.minSpanDays) return { ...base, change: "not_comparable", delta: null, notComparableReason: `Clear observations span only ${span} days.` };

  const delta = Number((last.ndvi - first.ndvi).toFixed(3));
  const compared = { from: first.date, to: last.date, fromValue: first.ndvi, toValue: last.ndvi };
  let change: Change = "stable";
  if (delta >= RULES.noiseBand) change = "increase";
  else if (delta <= -RULES.noiseBand) {
    // A decline is only "consistent" if the previous reliable point is also below the start.
    const prev = rel[rel.length - 2]!;
    change = prev !== first && prev.ndvi - first.ndvi <= -RULES.noiseBand ? "decrease" : "single_drop";
  }
  return { ...base, change, delta, compared };
}
