import { describe, it, expect } from "vitest";
import { heatRisk, drynessAlert, score } from "./insights";

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
