import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import type { Farm, Parcel } from "@/lib/data";
import { STATUS_META } from "@/lib/data";

export interface FarmMapProps {
  farms: Farm[];
  parcels: Parcel[];
  center?: [number, number];
  basemap?: "street" | "satellite";
  selectedParcelId?: string | null;
  onParcelClick?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  draftPoints?: [number, number][];
  height?: number;
}

function cssVar(v: string) {
  const name = v.replace(/^var\((.*)\)$/, "$1");
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

/** Browser-only Leaflet map. Load via React.lazy behind ClientOnly. */
export default function FarmMap(props: FarmMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const Lref = useRef<typeof L | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Leaf = (mod as unknown as { default: typeof L }).default ?? mod;
      Lref.current = Leaf;
      const c = props.center ?? (props.farms[0] ? [props.farms[0].latitude, props.farms[0].longitude] : [20, 0]);
      map.current = Leaf.map(el.current).setView(c as [number, number], props.farms.length ? 14 : 2);
      layers.current = Leaf.layerGroup().addTo(map.current);
      map.current.on("click", (e: L.LeafletMouseEvent) => propsRef.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Leaf = Lref.current;
    const m = map.current;
    if (!Leaf || !m || !layers.current) return;
    const p = propsRef.current;
    base.current?.remove();
    base.current =
      p.basemap === "satellite"
        ? Leaf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
            maxZoom: 19,
          })
        : Leaf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 });
    base.current.addTo(m);
    base.current.bringToBack();
    layers.current.clearLayers();
    p.farms.forEach((f) => {
      Leaf.circleMarker([f.latitude, f.longitude], { radius: 7, color: cssVar("var(--primary)"), fillOpacity: 0.9 })
        .bindTooltip(f.name)
        .addTo(layers.current!);
    });
    p.parcels.forEach((pc) => {
      const coords = (pc.boundary as { coordinates?: [number, number][] } | null)?.coordinates;
      if (!coords?.length) return;
      const col = cssVar(STATUS_META[pc.status].color);
      Leaf.polygon(coords, {
        color: col,
        weight: pc.id === p.selectedParcelId ? 4 : 2,
        fillOpacity: pc.status === "insufficient_data" ? 0.15 : 0.35,
        dashArray: pc.status === "insufficient_data" ? "6 4" : undefined,
      })
        .bindTooltip(`${pc.name} — ${STATUS_META[pc.status].label}`)
        .on("click", (e) => {
          Leaf.DomEvent.stopPropagation(e);
          propsRef.current.onParcelClick?.(pc.id);
        })
        .addTo(layers.current!);
    });
    if (p.draftPoints?.length) {
      Leaf.polyline(p.draftPoints, { color: cssVar("var(--warning)"), dashArray: "4 4" }).addTo(layers.current);
      p.draftPoints.forEach((pt) => Leaf.circleMarker(pt, { radius: 4, color: cssVar("var(--warning)") }).addTo(layers.current!));
    }
  }

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    if (props.center && map.current) map.current.setView(props.center, 14);
  }, [props.center?.[0], props.center?.[1]]);

  return <div ref={el} style={{ height: props.height ?? 480 }} className="w-full overflow-hidden rounded-lg border" />;
}
