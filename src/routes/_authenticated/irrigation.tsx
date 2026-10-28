import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, Freshness, Note, Badge2 } from "@/components/ui-kit";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations } from "@/lib/data";
import { useViewMode } from "@/lib/view-mode-context";
import { parcelAdvice } from "@/lib/ndvi-trend";
import { drynessAlert } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/irrigation")({
  head: () => ({ meta: [{ title: "Smart Irrigation Alerts — TinyCrops" }, { name: "description", content: "Possible water-stress indicators per parcel." }] }),
  component: Page,
});

function Row({ k, v, kind }: { k: string; v: string; kind: "Observed" | "Derived" | "Estimated" | "Farmer" | "Missing" }) {
  const cls = { Observed: "bg-info/10 text-info border-info/30", Derived: "bg-accent text-accent-foreground border-border", Estimated: "bg-warning/20 text-warning-foreground border-warning/40", Farmer: "bg-success/15 text-success border-success/30", Missing: "bg-muted text-muted-foreground border-border" }[kind];
  return <div className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"><span>{k}</span><span className="flex items-center gap-2 text-right"><span>{v}</span><Badge2 className={cls}>{kind}</Badge2></span></div>;
}

function Page() {
  const { mode } = useViewMode();
  const inspector = mode === "inspector";
  const { farm, weather: w, weatherLoading, weatherError } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  return (
    <NeedsFarm>
      <PageHeader title={inspector ? "Smart Irrigation Alerts" : "Watering checks"} description="Combines rainfall, forecast and vegetation change to suggest where an irrigation check may be useful." />
      {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : w && (
        <div className="space-y-4">
          {fp.length === 0 && <Note>No parcels yet — showing a farm-level assessment only.</Note>}
          {(fp.length ? fp : [{ id: "farm", name: farm?.name ?? "Farm", irrigated: null as boolean | null, boundary: null, crop_type: null, growth_stage: null }]).map((p) => {
            const po = obs.filter((o) => o.parcel_id === p.id && o.indicator === "NDVI");
            const trend = parcelAdvice(po, { boundary: !!p.boundary, crop: p.crop_type, stage: p.growth_stage });
            const decline = trend.limited ? null : trend.analysis.change === "decrease";
            const a = drynessAlert(w.past7RainMm, w.next3RainMm, decline);
            return (
              <Panel key={p.id} title={p.name} right={<Badge2 className={a.level === "inspect" ? "bg-warning/20 text-warning-foreground border-warning/40" : a.level === "monitor" ? "bg-info/10 text-info border-info/30" : "bg-muted text-muted-foreground border-border"}>{a.level === "none" ? "No alert" : a.level === "monitor" ? "Monitor" : "Possible water stress"}</Badge2>}>
                {inspector && <><Row k="Rain, past 7 days" v={`${w.past7RainMm.toFixed(1)} mm`} kind="Observed" />
                <Row k="Rain forecast, next 3 days" v={`${w.next3RainMm.toFixed(1)} mm`} kind="Estimated" />
                <Row k="Peak temperature today" v={`${w.daily.tMax[0].toFixed(0)} °C`} kind="Estimated" />
                <Row k="Vegetation change (NDVI)" v={decline == null ? "Insufficient reliable evidence" : decline ? "Declined" : "No consistent decline"} kind={decline == null ? "Missing" : "Derived"} />
                <Row k="Soil moisture" v="No source connected" kind="Missing" />
                <Row k="Irrigation on this parcel" v={p.irrigated == null ? "Not recorded" : p.irrigated ? "Yes" : "No"} kind={p.irrigated == null ? "Missing" : "Farmer"} /></>}
                <p className="mt-3 text-sm">
                  {a.level === "none" && "Rainfall is not low enough to raise a dryness alert."}
                  {a.level === "monitor" && "Dry conditions: little rain recorded and little forecast. Check soil moisture and irrigation equipment before deciding whether to irrigate."}
                  {a.level === "inspect" && "Possible water stress: vegetation indicators declined and little rainfall has been recorded. Check soil moisture and irrigation equipment before deciding whether to irrigate."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{inspector ? `Confidence: ${a.confidence}. ` : "Suggestion, not a soil measurement. "}Low rainfall does not prove the soil is dry.</p>
                {!inspector && <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary font-medium">Why this advice?</summary><p className="mt-2">Weather estimate: {w.past7RainMm.toFixed(1)} mm rain in the past week; {w.next3RainMm.toFixed(1)} mm forecast for the next three days. {decline === true ? "Clear images also suggest a vegetation decline." : "No reliable continuing vegetation decline established."} No soil moisture readings are connected. Check the soil before watering.</p></details>}
              </Panel>
            );
          })}
          <Freshness source={w.source} at={w.retrievedAt} />
        </div>
      )}
    </NeedsFarm>
  );
}
