import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { farmsQuery, type Farm } from "./data";
import { weatherQuery, type WeatherData } from "./weather";
import { usableWeather } from "./insights";

interface Ctx {
  farms: Farm[];
  farm: Farm | null;
  setFarmId: (id: string) => void;
  date: string;
  setDate: (d: string) => void;
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: Error | null;
  loading: boolean;
}
const FarmCtx = createContext<Ctx | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { data: farms = [], isLoading } = useQuery(farmsQuery);
  const [farmId, setFarmIdState] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    setFarmIdState(localStorage.getItem("tc_farm"));
  }, []);
  const farm = farms.find((f) => f.id === farmId) ?? farms[0] ?? null;
  const w = useQuery(weatherQuery(farm?.latitude, farm?.longitude));
  const setFarmId = (id: string) => {
    localStorage.setItem("tc_farm", id);
    setFarmIdState(id);
  };
  return (
    <FarmCtx.Provider
      value={{
        farms,
        farm,
        setFarmId,
        date,
        setDate,
        weather: !w.error && usableWeather(w.data ?? null) ? w.data ?? null : null,
        weatherLoading: w.isLoading && !!farm,
        weatherError: (w.error as Error) ?? (w.data && !usableWeather(w.data) ? new Error("Weather is out of date. Refresh before planning fieldwork") : null),
        loading: isLoading,
      }}
    >
      {children}
    </FarmCtx.Provider>
  );
}

export function useFarm() {
  const c = useContext(FarmCtx);
  if (!c) throw new Error("useFarm outside FarmProvider");
  return c;
}
