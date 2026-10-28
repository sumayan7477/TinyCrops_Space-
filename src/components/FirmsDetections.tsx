import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingBlock } from "@/components/ui-kit";
import { useFirms } from "@/lib/use-firms";
import { confidenceLabel, FIRMS_MAP, isStale, PIXEL_M } from "@/lib/firms";

export function FirmsDetections({ farmId, inspector, effisNote }: { farmId?: string; inspector: boolean; effisNote?: string }) {
  const [radius, setRadius] = useState(25);
  const [days, setDays] = useState(2);
  const q = useFirms(farmId, radius, days);
  const d = q.error ? undefined : q.data;
  return <div className="space-y-3 border-t pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-sans text-sm font-semibold">Nearby fire detections (satellite)</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label>Radius <select aria-label="Search radius" className="rounded border bg-background px-1 py-0.5" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{[10, 25, 50, 100].map((r) => <option key={r} value={r}>{r} km</option>)}</select></label>
        <label>Period <select aria-label="Days" className="rounded border bg-background px-1 py-0.5" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>)}</select></label>
        <Button variant="ghost" size="sm" disabled={q.isFetching || !farmId} onClick={() => q.refetch()}><RefreshCw className="mr-1 h-4 w-4" />{q.isFetching ? "Checking…" : "Check"}</Button>
      </div>
    </div>
    {q.isPending ? <LoadingBlock rows={1} /> : q.error ? <ErrorState message="Satellite fire detections could not be checked. Nearby fires are unknown." /> : d && <>
      <p className="text-sm">{d.message}</p>
      {isStale(d.checkedAt) && <p role="alert" className="text-sm text-destructive">This check is out of date. Refresh before relying on it.</p>}
      {d.detections.length > 0 && <ul className="space-y-1 text-sm">{d.detections.slice(0, inspector ? 50 : 5).map((x, i) => <li key={i} className="flex flex-wrap gap-x-3 border-b py-1 last:border-0">
        <span className="font-medium">{x.distanceKm} km away</span>
        <span>{new Date(x.detectedAt).toLocaleString()} (satellite pass)</span>
        <span className="text-muted-foreground">{x.source.replace("_NRT", "").replace("_", " ")}</span>
        {inspector && <span className="text-muted-foreground">{x.latitude.toFixed(4)}, {x.longitude.toFixed(4)} · confidence {confidenceLabel(x.confidence)} · FRP {x.frp ?? "n/a"} MW · {x.daynight === "N" ? "night" : x.daynight === "D" ? "day" : "unknown"} · ±{PIXEL_M[x.source]} m pixel</span>}
      </li>)}</ul>}
      <p className="text-xs text-muted-foreground">Heat detections can be false alarms (hot surfaces, industry, burning stubble) and satellites can miss fires under cloud or smoke, between passes, or when small. Distance is to the centre of a {"375 m–1 km"} pixel. Detections usually appear about 3 hours after the satellite pass. This is not a fire-danger forecast. Last check: {new Date(d.checkedAt).toLocaleString()}.</p>
      {inspector && <p className="text-xs text-muted-foreground">Sources: {d.sources.map((s) => `${s.source} ${s.ok ? "ok" : "failed"}`).join(", ") || "none queried"}. Rows skipped for invalid coordinates/time: {d.invalidRows}. {effisNote}</p>}
    </>}
    <p className="text-xs text-muted-foreground">Source: NASA FIRMS (VIIRS 375 m, MODIS 1 km near real-time). <a className="underline" href={FIRMS_MAP} target="_blank" rel="noreferrer">NASA FIRMS map</a>.</p>
  </div>;
}
