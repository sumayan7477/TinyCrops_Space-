import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, Panel, NeedsFarm, LoadingBlock, ErrorState, EmptyState, Freshness, Badge2 } from "@/components/ui-kit";
import { ActionCard } from "@/components/ActionCard";
import { useFarm } from "@/lib/farm-context";
import { useDailyActions } from "@/lib/use-actions";
import { useParcels, STATUS_META } from "@/lib/data";
import { heatRisk, HEAT_LABEL } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Daily Dashboard — TinyCrops" }, { name: "description", content: "Today's prioritized field actions." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { farm, weather, weatherLoading, weatherError } = useFarm();
  const actions = useDailyActions();
  const { data: parcels = [] } = useParcels();
  const fp = parcels.filter((p) => p.farm_id === farm?.id);
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <NeedsFarm>
      <PageHeader title={`Today on ${farm?.name}`} description={today} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="actions">
          <h2 id="actions" className="mb-3 text-xl font-semibold">Daily actions</h2>
          {weatherLoading ? <LoadingBlock /> : weatherError ? <ErrorState message={weatherError.message} /> : actions.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success" />} title="Nothing urgent from the data we have"
              body="No heat, dryness, wind or overdue-task signals right now. Crop-health checks need satellite data, which isn't connected yet." />
          ) : (
            <div className="space-y-4">{actions.map((a) => <ActionCard key={a.id} item={a} />)}</div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Ranked by severity × evidence confidence, plus a boost for time-sensitive items. <Link to="/recommendations" className="underline">See details</Link></p>
        </section>
        <div className="space-y-4">
          {weather && (
            <Panel title="Conditions">
              <p className="text-3xl font-semibold">{weather.current.temp.toFixed(0)}°C</p>
              <p className="text-sm text-muted-foreground">Feels like {weather.current.apparent.toFixed(0)}°C · {weather.current.humidity}% humidity</p>
              <p className="mt-2 text-sm">Heat (moderate work): <strong>{HEAT_LABEL[heatRisk(weather.daily.apparentMax[0], "moderate")]}</strong></p>
              <p className="text-sm">Rain last 7 days: {weather.past7RainMm.toFixed(1)} mm</p>
              <div className="mt-3"><Freshness source={weather.source} at={weather.retrievedAt} /></div>
            </Panel>
          )}
          <Panel title="Parcels">
            {fp.length === 0 ? <p className="text-sm text-muted-foreground">No parcels drawn. <Link to="/farms" className="underline">Add one</Link>.</p> : (
              <ul className="space-y-2">{fp.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm"><span>{p.name}</span><Badge2 className={STATUS_META[p.status].cls}>{STATUS_META[p.status].label}</Badge2></li>
              ))}</ul>
            )}
          </Panel>
        </div>
      </div>
    </NeedsFarm>
  );
}
