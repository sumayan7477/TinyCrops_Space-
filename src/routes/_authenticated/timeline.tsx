import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Panel, NeedsFarm, EmptyState, Badge2, PRIORITY_CLS } from "@/components/ui-kit";
import { SatellitePending } from "@/components/SatellitePending";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations, useTasks } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "Problem Timeline — TinyCrops" }, { name: "description", content: "Per-parcel history of observations, alerts and tasks." }] }),
  component: Page,
});

function Page() {
  const { farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const { data: tasks = [] } = useTasks();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  const [pid, setPid] = useState<string | undefined>();
  const parcel = fp.find((p) => p.id === pid) ?? fp[0];
  const po = obs.filter((o) => o.parcel_id === parcel?.id);
  const pt = tasks.filter((t) => t.parcel_id === parcel?.id || (!t.parcel_id && t.farm_id === farm?.id));
  const valid = po.filter((o) => o.mean_value != null);
  const last = valid[valid.length - 1], prev = valid[valid.length - 2];

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
          {po.length === 0 ? <SatellitePending what="The vegetation timeline" /> : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Panel><p className="text-xs text-muted-foreground">Observations</p><p className="text-2xl font-semibold">{po.length}</p><p className="text-xs text-muted-foreground">{po[0].observed_at} → {po[po.length - 1].observed_at}</p></Panel>
                <Panel><p className="text-xs text-muted-foreground">Latest vs previous</p><p className="text-2xl font-semibold">{last && prev ? (Number(last.mean_value) - Number(prev.mean_value)).toFixed(3) : "—"}</p></Panel>
                <Panel><p className="text-xs text-muted-foreground">Cloud-affected</p><p className="text-2xl font-semibold">{po.filter((o) => o.mean_value == null).length}</p></Panel>
              </div>
              <Panel title="NDVI over time">
                <div className="h-64"><ResponsiveContainer><LineChart data={po.map((o) => ({ d: o.observed_at, v: o.mean_value }))}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" fontSize={11} /><YAxis domain={[0, 1]} fontSize={11} /><Tooltip /><Line dataKey="v" name="NDVI" stroke="var(--primary)" connectNulls={false} /></LineChart></ResponsiveContainer></div>
                <p className="mt-2 text-xs text-muted-foreground">Gaps are cloud-covered or missing observations. “First observed” means first observed in the available data.</p>
              </Panel>
            </>
          )}
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
