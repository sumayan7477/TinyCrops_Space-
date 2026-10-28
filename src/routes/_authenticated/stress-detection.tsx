import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, Note } from "@/components/ui-kit";
import { LazyMap } from "@/components/LazyMap";
import { useViewMode } from "@/lib/view-mode-context";
import { useFarm } from "@/lib/farm-context";
import { useParcels } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/stress-detection")({
  head: () => ({ meta: [{ title: "Sub-Parcel Stress Detection — TinyCrops" }, { name: "description", content: "Localized vegetation anomalies within fields." }, { property: "og:title", content: "Sub-Parcel Stress Detection — TinyCrops" }, { property: "og:description", content: "Localized vegetation anomalies within fields." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  const { mode } = useViewMode();
  const { farms, farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  return (
    <NeedsFarm>
      <PageHeader title="Sub-Parcel Stress Detection" description="Highlights zones within a field whose vegetation differs from the rest of the field." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <LazyMap farms={farms} parcels={parcels.filter((p) => p.farm_id === farm?.id)} basemap="satellite" center={farm ? [farm.latitude, farm.longitude] : undefined} height={460} />
        <div className="space-y-4">
          {mode === "inspector" && <Panel title="Detection method">
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
              <li>Source: Sentinel-2 L2A surface reflectance, 10 m pixels.</li>
              <li>Index: NDVI = (B8 − B4) / (B8 + B4), cloud-masked.</li>
              <li>Anomaly: pixels well below the parcel's own median and its previous usable observation.</li>
              <li>Affected area: pixel count × 100 m², only when the parcel boundary is drawn.</li>
            </ul>
          </Panel>}
          <Note tone="warning">An anomaly is an observed pattern, not a diagnosis. Satellite data alone cannot prove water stress, disease, pests or nutrient deficiency. At 10 m resolution, individual plants cannot be seen.</Note>
        </div>
      </div>
      <div className="mt-6"><Note tone="warning">Within-field problem zones are not available. Saved readings summarize whole areas, not individual problem locations. No stress overlay or diagnosis is shown.</Note></div>
    </NeedsFarm>
  );
}
