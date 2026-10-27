import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, Freshness, Note, Badge2 } from "@/components/ui-kit";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFarm } from "@/lib/farm-context";
import { heatRisk, HEAT_LABEL, HEAT_GUIDANCE, INTENSITY_ADJUST, type Intensity, type HeatRisk } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/heat-safety")({
  head: () => ({ meta: [{ title: "Heat Safety Index — TinyCrops" }, { name: "description", content: "Worker heat-stress estimates and precautions." }] }),
  component: Page,
});

export const RISK_CLS: Record<HeatRisk, string> = {
  lower: "bg-success/15 text-success border-success/30",
  caution: "bg-info/10 text-info border-info/30",
  high: "bg-warning/20 text-warning-foreground border-warning/40",
  very_high: "bg-destructive/10 text-destructive border-destructive/30",
  extreme: "bg-destructive text-destructive-foreground border-destructive",
};

function Page() {
  const { weather: w, weatherLoading, weatherError } = useFarm();
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  return (
    <NeedsFarm>
      <PageHeader title="Heat Safety Index" description="Weather-derived heat-stress estimate for outdoor workers." />
      <div className="mb-4">
        <ToggleGroup type="single" value={intensity} onValueChange={(v) => v && setIntensity(v as Intensity)} variant="outline" aria-label="Work intensity">
          <ToggleGroupItem value="light">Light work</ToggleGroupItem>
          <ToggleGroupItem value="moderate">Moderate</ToggleGroupItem>
          <ToggleGroupItem value="heavy">Heavy</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : w && (() => {
        const now = heatRisk(w.current.apparent, intensity);
        return (
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Now</p>
                  <p className="text-4xl font-semibold">{w.current.apparent.toFixed(0)}°C <span className="text-base font-normal text-muted-foreground">apparent</span></p>
                  <p className="text-sm text-muted-foreground">Air {w.current.temp.toFixed(0)}°C · RH {w.current.humidity}% · wind {w.current.wind.toFixed(0)} km/h</p>
                </div>
                <Badge2 className={`px-3 py-1 text-sm ${RISK_CLS[now]}`}>{HEAT_LABEL[now]} risk</Badge2>
              </div>
              <p className="mt-4 text-sm"><strong>Precautions:</strong> {HEAT_GUIDANCE[now]}</p>
              <div className="mt-3"><Freshness source={w.source} at={w.retrievedAt} /></div>
            </Panel>
            <Panel title="Daily peak forecast">
              <div className="grid gap-2 sm:grid-cols-7">
                {w.daily.time.map((d, i) => {
                  const r = heatRisk(w.daily.apparentMax[i], intensity);
                  return (
                    <div key={d} className="rounded-md border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</p>
                      <p className="text-lg font-semibold">{w.daily.apparentMax[i].toFixed(0)}°</p>
                      <Badge2 className={RISK_CLS[r]}>{HEAT_LABEL[r]}</Badge2>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Note tone="warning">
              <p><strong>This is not WBGT.</strong> It uses the forecast apparent temperature (air temperature, humidity and wind) plus a workload adjustment of +{INTENSITY_ADJUST[intensity]}°C for {intensity} work, banded using heat-index style thresholds (27 / 32 / 39 / 46 °C).</p>
              <p className="mt-1">It does not account for direct sun, clothing, PPE or worker acclimatization — real exposure can be higher. Follow your local occupational heat-safety rules; this tool does not replace them.</p>
            </Note>
          </div>
        );
      })()}
    </NeedsFarm>
  );
}
