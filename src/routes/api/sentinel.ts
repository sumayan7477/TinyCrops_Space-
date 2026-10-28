import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { validateCoords, validateRange, farmBbox, usableBoundary } from "@/lib/sentinel-validate";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/sentinel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        if (!token) return json({ kind: "auth", error: "Please sign in again." }, 401);
        const url = process.env["SUPABASE_URL"]!, key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { fetch: (i, init) => { const h = new Headers(init?.headers); h.set("apikey", key); h.set("Authorization", `Bearer ${token}`); return fetch(i, { ...init, headers: h }); } },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return json({ kind: "auth", error: "Please sign in again." }, 401);

        const body = (await request.json().catch(() => ({}))) as { farmId?: string; from?: string; to?: string };
        const rangeErr = validateRange(body.from, body.to);
        if (rangeErr) return json({ kind: "validation", error: rangeErr }, 400);
        const { data: farm } = await sb.from("farms").select("id,latitude,longitude").eq("id", String(body.farmId)).maybeSingle();
        if (!farm) return json({ kind: "validation", error: "Farm not found." }, 404);
        const coordErr = validateCoords(farm.latitude, farm.longitude);
        if (coordErr) return json({ kind: "validation", error: coordErr }, 400);
        const { data: parcels } = await sb.from("parcels").select("id,name,boundary").eq("farm_id", farm.id);
        if (!parcels?.length) return json({ kind: "validation", error: "Add a parcel to this farm first." }, 400);

        const { fetchNdvi, SentinelError } = await import("@/lib/sentinel.server");
        const results = [];
        try {
          for (const p of parcels) {
            const g = usableBoundary(p.boundary);
            const area = g ? "parcel boundary" : "farm-point area (~500 m square)";
            const pts = await fetchNdvi(g ? { geometry: g } : { bbox: farmBbox(farm.latitude, farm.longitude) }, body.from!, body.to!);
            if (pts.length) {
              await sb.from("observations").delete().eq("parcel_id", p.id).eq("indicator", "NDVI").eq("source", "Sentinel-2 L2A (Copernicus Data Space)").gte("observed_at", body.from!).lte("observed_at", body.to!);
              const ins = await sb.from("observations").insert(pts.map((x) => ({
                parcel_id: p.id, user_id: u.user!.id, observed_at: x.date, indicator: "NDVI", mean_value: Number(x.mean.toFixed(4)),
                cloud_cover_pct: x.cloudCoverPct, resolution_m: 10, source: "Sentinel-2 L2A (Copernicus Data Space)",
                quality: `${area}; ${x.validPixels} clear px, ${x.maskedPixels} masked`,
              })));
              if (ins.error) console.error("observation insert", ins.error.message);
            }
            results.push({ parcelId: p.id, name: p.name, area, points: pts });
          }
        } catch (e) {
          if (e instanceof SentinelError) return json({ kind: e.kind, error: e.message }, e.kind === "auth" ? 502 : 503);
          console.error(e);
          return json({ kind: "api", error: "Could not reach Sentinel Hub." }, 503);
        }
        return json({ source: "Sentinel-2 L2A via Copernicus Data Space Sentinel Hub", from: body.from, to: body.to, results });
      },
    },
  },
});
