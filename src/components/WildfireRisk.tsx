import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge2, ErrorState, LoadingBlock, Note } from "@/components/ui-kit";
import { useFarm } from "@/lib/farm-context";
import { useViewMode } from "@/lib/view-mode-context";
import { useEffis } from "@/lib/use-effis";
import { currentForecast, EFFIS_DOWNLOADS, EFFIS_VIEWER } from "@/lib/effis";
export function WildfireRisk() {
  const { farm } = useFarm();
  const { mode } = useViewMode();
  const query = useEffis(farm?.id);
  const data = query.error ? undefined : query.data;
  const danger = data?.danger;
  const fresh = data && Date.now() - Date.parse(data.checkedAt) < 30 * 60 * 1000;
  const current = fresh && currentForecast(danger?.date ?? null);
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Wildfire risk</h2><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{query.isFetching ? "Checking…" : "Refresh"}</Button></div>
    {query.isPending ? <LoadingBlock rows={2} /> : query.error ? <ErrorState message="Fire information could not be checked. Check official local warnings" /> : <>
      <div className="space-y-2">
        <Badge2 className="bg-warning/15 text-warning-foreground border-warning/40">{current && danger?.category ? danger.category : "Current risk unknown"}</Badge2>
        <p className="text-sm">{danger?.message}</p>
        {danger?.date && <p className="text-sm">Forecast date: {danger.date}{!current && " — not a verified current assessment"}</p>}
        {!fresh && <p role="alert" className="text-sm text-destructive">This check is out of date. Refresh before relying on it.</p>}
        <p className="text-sm font-medium">Follow local fire restrictions and emergency alerts before burning or using equipment that could spark.</p>
      </div>
      <div className="border-t pt-4"><h3 className="mb-2 font-sans text-sm font-semibold">Nearby fire detections</h3><p className="text-sm text-muted-foreground">{data?.fires.message}</p></div>
      {data && <p className="text-xs text-muted-foreground">Last service check: {new Date(data.checkedAt).toLocaleString()}. This is not the observation update time.</p>}
      {mode === "inspector" && data && <section className="space-y-3 border-t pt-4">
        <h3 className="font-sans text-sm font-semibold">Evidence and service details</h3>
        <p className="text-sm">Catalogue: {data.serviceResponded ? "responded successfully" : "unavailable"}. Fire-danger values: {data.danger.state}. Active-fire point query: {data.fires.queryResponded ? "responded; completeness unverified" : "not verified"}.</p>
        <p className="text-sm">FWI: {data.danger.fwi ?? "unavailable"}. No category is inferred from numeric codes or map colours.</p>
        <p className="text-sm">Forecast dates queried: {data.danger.queriedDates.join(", ") || "none (unsupported location or layer)"}. Hotspot query window: {data.fires.time ?? "unavailable"}.</p>
        <ul className="space-y-2 text-xs text-muted-foreground">{data.layers.map((l) => <li key={l.name} className="break-words">{l.name} · {l.queryable ? "queryable" : "image only"} · advertised default: {l.defaultTime ?? "none"} · advertised extent: {l.extent ?? "none"}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Advertised ranges ending in 2099 are not proof of available observations. Forecast queries sample a regional grid; no field-level precision is established. Hotspot GetFeatureInfo selects map pixels, not a complete radius search; distance and absence claims are withheld.</p>
      </section>}
    </>}
    <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href={`${EFFIS_VIEWER}?lat=${farm?.latitude}&lon=${farm?.longitude}&zoom=9`} target="_blank" rel="noreferrer">Official EFFIS viewer <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button asChild variant="ghost"><a href={EFFIS_DOWNLOADS} target="_blank" rel="noreferrer">Official data downloads <ExternalLink className="ml-2 h-4 w-4" /></a></Button></div>
    <Note tone="warning">EFFIS fire danger is regional, not a prediction for an individual field. Satellite hotspots are detections, not danger forecasts or proof a fire is still burning. Neither replaces official emergency alerts or measures soil moisture.</Note>
    <p className="text-xs text-muted-foreground">Source: European Commission / Copernicus Emergency Management Service — EFFIS. Hotspots originate from NASA FIRMS. <a className="underline" href="https://forest-fire.emergency.copernicus.eu/about-effis/data-license" target="_blank" rel="noreferrer">Data reuse and attribution terms</a>.</p>
  </div>;
}