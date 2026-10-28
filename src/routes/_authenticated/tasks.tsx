import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, Badge2, PRIORITY_CLS, LoadingBlock, ErrorState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useParcels, useMut, run, type Task } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Farm Task List — TinyCrops" }, { name: "description", content: "Inspections and follow-ups created from alerts." }, { property: "og:title", content: "Farm Task List — TinyCrops" }, { property: "og:description", content: "Inspections and follow-ups created from alerts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

const STATUSES = ["pending", "in_progress", "completed", "dismissed"] as const;
const PRIOS = ["low", "medium", "high", "urgent"] as const;

function TaskForm({ initial, onDone }: { initial?: Task; onDone: () => void }) {
  const { farms, farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  const [f, setF] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "", assignee: initial?.assignee ?? "",
    priority: initial?.priority ?? "medium", due_date: initial?.due_date ?? "", follow_up_date: initial?.follow_up_date ?? "",
    notes: initial?.notes ?? "", farm_id: initial?.farm_id ?? farm?.id ?? "", parcel_id: initial?.parcel_id ?? "none",
    intensity: initial?.intensity ?? "none",
  });
  const save = useMut(async () => {
    if (!f.title.trim()) throw new Error("Title is required");
    const row = {
      title: f.title.trim().slice(0, 200), description: f.description || null, assignee: f.assignee || null, priority: f.priority,
      due_date: f.due_date || null, follow_up_date: f.follow_up_date || null, notes: f.notes || null,
      farm_id: f.farm_id || null, parcel_id: f.parcel_id === "none" ? null : f.parcel_id, intensity: f.intensity === "none" ? null : f.intensity,
    };
    if (initial) await run(supabase.from("tasks").update(row).eq("id", initial.id));
    else await run(supabase.from("tasks").insert(row));
    onDone();
  }, ["tasks"], initial ? "Task updated" : "Task created");
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <div className="grid gap-3">
      <div><Label>Title</Label><Input value={f.title} onChange={(e) => set("title")(e.target.value)} maxLength={200} /></div>
      <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => set("description")(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Farm</Label><Select value={f.farm_id} onValueChange={set("farm_id")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{farms.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Parcel</Label><Select value={f.parcel_id} onValueChange={set("parcel_id")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Whole farm</SelectItem>{parcels.filter((p) => p.farm_id === f.farm_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Assign to</Label><Input value={f.assignee} onChange={(e) => set("assignee")(e.target.value)} placeholder="Name" /></div>
        <div><Label>Priority</Label><Select value={f.priority} onValueChange={set("priority")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Due date</Label><Input type="date" value={f.due_date} onChange={(e) => set("due_date")(e.target.value)} /></div>
        <div><Label>Follow-up check</Label><Input type="date" value={f.follow_up_date} onChange={(e) => set("follow_up_date")(e.target.value)} /></div>
        <div><Label>Work intensity</Label><Select value={f.intensity} onValueChange={set("intensity")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="heavy">Heavy</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label>Inspection notes</Label><Textarea value={f.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="What did you find in the field?" /></div>
      <DialogFooter><Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>Save</Button></DialogFooter>
    </div>
  );
}

function Page() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const { data: parcels = [] } = useParcels();
  const { farms } = useFarm();
  const [status, setStatus] = useState("open");
  const [farmF, setFarmF] = useState("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);
  const setTaskStatus = useMut(async ({ id, s }: { id: string; s: string }) => run(supabase.from("tasks").update({ status: s }).eq("id", id)), ["tasks"]);
  const del = useMut(async (id: string) => run(supabase.from("tasks").delete().eq("id", id)), ["tasks"], "Task deleted");
  const today = new Date().toISOString().slice(0, 10);

  const list = tasks.filter((t) => (status === "open" ? ["pending", "in_progress"].includes(t.status) : status === "all" || t.status === status) && (farmF === "all" || t.farm_id === farmF));

  return (
    <>
      <PageHeader title="Farm Task List" description="Tasks stay open until you change their status yourself."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New task</Button></DialogTrigger>
            <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader><TaskForm onDone={() => setOpen(false)} /></DialogContent>
          </Dialog>
        } />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
        <Select value={farmF} onValueChange={setFarmF}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All farms</SelectItem>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <LoadingBlock /> : error ? <ErrorState message={(error as Error).message} /> : list.length === 0 ? (
        <EmptyState title="No tasks here" body="Create a task, or use “Create task” on any alert in the Daily Dashboard." />
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(t)}>
                <p className="font-medium">{t.title} <Badge2 className={PRIORITY_CLS[t.priority]}>{t.priority}</Badge2>
                  {t.due_date && t.due_date < today && ["pending", "in_progress"].includes(t.status) && <Badge2 className="ml-1 border-destructive/30 bg-destructive/10 text-destructive">overdue</Badge2>}</p>
                <p className="text-xs text-muted-foreground">
                  {farms.find((f) => f.id === t.farm_id)?.name ?? "—"}{t.parcel_id && ` · ${parcels.find((p) => p.id === t.parcel_id)?.name}`}
                  {t.assignee && ` · ${t.assignee}`}{t.due_date && ` · due ${t.due_date}`}{t.follow_up_date && ` · follow-up ${t.follow_up_date}`}
                </p>
                {t.source_alert && <p className="mt-1 text-xs text-muted-foreground">From alert: {t.source_alert}</p>}
                {t.notes && <p className="mt-1 text-sm">{t.notes}</p>}
              </button>
              <div className="flex items-center gap-2">
                <Select value={t.status} onValueChange={(s) => setTaskStatus.mutate({ id: t.id, s })}>
                  <SelectTrigger className="w-36" aria-label="Status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => confirm("Delete this task?") && del.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>{edit && <TaskForm initial={edit} onDone={() => setEdit(null)} />}</DialogContent>
      </Dialog>
      <p className="mt-6 text-xs text-muted-foreground">Photo attachments are not supported yet.</p>
    </>
  );
}
