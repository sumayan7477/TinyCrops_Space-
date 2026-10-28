import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Flame } from "lucide-react";
import { PageHeader, Panel, NeedsFarm, EmptyState, Note } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/wildfire")({
  head: () => ({ meta: [{ title: "Wildfire Risk — TinyCrops" }, { name: "description", content: "Regional fire danger and wildfire events from official sources." }, { property: "og:title", content: "Wildfire Risk — TinyCrops" }, { property: "og:description", content: "Regional fire danger and wildfire events from official sources." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  const { farm } = useFarm();
  const effis = `https://forest-fire.emergency.copernicus.eu/apps/effis_current_situation/?lat=${farm?.latitude}&lon=${farm?.longitude}&zoom=9`;
  return (
    <NeedsFarm>
      <PageHeader title="Wildfire Risk" description="Regional fire-danger forecasts and detected fire events near your farms." />
      <div className="space-y-6">
        <EmptyState icon={<Flame className="h-8 w-8" />} title="EFFIS feed not connected yet"
          body="TinyCrops will show fire-danger levels and active fire events from the European Forest Fire Information System once its data service is connected. Until then, no fire probability or distance is shown — we don't estimate it."
          action={<Button asChild variant="outline"><a href={effis} target="_blank" rel="noreferrer">Open EFFIS current situation for this farm <ExternalLink className="ml-1 h-4 w-4" /></a></Button>} />
        <Panel title="What this page will show">
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
            <li>Fire Weather Index danger class for your farm's area (regional, not parcel-level).</li>
            <li>Recent burnt areas and active fire detections, with event dates and source.</li>
            <li>Distance to registered farms, only when event geometry is available.</li>
          </ul>
        </Panel>
        <Note tone="warning">Regional fire danger is not a confirmed threat to a specific parcel. Always follow official warnings from your national civil protection or fire service. EFFIS covers Europe, the Middle East and North Africa; coverage elsewhere is limited.</Note>
      </div>
    </NeedsFarm>
  );
}
