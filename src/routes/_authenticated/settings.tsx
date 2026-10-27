import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Badge2 } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMut, run } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Data Sources & Settings — TinyCrops" }, { name: "description", content: "Connection status of data sources and your preferences." }] }),
  component: Page,
});

type St = "connected" | "configured" | "unavailable" | "error" | "not_configured";
const ST_CLS: Record<St, string> = {
  connected: "bg-success/15 text-success border-success/30",
  configured: "bg-info/10 text-info border-info/30",
  unavailable: "bg-warning/20 text-warning-foreground border-warning/40",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  not_configured: "bg-muted text-muted-foreground border-border",
};

function Page() {
  const { weather, weatherError, weatherLoading, farm } = useFarm();
  const { data: profile } = useProfile();
  const [name, setName] = useState("");
  const [thr, setThr] = useState("32");
  const [inApp, setInApp] = useState(true);
  useEffect(() => { if (profile) { setName(profile.display_name ?? ""); setThr(String(profile.heat_threshold_c)); setInApp(profile.notify_in_app); } }, [profile]);
  const save = useMut(async () => {
    if (!profile) return;
    const t = Number(thr);
    if (!Number.isFinite(t) || t < 20 || t > 50) throw new Error("Heat threshold must be between 20 and 50 °C");
    await run(supabase.from("profiles").update({ display_name: name.slice(0, 80), heat_threshold_c: t, notify_in_app: inApp }).eq("id", profile.id));
  }, ["profile"], "Settings saved");

  const weatherSt: St = !farm ? "configured" : weatherLoading ? "configured" : weatherError ? "error" : weather ? "connected" : "unavailable";
  const sources: { name: string; status: St; detail: string }[] = [
    { name: "Weather — Open-Meteo", status: weatherSt, detail: weatherError ? weatherError.message : weather ? `Last retrieved ${new Date(weather.retrievedAt).toLocaleString()}. Forecast + 7-day history.` : "Add a farm to fetch weather." },
    { name: "Satellite — Copernicus Data Space (Sentinel-2)", status: "not_configured", detail: "Needs a Copernicus Data Space account (OAuth client) to search and process imagery. Credentials would be stored server-side only." },
    { name: "Wildfire — EFFIS", status: "not_configured", detail: "Fire-danger and active-fire services not yet connected. Not used as a soil-moisture source." },
    { name: "Soil moisture (optional)", status: "not_configured", detail: "Optional adapter for a verified soil-moisture dataset." },
    { name: "AI Farm Assistant", status: "connected", detail: "Answers from your saved records and live weather only." },
    { name: "Database & accounts", status: "connected", detail: "Your farms, parcels and tasks are private to your account." },
  ];

  return (
    <>
      <PageHeader title="Data Sources & Settings" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="API connection status">
          <ul className="divide-y">
            {sources.map((s) => (
              <li key={s.name} className="flex items-start justify-between gap-4 py-3">
                <div><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.detail}</p></div>
                <Badge2 className={ST_CLS[s.status]}>{s.status.replace("_", " ")}</Badge2>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Preferences">
          <div className="space-y-3">
            <div><Label htmlFor="dn">Display name</Label><Input id="dn" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="th">Local heat-safety threshold (°C apparent)</Label><Input id="th" type="number" value={thr} onChange={(e) => setThr(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch id="ia" checked={inApp} onCheckedChange={setInApp} /><Label htmlFor="ia">In-app notifications</Label></div>
            <div className="flex items-center gap-2 opacity-60"><Switch id="em" disabled /><Label htmlFor="em">Email notifications (coming later)</Label></div>
            <Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>Save</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
