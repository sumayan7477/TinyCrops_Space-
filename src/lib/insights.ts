// Pure, transparent decision rules. No fabricated data: every output cites its inputs.
import type { WeatherData } from "./weather";

export type Intensity = "light" | "moderate" | "heavy";
export type HeatRisk = "lower" | "caution" | "high" | "very_high" | "extreme";

/** Workload adjustment (°C) added to apparent temperature before banding. Conservative, documented assumption. */
export const INTENSITY_ADJUST: Record<Intensity, number> = { light: 0, moderate: 2, heavy: 4 };

/**
 * Bands based on apparent-temperature / heat-index style guidance (NWS heat index bands, °C).
 * This is NOT WBGT. It is a weather-derived estimate.
 */
export function heatRisk(apparentC: number, intensity: Intensity = "light"): HeatRisk {
  const t = apparentC + INTENSITY_ADJUST[intensity];
  if (t >= 46) return "extreme";
  if (t >= 39) return "very_high";
  if (t >= 32) return "high";
  if (t >= 27) return "caution";
  return "lower";
}

export const HEAT_LABEL: Record<HeatRisk, string> = {
  lower: "Lower",
  caution: "Caution",
  high: "High",
  very_high: "Very high",
  extreme: "Extreme",
};

export const HEAT_GUIDANCE: Record<HeatRisk, string> = {
  lower: "Normal precautions: water available, shade nearby, watch for symptoms.",
  caution: "Drink water every 15–20 min, take shaded breaks, watch new or unacclimatized workers.",
  high: "Reduce heavy work, schedule frequent shaded breaks, use a buddy system.",
  very_high: "Postpone heavy work if possible. Short work periods with long rest in shade.",
  extreme: "Postpone non-essential outdoor work. Follow local emergency heat guidance.",
};

export interface WorkWindow {
  start: string;
  end: string;
  hours: number;
  maxApparent: number;
  risk: HeatRisk;
  reason: string;
}

/** Find contiguous daylight hours (06–20 local) whose adjusted risk is at or below 'caution'. */
export function safeWorkWindows(
  hourly: { time: string[]; apparent: number[]; precipProb: (number | null)[]; wind: number[] },
  intensity: Intensity,
  minHours = 1,
  maxWindKmh = 40,
): WorkWindow[] {
  const out: WorkWindow[] = [];
  let cur: number[] = [];
  const flush = () => {
    if (cur.length >= minHours) {
      const temps = cur.map((i) => hourly.apparent[i]);
      const max = Math.max(...temps);
      out.push({
        start: hourly.time[cur[0]],
        end: hourly.time[cur[cur.length - 1]],
        hours: cur.length,
        maxApparent: max,
        risk: heatRisk(max, intensity),
        reason: `Forecast apparent temperature stays at or below ${max.toFixed(0)}°C, wind under ${maxWindKmh} km/h, rain chance under 60%.`,
      });
    }
    cur = [];
  };
  hourly.time.forEach((t, i) => {
    const hour = Number(t.slice(11, 13));
    const ok =
      hour >= 6 &&
      hour <= 20 &&
      ["lower", "caution"].includes(heatRisk(hourly.apparent[i], intensity)) &&
      hourly.wind[i] < maxWindKmh &&
      (hourly.precipProb[i] ?? 0) < 60;
    if (ok && (cur.length === 0 || cur[cur.length - 1] === i - 1)) cur.push(i);
    else {
      flush();
      if (ok) cur.push(i);
    }
  });
  flush();
  return out;
}

export type Priority = "low" | "medium" | "high" | "urgent";
export interface ActionItem {
  id: string;
  category: "crop" | "irrigation" | "weather" | "heat" | "wildfire" | "task";
  title: string;
  where: string;
  why: string;
  action: string;
  evidence: string;
  observedAt: string;
  priority: Priority;
  confidence: "low" | "medium" | "high";
  uncertainty: string;
  score: number;
}

const PRIORITY_W: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
const CONF_W = { low: 0.6, medium: 0.8, high: 1 };

/** Transparent ranking: severity × evidence quality, +1 if time-sensitive (due today or within 24h). */
export function score(priority: Priority, confidence: "low" | "medium" | "high", timeSensitive: boolean) {
  return PRIORITY_W[priority] * CONF_W[confidence] + (timeSensitive ? 1 : 0);
}

