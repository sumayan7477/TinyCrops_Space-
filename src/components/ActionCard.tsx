import { ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge2, PRIORITY_CLS } from "@/components/ui-kit";
import type { ActionItem } from "@/lib/insights";
import { supabase } from "@/integrations/supabase/client";
import { useMut, run } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";

export function ActionCard({ item, detailed }: { item: ActionItem; detailed?: boolean }) {
  const { farm } = useFarm();
  const create = useMut(
    async () =>
      run(supabase.from("tasks").insert({
        title: item.title, description: item.action, source_alert: `${item.evidence} (${item.observedAt.slice(0, 10)})`,
        priority: item.priority, farm_id: farm?.id ?? null, due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      })),
    ["tasks"], "Task created",
  );
  return (
    <article className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-sans text-base font-semibold">{item.title}</h3>
          <p className="text-xs text-muted-foreground">{item.where}</p>
        </div>
        <div className="flex gap-1.5">
          <Badge2 className={PRIORITY_CLS[item.priority]}>{item.priority}</Badge2>
          <Badge2 className="border-border bg-muted text-muted-foreground">confidence: {item.confidence}</Badge2>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div><dt className="inline font-medium">Why it matters: </dt><dd className="inline text-foreground/80">{item.why}</dd></div>
        <div><dt className="inline font-medium">What to do: </dt><dd className="inline text-foreground/80">{item.action}</dd></div>
        <div><dt className="inline font-medium">Evidence: </dt><dd className="inline text-foreground/80">{item.evidence}</dd></div>
        {detailed && <div><dt className="inline font-medium">Uncertainty: </dt><dd className="inline text-foreground/80">{item.uncertainty}</dd></div>}
      </dl>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Data time: {new Date(item.observedAt).toLocaleString()}</p>
        {item.category !== "task" && (
          <Button size="sm" variant="outline" onClick={() => create.mutate(undefined)} disabled={create.isPending || create.isSuccess}>
            <ListPlus className="mr-1 h-4 w-4" />{create.isSuccess ? "Task added" : "Create task"}
          </Button>
        )}
      </div>
    </article>
  );
}
