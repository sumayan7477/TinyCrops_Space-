import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFarmEffis } from "./effis.functions";
export function useEffis(farmId: string | undefined) {
  const get = useServerFn(getFarmEffis);
  return useQuery({ queryKey: ["effis", farmId], queryFn: () => { if (!farmId) throw new Error("Select a farm first."); return get({ data: { farmId } }); }, enabled: Boolean(farmId), staleTime: 15 * 60 * 1000, refetchInterval: 15 * 60 * 1000, retry: false });
}