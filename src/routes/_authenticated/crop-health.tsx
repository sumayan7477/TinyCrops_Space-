import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, Note, Badge2 } from "@/components/ui-kit";
import { SatellitePending } from "@/components/SatellitePending";
import { NdviTrend } from "@/components/NdviTrend";
import { useFarm } from "@/lib/farm-context";
import { useParcels, useObservations, STATUS_META } from "@/lib/data";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SentinelResult = { source: string; results: { parcelId: string; name: string; area: string; points: { date: string; mean: number; cloudCoverPct: number | null; validPixels: number }[] }[] };

function SentinelFetch({ farmId }: { farmId: string }) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [state, setState] = useState<{ s: "idle" | "loading" | "done" | "error"; msg?: string; data?: SentinelResult }>({ s: "idle" });
  const qc = useQueryClient();
  const go = async () => {
    setState({ s: "loading" });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/sentinel", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${sess.session?.access_token ?? ""}` }, body: JSON.stringify({ farmId, from, to }) });
      const j = await r.json();
      if (!r.ok) {
        const label = j.kind === "auth" || j.kind === "config" ? "Authentication problem" : j.kind === "validation" ? "Check your input" : "Satellite service error";
        setState({ s: "error", msg: `${label}: ${j.error}` });
        return;
      }
      setState({ s: "done", data: j });
      qc.invalidateQueries({ queryKey: ["observations"] });
    } catch {
      setState({ s: "error", msg: "Satellite service error: could not reach the server." });
    }
  };
  return (
    <Panel title="Fetch Sentinel-2 NDVI">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label htmlFor="sf">From</Label><Input id="sf" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="st">To</Label><Input id="st" type="date" value={to} max={iso(new Date())} onChange={(e) => setTo(e.target.value)} /></div>
        <Button onClick={go} disabled={state.s === "loading"}>{state.s === "loading" ? "Requesting satellite data…" : "Get satellite NDVI"}</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Up to 120 days. Uses each parcel's boundary if saved, otherwise a ~500 m square around the farm location. Cloud, shadow and snow pixels are removed.</p>
      {state.s === "error" && <div className="mt-3"><Note tone="warning">{state.msg}</Note></div>}
      {state.s === "done" && state.data && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">Source: {state.data.source}</p>
          {state.data.results.map((r) => (
            <div key={r.parcelId}>
              <span className="font-medium">{r.name}</span> <span className="text-xs text-muted-foreground">({r.area})</span>:{" "}
              {r.points.length === 0 ? <span className="text-muted-foreground">No clear satellite observation in this period.</span> : (
                <span>{r.points.length} observations · latest {r.points[r.points.length - 1]!.date}: NDVI {r.points[r.points.length - 1]!.mean.toFixed(2)}, scene cloud {r.points[r.points.length - 1]!.cloudCoverPct?.toFixed(0) ?? "unknown"}%</span>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">NDVI reflects green vegetation cover. It does not diagnose disease or pests and does not measure soil moisture — inspect the field before acting.</p>
    </Panel>
  );
}

export const Route = createFileRoute("/_authenticated/crop-health")({
  head: () => ({ meta: [{ title: "Crop Health Monitoring — TinyCrops" }, { name: "description", content: "Vegetation condition across your parcels." }] }),
  component: Page,
});

function Page() {
  const { farm } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  return (
    <NeedsFarm>
      <PageHeader title="Crop Health Monitoring" description="Parcel-level vegetation summaries with data-quality and cloud-cover indicators." />
      <div className="space-y-6">
        {farm && <SentinelFetch farmId={farm.id} />}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Parcel</th><th className="p-3">Crop / stage</th><th className="p-3">Latest NDVI</th><th className="p-3">Observations</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {fp.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No parcels on this farm.</td></tr>}
              {fp.map((p) => {
                const po = obs.filter((o) => o.parcel_id === p.id);
                const last = po[po.length - 1];
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.crop_type ?? "Unknown"}{p.growth_stage ? ` · ${p.growth_stage}` : ""}</td>
                    <td className="p-3">{last?.mean_value != null ? `${Number(last.mean_value).toFixed(2)} (${last.observed_at}, cloud ${last.cloud_cover_pct ?? "?"}%)` : "—"}</td>
                    <td className="p-3">{po.length}</td>
                    <td className="p-3"><Badge2 className={STATUS_META[p.status].cls}>{STATUS_META[p.status].label}</Badge2></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fp.map((p) => (
          <NdviTrend key={p.id} name={p.name} crop={p.crop_type} obs={obs.filter((o) => o.parcel_id === p.id && o.indicator === "NDVI")} />
        ))}
        {obs.length === 0 && <SatellitePending what="Crop health monitoring" />}
        <Panel title="How to read vegetation indices">
          <p className="text-sm text-foreground/80">NDVI depends on crop type, growth stage, season and region — there is no single “healthy” threshold. TinyCrops compares each parcel with its own history and with other zones in the same field. Where crop type or growth stage is unknown, comparisons are less reliable.</p>
        </Panel>
        <Note>Downloadable reports will be available once observations exist.</Note>
      </div>
    </NeedsFarm>
  );
}
