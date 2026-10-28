import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Badge2 } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ModeSwitch } from "@/components/ModeSwitch";
import { useViewMode } from "@/lib/view-mode-context";
import { useProfile, useMut, run, useObservations } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";
import { useEffis } from "@/lib/use-effis";
import { useFirms } from "@/lib/use-firms";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Data Sources & Settings — TinyCrops" }, { name: "description", content: "Connection status of data sources and your preferences." }, { property: "og:title", content: "Data Sources & Settings — TinyCrops" }, { property: "og:description", content: "Connection status of data sources and your preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
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
  const { mode } = useViewMode();
  const inspector = mode === "inspector";
  const oq = useObservations();
  const satelliteRows = (oq.data ?? []).filter((o) => o.indicator === "NDVI" && o.source.includes("Copernicus"));
  const { weather, weatherError, weatherLoading, farm } = useFarm();
  const effis = useEffis(farm?.id);
  const firms = useFirms(farm?.id);
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
    { name: "Weather — Open-Meteo", status: weatherSt, detail: weatherError ? "Weather could not be loaded" : weather ? `Last retrieved ${new Date(weather.retrievedAt).toLocaleString()}. Forecast + 7-day history.` : "Add a farm to fetch weather." },
    { name: "Satellite — Copernicus Data Space (Sentinel-2)", status: oq.error ? "error" : satelliteRows.length ? "connected" : "unavailable", detail: oq.error ? "Saved observations could not be loaded." : satelliteRows.length ? `${satelliteRows.length} saved real observations. This does not verify current service access; use Crop Health to request an update.` : "No saved satellite observations. Request images on Crop Health to check current service access." },
    { name: "Wildfire — EFFIS", status: effis.error || effis.data?.danger.state === "error" ? "error" : effis.data?.danger.state === "available" ? "connected" : "unavailable", detail: effis.isFetching ? "Checking official EFFIS service…" : !farm ? "Add a farm to check fire information." : effis.error ? "EFFIS could not be checked." : effis.data ? `${effis.data.serviceResponded ? "Official service reached and tested." : "Service unavailable."} ${effis.data.danger.message} Nearby-fire coverage remains unverified. Checked ${new Date(effis.data.checkedAt).toLocaleString()}.` : "Not tested yet." },
    { name: "Active fires — NASA FIRMS", status: firms.error || firms.data?.state === "error" ? "error" : !firms.data ? "configured" : firms.data.state === "not_configured" ? "not_configured" : firms.data.state === "partial" ? "unavailable" : "connected", detail: firms.isFetching ? "Checking NASA FIRMS…" : !farm ? "Add a farm to check detections." : firms.error ? "NASA FIRMS could not be checked." : firms.data ? `${firms.data.message} Checked ${new Date(firms.data.checkedAt).toLocaleString()}.` : "Not tested yet." },
    { name: "Soil moisture (optional)", status: "not_configured", detail: "Optional adapter for a verified soil-moisture dataset." },
    { name: "AI Farm Assistant", status: "connected", detail: "Answers from your saved records and live weather only." },
    { name: "Database & accounts", status: "connected", detail: "Your farms, parcels and tasks are private to your account." },
  ];

  return (
    <>
      <PageHeader title={inspector ? "Data Sources & Settings" : "Settings"} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title={inspector ? "API connection status" : "Available information"}>
          <ul className="divide-y">
            {sources.map((s) => (
              <li key={s.name} className="flex items-start justify-between gap-4 py-3">
                <div><p className="font-medium">{inspector ? s.name : s.name.split(" — ")[0]}</p><p className="text-sm text-muted-foreground">{s.detail}</p></div>
                <Badge2 className={ST_CLS[s.status]}>{s.status.replace("_", " ")}</Badge2>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Preferences">
          <div className="space-y-3">
            <ModeSwitch />
            <div><Label htmlFor="dn">Display name</Label><Input id="dn" value={name} onChange={(e) => setName(e.target.value)} /></div>
            {inspector && <div><Label htmlFor="th">Local heat-safety threshold (°C apparent)</Label><Input id="th" type="number" value={thr} onChange={(e) => setThr(e.target.value)} /></div>}
            <div className="flex items-center gap-2"><Switch id="ia" checked={inApp} onCheckedChange={setInApp} /><Label htmlFor="ia">In-app notifications</Label></div>
            <div className="flex items-center gap-2 opacity-60"><Switch id="em" disabled /><Label htmlFor="em">Email notifications (coming later)</Label></div>
            <Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>Save</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
