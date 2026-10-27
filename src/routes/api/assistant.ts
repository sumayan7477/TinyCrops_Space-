import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { fetchWeather } from "@/lib/weather";

const RUN_ID = "X-Lovable-AIG-Run-ID";

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: u, error: ue } = await sb.auth.getUser(token);
        if (ue || !u.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { messages: { role: "user" | "assistant"; content: string }[]; farmId?: string };
        const messages: ModelMessage[] = (body.messages ?? []).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) }));
        if (!messages.length) return new Response("No message", { status: 400 });

        const [farms, parcels, tasks, obs] = await Promise.all([
          sb.from("farms").select("id,name,latitude,longitude"),
          sb.from("parcels").select("id,farm_id,name,crop_type,growth_stage,irrigated,area_ha,status"),
          sb.from("tasks").select("title,status,priority,due_date,parcel_id,notes,assignee").limit(50),
          sb.from("observations").select("parcel_id,observed_at,source,indicator,mean_value,cloud_cover_pct").order("observed_at").limit(200),
        ]);
        const farm = farms.data?.find((f) => f.id === body.farmId) ?? farms.data?.[0];
        let weather: unknown = "Unavailable: no farm registered.";
        if (farm) {
          try {
            const w = await fetchWeather(farm.latitude, farm.longitude);
            weather = { source: w.source, retrievedAt: w.retrievedAt, timezone: w.timezone, current: w.current, daily: w.daily, past7RainMm: w.past7RainMm, next3RainMm: w.next3RainMm, hourlyNext24: { time: w.hourly.time.slice(0, 24), apparent: w.hourly.apparent.slice(0, 24) } };
          } catch (e) {
            weather = `Unavailable: ${(e as Error).message}`;
          }
        }
        const today = new Date().toISOString().slice(0, 10);
        const instructions = `You are the TinyCrops farm assistant. Today is ${today}. Answer in short, plain, farmer-friendly language.
RULES:
- Use ONLY the records below. Never invent measurements, observations, weather, wildfire info or completed actions.
- If something isn't in the records, say clearly it is unavailable (e.g. no satellite observations, wildfire data not connected, no soil moisture source).
- Cite the parcel, observation/forecast date and data source for every claim.
- Distinguish observed data, forecasts, derived indicators and possible explanations. Never diagnose disease/pests from data alone. Recommend physical inspection before irrigation or treatment.
- For heat, apparent temperature is NOT WBGT; say so when relevant and advise following local safety rules.
- Wildfire (EFFIS) data is NOT connected.
SELECTED FARM: ${JSON.stringify(farm ?? null)}
ALL FARMS: ${JSON.stringify(farms.data ?? [])}
PARCELS: ${JSON.stringify(parcels.data ?? [])}
TASKS: ${JSON.stringify(tasks.data ?? [])}
SATELLITE OBSERVATIONS: ${obs.data?.length ? JSON.stringify(obs.data) : "None recorded (satellite source not connected)."}
WEATHER (Open-Meteo forecast for farm coordinates): ${JSON.stringify(weather)}`;

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });
        let runId = request.headers.get(RUN_ID) ?? undefined;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const h = new Headers(init?.headers);
            if (runId) h.set(RUN_ID, runId);
            const res = await fetch(input, { ...init, headers: h });
            runId ??= res.headers.get(RUN_ID) ?? undefined;
            if (!res.ok) {
              const txt = await res.clone().text();
              console.error("AI gateway error", res.status, txt.slice(0, 300));
            }
            return res;
          },
        });
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions,
          messages,
          abortSignal: request.signal,
          providerOptions: {
            openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
          },
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
