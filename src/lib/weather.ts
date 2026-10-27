// Weather data-service layer. Provider: Open-Meteo (free, no key, CC BY 4.0). Replaceable.
export interface WeatherData {
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  timezone: string;
  current: { time: string; temp: number; apparent: number; humidity: number; wind: number; windDir: number; precip: number };
  hourly: { time: string[]; temp: number[]; apparent: number[]; humidity: number[]; precipProb: (number | null)[]; wind: number[] };
  daily: { time: string[]; tMax: number[]; tMin: number[]; apparentMax: number[]; rain: number[]; precipProb: (number | null)[]; windMax: number[] };
  past7RainMm: number;
  next3RainMm: number;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&past_days=7&forecast_days=7&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const j = await res.json();
  const todayIdx = 7;
  const rain: number[] = j.daily.precipitation_sum.map((v: number | null) => v ?? 0);
  // hourly: keep from now onwards (next 72h)
  const nowIso: string = j.current.time;
  const start = Math.max(0, j.hourly.time.findIndex((t: string) => t >= nowIso.slice(0, 13)));
  const sl = <T,>(a: T[]) => a.slice(start, start + 72);
  return {
    source: "Open-Meteo forecast",
    sourceUrl: "https://open-meteo.com/",
    retrievedAt: new Date().toISOString(),
    timezone: j.timezone,
    current: {
      time: j.current.time,
      temp: j.current.temperature_2m,
      apparent: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m,
      windDir: j.current.wind_direction_10m,
      precip: j.current.precipitation,
    },
    hourly: {
      time: sl(j.hourly.time),
      temp: sl(j.hourly.temperature_2m),
      apparent: sl(j.hourly.apparent_temperature),
      humidity: sl(j.hourly.relative_humidity_2m),
      precipProb: sl(j.hourly.precipitation_probability),
      wind: sl(j.hourly.wind_speed_10m),
    },
    daily: {
      time: j.daily.time.slice(todayIdx),
      tMax: j.daily.temperature_2m_max.slice(todayIdx),
      tMin: j.daily.temperature_2m_min.slice(todayIdx),
      apparentMax: j.daily.apparent_temperature_max.slice(todayIdx),
      rain: rain.slice(todayIdx),
      precipProb: j.daily.precipitation_probability_max.slice(todayIdx),
      windMax: j.daily.wind_speed_10m_max.slice(todayIdx),
    },
    past7RainMm: rain.slice(0, 7).reduce((a, b) => a + b, 0),
    next3RainMm: rain.slice(todayIdx, todayIdx + 3).reduce((a, b) => a + b, 0),
  };
}

export const weatherQuery = (lat?: number, lon?: number) => ({
  queryKey: ["weather", lat, lon],
  queryFn: () => fetchWeather(lat!, lon!),
  enabled: lat != null && lon != null,
  staleTime: 15 * 60 * 1000,
  retry: 1,
});
