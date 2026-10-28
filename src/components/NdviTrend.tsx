import { CartesianGrid, ComposedChart, Line, Scatter, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Panel, Note } from "@/components/ui-kit";
import { analyzeNdvi, RULES, type NdviObs, type TrendAnalysis } from "@/lib/ndvi-trend";

const MEANING: Record<TrendAnalysis["change"], { head: string; inspect: string }> = {
  increase: { head: "Green vegetation cover increased.", inspect: "Usually expected during canopy growth or after rain/irrigation. If the crop should be maturing or was harvested, check for weeds or regrowth." },
  stable: { head: "No clear change beyond normal satellite variation.", inspect: "No specific follow-up suggested by NDVI alone. Continue routine scouting." },
  decrease: { head: "Green vegetation cover declined across consecutive clear observations.", inspect: "Walk the parcel: look for wilting, yellowing, lodging, pest or disease signs, waterlogging, or uneven emergence. A decline is expected after harvest, senescence or mowing." },
  single_drop: { head: "Only the most recent clear observation is lower.", inspect: "Could be residual haze or a real change. Wait for the next clear pass, or do a quick visual check of the parcel." },
  not_comparable: { head: "Not enough reliable data to compare.", inspect: "Fetch a longer date range, or wait for more cloud-free satellite passes." },
};

export function NdviTrend({ name, obs, crop }: { name: string; obs: (NdviObs & { source: string })[]; crop: string | null }) {
  const a = analyzeNdvi(obs);
  const sources = [...new Set(obs.map((o) => o.source))];
  const data = a.points.map((p) => ({ t: Date.parse(p.date), date: p.date, clear: p.reliable ? p.ndvi : null, flagged: p.reliable ? null : p.ndvi, reason: p.reason, cloud: p.sceneCloud, cf: p.clearFraction }));
  const fmt = (t: number) => new Date(t).toISOString().slice(5, 10);

  return (
    <Panel title={`${name} — NDVI trend`}>
      {a.points.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved satellite observations for this parcel yet. Use “Get satellite NDVI” above.</p>
      ) : (
        <div className="space-y-4">
          <div className="h-56 w-full" role="img" aria-label={`NDVI over time for ${name}`}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={fmt} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis domain={[-0.2, 1]} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip content={({ payload }) => {
                  const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
                  if (!d) return null;
                  return (
                    <div className="rounded border bg-popover p-2 text-xs shadow">
                      <div className="font-medium">{d.date}</div>
                      <div>NDVI {(d.clear ?? d.flagged)!.toFixed(2)}</div>
                      <div>Scene cloud {d.cloud != null ? `${Math.round(d.cloud)}%` : "unknown"}{d.cf != null ? ` · parcel ${Math.round(d.cf * 100)}% clear` : ""}</div>
                      {d.reason && <div className="text-warning-foreground">Excluded from comparison: {d.reason}</div>}
                    </div>
                  );
                }} />
                <Line dataKey="clear" connectNulls stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Scatter dataKey="flagged" fill="var(--chart-3)" shape="cross" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            Line = clear observations ({a.reliableCount}); amber crosses = cloud-affected, shown but not used ({a.points.length - a.reliableCount}). Days without a point had no usable pass. Source: {sources.join(", ")}, 10 m, cloud/shadow masked.
          </p>

          {(a.approximateBoundary || a.cloudRisk || a.tooFew || a.largestGapDays > RULES.gapWarnDays) && (
            <Note tone="warning">
              <span className="font-medium">Data quality: </span>
              {[
                a.approximateBoundary && "No parcel boundary saved — values cover a ~500 m square around the farm point and may include other land.",
                a.cloudRisk && "Some observations are partly cloud-covered; residual haze can lower NDVI.",
                a.tooFew && `Only ${a.reliableCount} clear observation(s) — too few for a trend.`,
                a.largestGapDays > RULES.gapWarnDays && `${a.largestGapDays}-day gap between clear observations.`,
              ].filter(Boolean).join(" ")}
            </Note>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Measured</div>
              {a.compared ? (
                <p className="text-sm">NDVI {a.compared.fromValue.toFixed(2)} on {a.compared.from} → {a.compared.toValue.toFixed(2)} on {a.compared.to} (change {a.delta! > 0 ? "+" : ""}{a.delta!.toFixed(2)}).</p>
              ) : (
                <p className="text-sm">{a.notComparableReason}</p>
              )}
            </div>
            <div className="rounded-md border border-info/30 bg-info/5 p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">What this means · rule-based interpretation</div>
              <p className="text-sm font-medium">{MEANING[a.change].head}</p>
              <p className="mt-1 text-sm text-foreground/80">What to inspect: {MEANING[a.change].inspect}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Rule: compares this parcel with itself only; changes under ±{RULES.noiseBand} are treated as noise; needs ≥{RULES.minReliable} clear observations. {crop ? "" : "Crop type unknown, so expected seasonal patterns can't be considered. "}NDVI does not diagnose disease or measure soil moisture.
              </p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
