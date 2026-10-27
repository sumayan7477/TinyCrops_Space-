import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader, EmptyState, Badge2, PRIORITY_CLS, Note } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, useMut, run } from "@/lib/data";
import { useDailyActions } from "@/lib/use-actions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TinyCrops" }, { name: "description", content: "Your farm alerts in plain language." }] }),
  component: Page,
});

function Page() {
  const { data: notes = [] } = useNotifications();
  const actions = useDailyActions();
  const toggle = useMut(async ({ id, read }: { id: string; read: boolean }) => run(supabase.from("notifications").update({ read }).eq("id", id)), ["notifications"]);
  const readAll = useMut(async () => run(supabase.from("notifications").update({ read: true }).eq("read", false)), ["notifications"]);
  const saveAlerts = useMut(async () => {
    const existing = new Set(notes.map((n) => n.title));
    const rows = actions.filter((a) => !existing.has(a.title)).map((a) => ({ title: a.title, body: `${a.why} ${a.action} Evidence: ${a.evidence}`, priority: a.priority }));
    if (rows.length) await run(supabase.from("notifications").insert(rows));
  }, ["notifications"], "Today's alerts saved to your inbox");

  return (
    <>
      <PageHeader title="Notifications" description="In-app alerts. Email and push delivery are not set up yet."
        actions={<>
          <Button variant="outline" onClick={() => saveAlerts.mutate(undefined)} disabled={!actions.length}>Save today's alerts</Button>
          <Button variant="ghost" onClick={() => readAll.mutate(undefined)}>Mark all read</Button>
        </>} />
      {notes.length === 0 ? <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" body="Alerts you save from today's actions appear here." /> : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className={`rounded-lg border p-4 ${n.read ? "bg-card" : "border-primary/30 bg-accent/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" aria-label="unread" />}{n.title} <Badge2 className={PRIORITY_CLS[n.priority] ?? ""}>{n.priority}</Badge2></p>
                  <p className="mt-1 text-sm text-foreground/80">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: n.id, read: !n.read })}>{n.read ? "Mark unread" : "Mark read"}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6"><Note>Browser push and email notifications will only be described as delivered once a delivery service confirms it.</Note></div>
    </>
  );
}
