import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, NeedsFarm, EmptyState, Note, LoadingBlock } from "@/components/ui-kit";
import { ActionCard } from "@/components/ActionCard";
import { useDailyActions } from "@/lib/use-actions";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Action Recommendations — TinyCrops" }, { name: "description", content: "Evidence-based, prioritized recommendations." }] }),
  component: Page,
});

function Page() {
  const items = useDailyActions();
  const { weatherLoading } = useFarm();
  return (
    <NeedsFarm>
      <PageHeader title="Action Recommendations" description="Each item lists its evidence, data time, priority and what is uncertain. Possible causes are possibilities, not diagnoses." />
      <div className="mb-4"><Note>Recommendations never prescribe irrigation or chemical treatment without field confirmation. Inspect first, then decide.</Note></div>
      {weatherLoading ? <LoadingBlock /> : items.length === 0 ? <EmptyState title="No recommendations right now" body="We only raise an item when the data supports it." /> : (
        <div className="grid gap-4 lg:grid-cols-2">{items.map((i) => <ActionCard key={i.id} item={i} detailed />)}</div>
      )}
    </NeedsFarm>
  );
}
