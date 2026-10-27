import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, Freshness, Note, Badge2, EmptyState, RISK_CLS } from "@/components/ui-kit";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useFarm } from "@/lib/farm-context";
import { safeWorkWindows, heatRisk, HEAT_LABEL, HEAT_GUIDANCE, type Intensity } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/work-windows")({
  head: () => ({ meta: [{ title: "Safe Work Windows — TinyCrops" }, { name: "description", content: "Suggested lower-heat periods for outdoor farm work." }] }),
  component: Page,
});

const fmt = (t: string) => new Date(t).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
const BREAKS: Record<Intensity, string> = { light: "Short break each hour", moderate: "10–15 min shaded break every 45 min", heavy: "15 min shaded break every 30 min" };

function Page() {
  const { weather: w, weatherLoading, weatherError } = useFarm();
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [duration, setDuration] = useState(2);
  const windows = useMemo(() => (w ? safeWorkWindows(w.hourly, intensity, duration) : []), [w, intensity, duration]);
  const postpone = w ? w.hourly.time.filter((t, i) => Number(t.slice(11, 13)) >= 6 && Number(t.slice(11, 13)) <= 20 && ["high", "very_high", "extreme"].includes(heatRisk(w.hourly.apparent[i], intensity))) : [];

  return (
    <NeedsFarm>
      <PageHeader title="Safe Work Windows & Labor Planning" description="Periods in the next 72 hours where forecast heat, wind and rain look less stressful for the chosen task." />
      <Panel className="mb-6">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <Label className="mb-2 block">Task intensity</Label>
            <ToggleGroup type="single" value={intensity} onValueChange={(v) => v && setIntensity(v as Intensity)} variant="outline">
              <ToggleGroupItem value="light">Light</ToggleGroupItem><ToggleGroupItem value="moderate">Moderate</ToggleGroupItem><ToggleGroupItem value="heavy">Heavy</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="w-64">
            <Label className="mb-2 block">Planned duration: {duration} h</Label>
            <Slider min={1} max={8} step={1} value={[duration]} onValueChange={(v) => setDuration(v[0])} />
          </div>
        </div>
      </Panel>
      {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : w && (
        <div className="space-y-6">
          {windows.length === 0 ? (
            <EmptyState title="No suitable window found" body={`No ${duration}-hour daylight period meets the conditions for ${intensity} work. Consider shorter tasks, lighter work, or reassessing later.`} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {windows.map((win) => (
                <Panel key={win.start}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{fmt(win.start)} → {fmt(win.end).split(" ").pop()}</p>
                    <Badge2 className={RISK_CLS[win.risk]}>{HEAT_LABEL[win.risk]}</Badge2>
                  </div>
                  <p className="mt-2 text-sm text-foreground/80">{win.hours} h · peak apparent {win.maxApparent.toFixed(0)}°C</p>
                  <p className="mt-1 text-sm"><strong>Why:</strong> {win.reason}</p>
                  <p className="mt-1 text-sm"><strong>Breaks:</strong> {BREAKS[intensity]}. {HEAT_GUIDANCE[win.risk]}</p>
                </Panel>
              ))}
            </div>
          )}
          {postpone.length > 0 && (
            <Panel title="Postpone or reassess">
              <p className="text-sm">{postpone.length} daylight hour(s) reach High heat risk or above for {intensity} work, e.g. {postpone.slice(0, 4).map(fmt).join(", ")}.</p>
            </Panel>
          )}
          <Freshness source={w.source} at={w.retrievedAt} />
          <Note tone="warning">Assumptions: daylight 06:00–20:00 local farm time ({w.timezone}); acceptable = heat risk at or below Caution, wind &lt; 40 km/h, rain chance &lt; 60%. Forecasts carry uncertainty that grows with lead time. A suggested window is not a guarantee of safety — keep monitoring workers and follow local occupational rules.</Note>
        </div>
      )}
    </NeedsFarm>
  );
}
