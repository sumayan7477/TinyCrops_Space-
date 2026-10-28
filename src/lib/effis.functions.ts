import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const getFarmEffis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ farmId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: farm, error } = await context.supabase.from("farms").select("latitude,longitude").eq("id", data.farmId).eq("user_id", context.userId).maybeSingle();
    if (error || !farm) throw new Error("Farm is unavailable for this account.");
    const { fetchEffis } = await import("./effis.server");
    return fetchEffis(farm.latitude, farm.longitude);
  });