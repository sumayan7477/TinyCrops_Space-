import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, Freshness, Note } from "@/components/ui-kit";
import { useViewMode } from "@/lib/view-mode-context";
import { useFarm } from "@/lib/farm-context";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({ meta: [{ title: "Weather & Heat — TinyCrops" }, { name: "description", content: "Farm-location weather forecast and recent rainfall." }] }),
  component: Page,
});

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function Page() {
  const { mode } = useViewMode();
  const inspector = mode === "inspector";
  const { weather: w, weatherLoading, weatherError, farm } = useFarm();
  return (
    <NeedsFarm>
      <PageHeader title={inspector ? "Weather & Heat Monitoring" : "Upcoming weather"} description={`Forecast for ${farm?.name}${inspector ? ` (${farm?.latitude.toFixed(3)}, ${farm?.longitude.toFixed(3)})` : ""}.`} />
      {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : w && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Temperature", `${w.current.temp.toFixed(1)} °C`],
              [inspector ? "Apparent temp." : "Feels like", `${w.current.apparent.toFixed(1)} °C`],
              ["Humidity", `${w.current.humidity} %`],
              ["Wind", `${w.current.wind.toFixed(0)} km/h ${DIRS[Math.round(w.current.windDir / 45) % 8]}`],
              ["Rain, past 7 days", `${w.past7RainMm.toFixed(1)} mm`],
            ].map(([k, v]) => (
              <Panel key={k}><p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p><p className="mt-1 text-2xl font-semibold">{v}</p></Panel>
            ))}
          </div>
          {!inspector && <section><h2 className="mb-3 text-xl font-semibold">Next few days</h2><div className="grid gap-3 sm:grid-cols-3">{w.daily.time.slice(0, 3).map((date, i) => <Panel key={date}><p className="font-medium">{new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric" })}</p><p className="mt-2 text-sm">{w.daily.tMin[i].toFixed(0)}–{w.daily.tMax[i].toFixed(0)}°C · rain chance {w.daily.precipProb[i] == null ? "unknown" : `${w.daily.precipProb[i]}%`}</p><p className="text-sm">Forecast rain: {w.daily.rain[i].toFixed(1)} mm</p></Panel>)}</div><div className="mt-3"><Freshness source={w.source} at={w.retrievedAt} /></div></section>}
          {inspector && <><Panel title="7-day forecast" right={<Freshness source={w.source} at={w.retrievedAt} />}>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={w.daily.time.map((t, i) => ({ day: t.slice(5), max: w.daily.tMax[i], min: w.daily.tMin[i], rain: w.daily.rain[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis yAxisId="t" unit="°" fontSize={12} />
                  <YAxis yAxisId="r" orientation="right" unit="mm" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="r" dataKey="rain" name="Rain (mm)" fill="var(--info)" opacity={0.6} />
                  <Line yAxisId="t" dataKey="max" name="Max °C" stroke="var(--destructive)" strokeWidth={2} />
                  <Line yAxisId="t" dataKey="min" name="Min °C" stroke="var(--primary)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Next 72 hours">
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={w.hourly.time.map((t, i) => ({ t: t.slice(5, 13).replace("T", " "), temp: w.hourly.temp[i], app: w.hourly.apparent[i], pp: w.hourly.precipProb[i] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" fontSize={10} interval={11} />
                  <YAxis yAxisId="t" unit="°" fontSize={12} />
                  <YAxis yAxisId="p" orientation="right" unit="%" fontSize={12} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="p" dataKey="pp" name="Rain chance %" fill="var(--info)" opacity={0.35} />
                  <Line yAxisId="t" dataKey="temp" name="Temp °C" stroke="var(--primary)" dot={false} />
                  <Line yAxisId="t" dataKey="app" name="Apparent °C" stroke="var(--warning)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          </>}
          <Note>{inspector ? "This is a regional model forecast for the farm's coordinates (timezone {w.timezone}), not a measurement inside your field. Forecast horizon: 7 days; history: 7 days. Weather data by Open-Meteo.com (CC BY 4.0)." : "This is a forecast for the area around your farm, not a reading from inside the field. Rain and wind may differ locally; check conditions before starting work."}</Note>
        </div>
      )}
    </NeedsFarm>
  );
}
