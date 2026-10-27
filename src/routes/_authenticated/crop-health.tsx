import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, Note, Badge2 } from "@/components/ui-kit";
import { SatellitePending } from "@/components/SatellitePending";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations, STATUS_META } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/crop-health")({
  head: () => ({ meta: [{ title: "Crop Health Monitoring — TinyCrops" }, { name: "description", content: "Vegetation condition across your parcels." }] }),
  component: Page,
});

function Page() {
  const { farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  return (
    <NeedsFarm>
      <PageHeader title="Crop Health Monitoring" description="Parcel-level vegetation summaries with data-quality and cloud-cover indicators." />
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Parcel</th><th className="p-3">Crop / stage</th><th className="p-3">Latest NDVI</th><th className="p-3">Observations</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {fp.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No parcels on this farm.</td></tr>}
              {fp.map((p) => {
                const po = obs.filter((o) => o.parcel_id === p.id);
                const last = po[po.length - 1];
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.crop_type ?? "Unknown"}{p.growth_stage ? ` · ${p.growth_stage}` : ""}</td>
                    <td className="p-3">{last?.mean_value != null ? `${Number(last.mean_value).toFixed(2)} (${last.observed_at}, cloud ${last.cloud_cover_pct ?? "?"}%)` : "—"}</td>
                    <td className="p-3">{po.length}</td>
                    <td className="p-3"><Badge2 className={STATUS_META[p.status].cls}>{STATUS_META[p.status].label}</Badge2></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {obs.length === 0 && <SatellitePending what="Crop health monitoring" />}
        <Panel title="How to read vegetation indices">
          <p className="text-sm text-foreground/80">NDVI depends on crop type, growth stage, season and region — there is no single “healthy” threshold. TinyCrops compares each parcel with its own history and with other zones in the same field. Where crop type or growth stage is unknown, comparisons are less reliable.</p>
        </Panel>
        <Note>Downloadable reports will be available once observations exist.</Note>
      </div>
    </NeedsFarm>
  );
}
