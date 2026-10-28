import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Panel, NeedsFarm, EmptyState, Badge2, PRIORITY_CLS } from "@/components/ui-kit";
import { SatellitePending } from "@/components/SatellitePending";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldAdvice } from "@/components/FieldAdvice";
import { NdviTrend } from "@/components/NdviTrend";
import { useViewMode } from "@/lib/view-mode-context";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations, useTasks } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "Problem Timeline — TinyCrops" }, { name: "description", content: "Per-parcel history of observations, alerts and tasks." }, { property: "og:title", content: "Problem Timeline — TinyCrops" }, { property: "og:description", content: "Per-parcel history of observations, alerts and tasks." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  const { mode } = useViewMode();
  const inspector = mode === "inspector";
  const { farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const { data: tasks = [] } = useTasks();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  const [pid, setPid] = useState<string | undefined>();
  const parcel = fp.find((p) => p.id === pid) ?? fp[0];
  const po = obs.filter((o) => o.parcel_id === parcel?.id && o.indicator === "NDVI");
  const pt = tasks.filter((t) => t.parcel_id === parcel?.id || (!t.parcel_id && t.farm_id === farm?.id));

  return (
    <NeedsFarm>
      <PageHeader title="Problem Timeline" description="What changed, when it was first observed in the available data, and what was done about it."
        actions={fp.length > 0 && (
          <Select value={parcel?.id} onValueChange={setPid}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Parcel" /></SelectTrigger>
            <SelectContent>{fp.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )} />
      {!parcel ? <EmptyState title="No parcels" body="Draw a parcel to start a timeline." /> : (
        <div className="space-y-6">
          {inspector ? <NdviTrend name={parcel.name} crop={parcel.crop_type} stage={parcel.growth_stage} boundary={!!parcel.boundary} obs={po} /> : <FieldAdvice parcel={parcel} observations={po} />}
          <Panel title="Alert & task history">
            {pt.length === 0 ? <p className="text-sm text-muted-foreground">No tasks recorded.</p> : (
              <ol className="space-y-3 border-l pl-4">
                {pt.map((t) => (
                  <li key={t.id} className="text-sm">
                    <p className="font-medium">{t.title} <Badge2 className={PRIORITY_CLS[t.priority]}>{t.priority}</Badge2></p>
                    <p className="text-xs text-muted-foreground">Created {new Date(t.created_at).toLocaleDateString()} · {t.status.replace("_", " ")}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}
    </NeedsFarm>
  );
}
