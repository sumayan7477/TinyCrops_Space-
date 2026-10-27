import { queryOptions, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Farm = Database["public"]["Tables"]["farms"]["Row"];
export type Parcel = Database["public"]["Tables"]["parcels"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Observation = Database["public"]["Tables"]["observations"]["Row"];

const unwrap = <T,>(r: { data: T | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export const farmsQuery = queryOptions({
  queryKey: ["farms"],
  queryFn: async () => unwrap(await supabase.from("farms").select("*").order("created_at")),
});
export const parcelsQuery = queryOptions({
  queryKey: ["parcels"],
  queryFn: async () => unwrap(await supabase.from("parcels").select("*").order("created_at")),
});
export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => unwrap(await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false })),
});
export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false })),
});
export const observationsQuery = queryOptions({
  queryKey: ["observations"],
  queryFn: async () => unwrap(await supabase.from("observations").select("*").order("observed_at")),
});
export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const r = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  },
});

export const useFarms = () => useQuery(farmsQuery);
export const useParcels = () => useQuery(parcelsQuery);
export const useTasks = () => useQuery(tasksQuery);
export const useNotifications = () => useQuery(notificationsQuery);
export const useObservations = () => useQuery(observationsQuery);
export const useProfile = () => useQuery(profileQuery);

export function useMut<V>(fn: (v: V) => Promise<unknown>, keys: string[], ok?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (ok) toast.success(ok);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function run<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  return unwrap(await p);
}

export const STATUS_META: Record<Parcel["status"], { label: string; cls: string; color: string }> = {
  normal: { label: "Normal", cls: "bg-success/15 text-success border-success/30", color: "var(--success)" },
  monitor: { label: "Monitor", cls: "bg-info/10 text-info border-info/30", color: "var(--info)" },
  needs_inspection: { label: "Needs inspection", cls: "bg-warning/20 text-warning-foreground border-warning/40", color: "var(--warning)" },
  high_priority: { label: "High priority", cls: "bg-destructive/10 text-destructive border-destructive/30", color: "var(--destructive)" },
  insufficient_data: { label: "Insufficient data", cls: "bg-muted text-muted-foreground border-border", color: "var(--unknown)" },
};
