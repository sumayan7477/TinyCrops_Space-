import { useMemo } from "react";
import { useFarm } from "./farm-context";
import { useObservations, useParcels, useTasks } from "./data";
import { buildDailyActions } from "./insights";

export function useDailyActions() {
  const { farm, weather, weatherError } = useFarm();
  const { data: tasks = [] } = useTasks();
  const { data: parcels = [] } = useParcels();
  const { data: obs = [] } = useObservations();
  return useMemo(() => {
    if (!farm) return [];
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks
      .filter((t) => (t.farm_id === farm.id || !t.farm_id) && ["pending", "in_progress"].includes(t.status) && t.due_date && t.due_date < today)
      .map((t) => ({ ...t, parcel: parcels.find((p) => p.id === t.parcel_id)?.name }));
    const farmParcelIds = new Set(parcels.filter((p) => p.farm_id === farm.id).map((p) => p.id));
    return buildDailyActions({ farmName: farm.name, weather: weatherError ? null : weather, overdueTasks: overdue, hasVegetationData: obs.some((o) => farmParcelIds.has(o.parcel_id) && o.indicator === "NDVI") });
  }, [farm, weather, weatherError, tasks, parcels, obs]);
}
