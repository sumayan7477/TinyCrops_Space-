import { describe, it, expect } from "vitest";
import { heatRisk, drynessAlert, score, buildDailyActions, usableWeather } from "./insights";
import type { WeatherData } from "./weather";

describe("heat risk", () => {
  it("heavy work raises the risk band", () => {
    expect(heatRisk(30, "light")).toBe("caution");
    expect(heatRisk(30, "heavy")).toBe("high");
  });
  it("extreme at 46°C+", () => expect(heatRisk(46)).toBe("extreme"));
});

describe("dryness", () => {
  it("low rainfall alone is only a low-confidence monitor", () => {
    expect(drynessAlert(1, 0, null)).toEqual({ level: "monitor", confidence: "low" });
  });
  it("no alert when rain is forecast", () => expect(drynessAlert(0, 10, true).level).toBe("none"));
});

describe("ranking", () => {
  it("urgent with high confidence outranks low-confidence medium", () => {
    expect(score("urgent", "high", false)).toBeGreaterThan(score("medium", "low", true));
  });
});

describe("weather reliability", () => {
  it("does not invent weather advice when the provider fails", () => {
    expect(buildDailyActions({ farmName: "Farm", weather: null, overdueTasks: [], hasVegetationData: false })).toEqual([]);
  });
  it("old weather cannot support current warnings", () => {
    const weather = { retrievedAt: "2026-10-25T00:00:00Z" } as WeatherData;
    expect(usableWeather(weather, Date.parse("2026-10-28T00:00:00Z"))).toBe(false);
  });
});
