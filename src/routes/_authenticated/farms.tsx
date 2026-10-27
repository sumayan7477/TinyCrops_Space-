import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, MapPin, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, EmptyState, Badge2, Note } from "@/components/ui-kit";
import { LazyMap } from "@/components/LazyMap";
import { supabase } from "@/integrations/supabase/client";
import { useMut, useParcels, run, STATUS_META } from "@/lib/data";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/farms")({
  head: () => ({ meta: [{ title: "My Farms & Parcels — TinyCrops" }, { name: "description", content: "Register farms and draw field parcel boundaries." }] }),
  component: FarmsPage,
});

/** Approximate polygon area in hectares (equirectangular projection; adequate for field-sized shapes). */
function areaHa(pts: [number, number][]) {
  if (pts.length < 3) return null;
  const lat0 = (pts.reduce((a, p) => a + p[0], 0) / pts.length) * (Math.PI / 180);
  const R = 6371000;
  const xy = pts.map(([la, lo]) => [lo * (Math.PI / 180) * R * Math.cos(lat0), la * (Math.PI / 180) * R]);
  let s = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2) / 10000;
}

function FarmsPage() {
  const { farms, farm, setFarmId } = useFarm();
  const { data: parcels = [] } = useParcels();
  const [fName, setFName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [mode, setMode] = useState<"farm" | "parcel">(farms.length ? "parcel" : "farm");
  const [pts, setPts] = useState<[number, number][]>([]);
  const [pName, setPName] = useState("");
  const [crop, setCrop] = useState("");
  const [irrigated, setIrrigated] = useState("unknown");

  const addFarm = useMut(
    async () => {
      const la = Number(lat), lo = Number(lng);
      if (!fName.trim() || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) throw new Error("Enter a name and a valid location");
      const f = await run(supabase.from("farms").insert({ name: fName.trim(), latitude: la, longitude: lo }).select().single());
      setFarmId((f as unknown as { id: string }).id);
      setFName(""); setLat(""); setLng(""); setMode("parcel");
    },
    ["farms"], "Farm added",
  );
  const addParcel = useMut(
    async () => {
      if (!farm) throw new Error("Add a farm first");
      if (!pName.trim()) throw new Error("Give the parcel a name");
      if (pts.length < 3) throw new Error("Click at least 3 points on the map to outline the parcel");
      await run(supabase.from("parcels").insert({
        farm_id: farm.id, name: pName.trim(), crop_type: crop.trim() || null,
        irrigated: irrigated === "unknown" ? null : irrigated === "yes",
        boundary: { type: "LatLngRing", coordinates: pts }, area_ha: Number(areaHa(pts)?.toFixed(2)),
      }));
      setPts([]); setPName(""); setCrop("");
    },
    ["parcels"], "Parcel saved",
  );
  const delFarm = useMut(async (id: string) => run(supabase.from("farms").delete().eq("id", id)), ["farms", "parcels"], "Farm removed");
  const delParcel = useMut(async (id: string) => run(supabase.from("parcels").delete().eq("id", id)), ["parcels"], "Parcel removed");

  const onMapClick = (la: number, lo: number) => {
    if (mode === "farm") { setLat(la.toFixed(5)); setLng(lo.toFixed(5)); }
    else setPts((p) => [...p, [la, lo]]);
  };
  const farmParcels = parcels.filter((p) => p.farm_id === farm?.id);

  return (
    <>
      <PageHeader title="My Farms & Parcels" description="Click the map to set a farm location, or switch to parcel mode and click points to outline a field." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "farm" ? "default" : "outline"} onClick={() => setMode("farm")}><MapPin className="mr-1 h-4 w-4" />Place farm</Button>
            <Button size="sm" variant={mode === "parcel" ? "default" : "outline"} onClick={() => setMode("parcel")} disabled={!farm}>Draw parcel</Button>
            {pts.length > 0 && <Button size="sm" variant="ghost" onClick={() => setPts((p) => p.slice(0, -1))}><Undo2 className="mr-1 h-4 w-4" />Undo point</Button>}
          </div>
          <LazyMap farms={farms} parcels={parcels} basemap="satellite" draftPoints={pts} onMapClick={onMapClick}
            center={lat && lng ? [Number(lat), Number(lng)] : farm ? [farm.latitude, farm.longitude] : undefined} height={520} />
          <Note>Boundary file import (GeoJSON/KML) is not available yet. Area is estimated from the points you draw.</Note>
        </div>
        <div className="space-y-6">
          {mode === "farm" ? (
            <Panel title="New farm">
              <div className="space-y-3">
                <div><Label htmlFor="fn">Farm name</Label><Input id="fn" value={fName} onChange={(e) => setFName(e.target.value)} maxLength={120} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label htmlFor="la">Latitude</Label><Input id="la" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
                  <div><Label htmlFor="lo">Longitude</Label><Input id="lo" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
                </div>
                <Button className="w-full" onClick={() => addFarm.mutate(undefined)} disabled={addFarm.isPending}><Plus className="mr-1 h-4 w-4" />Save farm</Button>
              </div>
            </Panel>
          ) : (
            <Panel title={`New parcel on ${farm?.name ?? "—"}`}>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{pts.length} point(s){pts.length >= 3 && ` · ≈ ${areaHa(pts)?.toFixed(2)} ha`}</p>
                <div><Label htmlFor="pn">Parcel name</Label><Input id="pn" value={pName} onChange={(e) => setPName(e.target.value)} maxLength={120} /></div>
                <div><Label htmlFor="cr">Crop (optional)</Label><Input id="cr" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="e.g. Maize" /></div>
                <div>
                  <Label>Irrigated?</Label>
                  <Select value={irrigated} onValueChange={setIrrigated}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[600]"><SelectItem value="unknown">Unknown</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => addParcel.mutate(undefined)} disabled={addParcel.isPending}>Save parcel</Button>
              </div>
            </Panel>
          )}
          <Panel title="Your farms">
            {farms.length === 0 ? <p className="text-sm text-muted-foreground">No farms yet.</p> : (
              <ul className="space-y-3">
                {farms.map((f) => (
                  <li key={f.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button className="text-left font-medium hover:underline" onClick={() => setFarmId(f.id)}>{f.name}</button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${f.name}`} onClick={() => confirm(`Delete ${f.name} and its parcels?`) && delFarm.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Parcels on {farm?.name ?? "—"}</h2>
        {farmParcels.length === 0 ? (
          <EmptyState title="No parcels yet" body="Switch to “Draw parcel” and click around a field on the map to outline it." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {farmParcels.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.crop_type ?? "Crop unknown"} · {p.area_ha ? `${p.area_ha} ha` : "area unknown"} · irrigation {p.irrigated == null ? "unknown" : p.irrigated ? "yes" : "no"}</p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => delParcel.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Badge2 className={`mt-3 ${STATUS_META[p.status].cls}`}>{STATUS_META[p.status].label}</Badge2>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
