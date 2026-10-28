import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, NeedsFarm, Badge2, Note } from "@/components/ui-kit";
import { LazyMap } from "@/components/LazyMap";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useParcels, useObservations, STATUS_META } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Farm Map — TinyCrops" }, { name: "description", content: "Interactive map of farms and parcel conditions." }, { property: "og:title", content: "Farm Map — TinyCrops" }, { property: "og:description", content: "Interactive map of farms and parcel conditions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: MapPage,
});

function MapPage() {
  const { farms, farm, weather, date } = useFarm();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  const [sat, setSat] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const p = parcels.find((x) => x.id === sel);
  const pObs = obs.filter((o) => o.parcel_id === sel && o.observed_at <= date);

  return (
    <NeedsFarm>
      <PageHeader title="Farm Map" description={`Parcel conditions as of ${date}. Click a parcel for details.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2"><Switch id="sat" checked={sat} onCheckedChange={setSat} /><Label htmlFor="sat">Satellite basemap</Label></div>
            <span className="text-muted-foreground">Crop-health, water-stress and wildfire overlays appear once those data sources are connected.</span>
          </div>
          <LazyMap farms={farms} parcels={parcels} basemap={sat ? "satellite" : "street"} selectedParcelId={sel} onParcelClick={setSel}
            center={farm ? [farm.latitude, farm.longitude] : undefined} height={560} />
        </div>
        <div className="space-y-4">
          <Panel title="Legend">
            <ul className="space-y-2 text-sm">
              {Object.entries(STATUS_META).map(([k, m]) => (
                <li key={k} className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm" style={{ background: m.color }} />{m.label}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Dashed outline = no usable observations. Parcels are never shown as Normal without data.</p>
          </Panel>
          <Panel title="Selected parcel">
            {!p ? <p className="text-sm text-muted-foreground">Click a parcel on the map.</p> : (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{p.name}</p>
                <Badge2 className={STATUS_META[p.status].cls}>{STATUS_META[p.status].label}</Badge2>
                <p className="text-muted-foreground">{p.crop_type ?? "Crop unknown"} · {p.area_ha ?? "?"} ha</p>
                <p>{pObs.length ? `${pObs.length} observation(s) up to ${date}` : "No satellite observations recorded for this parcel."}</p>
                <Link to="/timeline" className="text-primary underline-offset-4 hover:underline">Open timeline →</Link>
              </div>
            )}
          </Panel>
          {weather && (
            <Panel title="Weather now">
              <p className="text-2xl font-semibold">{weather.current.temp.toFixed(0)}°C</p>
              <p className="text-sm text-muted-foreground">Feels like {weather.current.apparent.toFixed(0)}°C · {weather.current.humidity}% RH · wind {weather.current.wind.toFixed(0)} km/h</p>
            </Panel>
          )}
          <Note>Satellite imagery © Esri. Street map © OpenStreetMap contributors.</Note>
        </div>
      </div>
    </NeedsFarm>
  );
}