/** Dryness check. Low rainfall alone never proves soil dryness — confidence stays low without vegetation data. */
export function drynessAlert(
  past7mm: number,
  next3mm: number,
  hasVegetationDecline: boolean | null,
): { level: "none" | "monitor" | "inspect"; confidence: "low" | "medium" } {
  const dry = past7mm < 5 && next3mm < 5;
  if (!dry) return { level: "none", confidence: "low" };
  if (hasVegetationDecline === true) return { level: "inspect", confidence: "medium" };
  return { level: "monitor", confidence: "low" };
}

export function buildDailyActions(input: {
  farmName: string;
  weather: WeatherData | null;
  overdueTasks: { id: string; title: string; due_date: string | null; parcel?: string | null }[];
  hasVegetationData: boolean;
}): ActionItem[] {
  const items: ActionItem[] = [];
  const w = input.weather;
  if (w) {
    const todayMax = w.daily.apparentMax[0];
    const risk = heatRisk(todayMax, "moderate");
    if (["high", "very_high", "extreme"].includes(risk)) {
      const p: Priority = risk === "high" ? "high" : "urgent";
      items.push({
        id: "heat",
        category: "heat",
        title: `${HEAT_LABEL[risk]} heat stress expected today`,
        where: input.farmName,
        why: "Outdoor workers may face heat illness risk during the hottest hours.",
        action: `${HEAT_GUIDANCE[risk]} Check the Safe Work Windows page before planning field work.`,
        evidence: `Forecast max apparent temperature ${todayMax.toFixed(0)}°C (${w.source}).`,
        observedAt: w.retrievedAt,
        priority: p,
        confidence: "medium",
        uncertainty: "Regional forecast, not a field measurement and not WBGT. Sun, clothing and workload change real exposure.",
        score: score(p, "medium", true),
      });
    }
    const dry = drynessAlert(w.past7RainMm, w.next3RainMm, input.hasVegetationData ? null : null);
    if (dry.level !== "none") {
      items.push({
        id: "dry",
        category: "irrigation",
        title: "Dry spell — check soil moisture",
        where: input.farmName,
        why: "Little rain has fallen and little is forecast. This may raise water demand for crops.",
        action: "Check soil moisture by hand or probe and inspect irrigation lines before deciding whether to irrigate.",
        evidence: `${w.past7RainMm.toFixed(1)} mm rain in the past 7 days; ${w.next3RainMm.toFixed(1)} mm forecast for the next 3 days (${w.source}).`,
        observedAt: w.retrievedAt,
        priority: "medium",
        confidence: dry.confidence,
        uncertainty: input.hasVegetationData
          ? "Low rainfall does not prove the soil is dry."
          : "No satellite vegetation data is connected, so crop water stress cannot be assessed. Low rainfall does not prove the soil is dry.",
        score: score("medium", dry.confidence, false),
      });
    }
    const windMax = Math.max(...w.daily.windMax.slice(0, 2));
    if (windMax >= 50) {
      items.push({
        id: "wind",
        category: "weather",
        title: "Strong wind forecast",
        where: input.farmName,
        why: "Strong wind can damage crops and structures and makes spraying unsafe.",
        action: "Avoid spraying, secure covers and loose equipment.",
        evidence: `Forecast max wind ${windMax.toFixed(0)} km/h in the next 48 h (${w.source}).`,
        observedAt: w.retrievedAt,
        priority: "medium",
        confidence: "medium",
        uncertainty: "Regional forecast; local gusts can differ.",
        score: score("medium", "medium", true),
      });
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const t of input.overdueTasks) {
    items.push({
      id: `task-${t.id}`,
      category: "task",
      title: `Overdue: ${t.title}`,
      where: t.parcel ?? input.farmName,
      why: "A scheduled check has passed its due date.",
      action: "Complete the inspection or reschedule it on the Task List.",
      evidence: `Due ${t.due_date}.`,
      observedAt: today,
      priority: "high",
      confidence: "high",
      uncertainty: "Based on your own task records.",
      score: score("high", "high", true),
    });
  }
  return items.sort((a, b) => b.score - a.score);
}
