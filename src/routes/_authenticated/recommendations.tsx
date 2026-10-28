import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, NeedsFarm, EmptyState, Note, LoadingBlock } from "@/components/ui-kit";
import { ActionCard } from "@/components/ActionCard";
import { useDailyActions } from "@/lib/use-actions";
import { useFarm } from "@/lib/farm-context";
import { useViewMode } from "@/lib/view-mode-context";
import { ErrorState } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Action Recommendations — TinyCrops" }, { name: "description", content: "Evidence-based, prioritized recommendations." }, { property: "og:title", content: "Action Recommendations — TinyCrops" }, { property: "og:description", content: "Evidence-based, prioritized recommendations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  const items = useDailyActions();
  const { weatherLoading, weatherError } = useFarm();
  const { mode } = useViewMode();
  return (
    <NeedsFarm>
      <PageHeader title={mode === "farmer" ? "Suggested actions" : "Action Recommendations"} description="Suggestions from the available records. Check the field before deciding on treatment." />
      <div className="mb-4"><Note>Recommendations never prescribe irrigation or chemical treatment without field confirmation. Inspect first, then decide.</Note></div>
      {weatherError && <ErrorState message="Weather is unavailable. Weather-based advice cannot be assessed; your task records are still shown." />}
      {weatherLoading ? <LoadingBlock /> : items.length === 0 ? <EmptyState title="No recommendations from available records" body="Missing weather does not mean conditions are safe. We only raise an item when the data supports it." /> : (
        <div className="grid gap-4 lg:grid-cols-2">{items.map((i) => <ActionCard key={i.id} item={i} detailed />)}</div>
      )}
    </NeedsFarm>
  );
}
