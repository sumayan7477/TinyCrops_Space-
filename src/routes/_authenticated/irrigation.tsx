import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, Freshness, Note, Badge2 } from "@/components/ui-kit";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations } from "@/lib/data";
import { drynessAlert } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/irrigation")({
  head: () => ({ meta: [{ title: "Smart Irrigation Alerts — TinyCrops" }, { name: "description", content: "Possible water-stress indicators per parcel." }] }),
  component: Page,
});

function Row({ k, v, kind }: { k: string; v: string; kind: "Observed" | "Derived" | "Estimated" | "Farmer" | "Missing" }) {
  const cls = { Observed: "bg-info/10 text-info border-info/30", Derived: "bg-accent text-accent-foreground border-border", Estimated: "bg-warning/20 text-warning-foreground border-warning/40", Farmer: "bg-success/15 text-success border-success/30", Missing: "bg-muted text-muted-foreground border-border" }[kind];
  return <div className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"><span>{k}</span><span className="flex items-center gap-2 text-right"><span>{v}</span><Badge2 className={cls}>{kind}</Badge2></span></div>;
}

/** Linear-ish NDVI change between last two usable observations; null when not enough data. */
function vegDecline(values: { observed_at: string; mean_value: number | null }[]) {
  const v = values.filter((o) => o.mean_value != null);
  if (v.length < 2) return null;
  return (v[v.length - 1].mean_value as number) < (v[v.length - 2].mean_value as number) - 0.05;
}

function Page() {
  const { farm, weather: w, weatherLoading, weatherError } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  return (
    <NeedsFarm>
      <PageHeader title="Smart Irrigation Alerts" description="Combines rainfall, forecast and vegetation change to suggest where an irrigation check may be useful." />
      {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : w && (
        <div className="space-y-4">
          {fp.length === 0 && <Note>No parcels yet — showing a farm-level assessment only.</Note>}
          {(fp.length ? fp : [{ id: "farm", name: farm!.name, irrigated: null as boolean | null }]).map((p) => {
            const po = obs.filter((o) => o.parcel_id === p.id);
            const decline = vegDecline(po);
            const a = drynessAlert(w.past7RainMm, w.next3RainMm, decline);
            return (
              <Panel key={p.id} title={p.name} right={<Badge2 className={a.level === "inspect" ? "bg-warning/20 text-warning-foreground border-warning/40" : a.level === "monitor" ? "bg-info/10 text-info border-info/30" : "bg-muted text-muted-foreground border-border"}>{a.level === "none" ? "No alert" : a.level === "monitor" ? "Monitor" : "Possible water stress"}</Badge2>}>
                <Row k="Rain, past 7 days" v={`${w.past7RainMm.toFixed(1)} mm`} kind="Observed" />
                <Row k="Rain forecast, next 3 days" v={`${w.next3RainMm.toFixed(1)} mm`} kind="Estimated" />
                <Row k="Peak temperature today" v={`${w.daily.tMax[0].toFixed(0)} °C`} kind="Estimated" />
                <Row k="Vegetation change (NDVI)" v={decline == null ? "No satellite data" : decline ? "Declined" : "Stable"} kind={decline == null ? "Missing" : "Derived"} />
                <Row k="Soil moisture" v="No source connected" kind="Missing" />
                <Row k="Irrigation on this parcel" v={p.irrigated == null ? "Not recorded" : p.irrigated ? "Yes" : "No"} kind={p.irrigated == null ? "Missing" : "Farmer"} />
                <p className="mt-3 text-sm">
                  {a.level === "none" && "Rainfall is not low enough to raise a dryness alert."}
                  {a.level === "monitor" && "Dry conditions: little rain recorded and little forecast. Check soil moisture and irrigation equipment before deciding whether to irrigate."}
                  {a.level === "inspect" && "Possible water stress: vegetation indicators declined and little rainfall has been recorded. Check soil moisture and irrigation equipment before deciding whether to irrigate."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Confidence: {a.confidence}. Low rainfall does not prove the soil is dry.</p>
              </Panel>
            );
          })}
          <Freshness source={w.source} at={w.retrievedAt} />
        </div>
      )}
    </NeedsFarm>
  );
}
