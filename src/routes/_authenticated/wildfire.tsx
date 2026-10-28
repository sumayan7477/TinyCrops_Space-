import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, NeedsFarm } from "@/components/ui-kit";
import { WildfireRisk } from "@/components/WildfireRisk";

export const Route = createFileRoute("/_authenticated/wildfire")({
  head: () => ({ meta: [{ title: "Wildfire Risk — TinyCrops" }, { name: "description", content: "Regional fire danger and wildfire events from official sources." }, { property: "og:title", content: "Wildfire Risk — TinyCrops" }, { property: "og:description", content: "Regional fire danger and wildfire events from official sources." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  return <NeedsFarm><PageHeader title="Wildfire Risk" description="Regional forecasts and satellite fire detections." /><WildfireRisk /></NeedsFarm>;
}
