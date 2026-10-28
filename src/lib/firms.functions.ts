import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const getFarmFirms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ farmId: z.string().uuid(), radiusKm: z.number().min(1).max(100), days: z.number().int().min(1).max(5) }))
  .handler(async ({ data, context }) => {
    const { data: farm, error } = await context.supabase.from("farms").select("latitude,longitude").eq("id", data.farmId).eq("user_id", context.userId).maybeSingle();
    if (error || !farm) throw new Error("Farm is unavailable for this account.");
    const { fetchFirms } = await import("./firms.server");
    return fetchFirms(farm.latitude, farm.longitude, data.radiusKm, data.days, process.env["FIRMS_MAP_KEY"]);
  });
