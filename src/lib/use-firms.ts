import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFarmFirms } from "./firms.functions";
export function useFirms(farmId: string | undefined, radiusKm = 25, days = 2) {
  const get = useServerFn(getFarmFirms);
  return useQuery({ queryKey: ["firms", farmId, radiusKm, days], queryFn: () => { if (!farmId) throw new Error("Select a farm first."); return get({ data: { farmId, radiusKm, days } }); }, enabled: Boolean(farmId), staleTime: 15 * 60 * 1000, refetchInterval: 15 * 60 * 1000, retry: false });
}
