import { describe, expect, it } from "vitest";
import { DEMO_SCENARIOS, DEMO_SCENARIO_MAP, DEFAULT_SCENARIO } from "./demo-data";

describe("demo data", () => {
  it("provides exactly the six required scenarios", () => {
    expect(DEMO_SCENARIOS.map((s) => s.id)).toEqual(["normal", "dry", "rain", "stress", "cloudy", "fire"]);
  });

  it("default scenario shows 2 items needing attention", () => {
    expect(DEMO_SCENARIO_MAP[DEFAULT_SCENARIO].attentionCount).toBe(2);
  });

  it("every warning answers all six questions", () => {
    for (const s of DEMO_SCENARIOS) {
      for (const w of s.warnings) {
        for (const key of ["noticed", "why", "action", "timing", "confidence", "missing", "evidence"] as const) {
          expect(w[key].length, `${s.id}/${w.id}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("normal scenario needs no attention; every other scenario needs at least one", () => {
    expect(DEMO_SCENARIO_MAP.normal.attentionCount).toBe(0);
    for (const s of DEMO_SCENARIOS.filter((x) => x.id !== "normal")) {
      expect(s.attentionCount, s.id).toBeGreaterThan(0);
    }
  });

  it("status summary matches the attention count", () => {
    for (const s of DEMO_SCENARIOS) {
      if (s.attentionCount === 0) expect(s.statusSummary).toBe("No items need attention");
      else expect(s.statusSummary).toBe(`${s.attentionCount} item${s.attentionCount === 1 ? "" : "s"} need${s.attentionCount === 1 ? "s" : ""} attention`);
    }
  });

  it("fire scenario never claims a confirmed fire", () => {
    const fire = DEMO_SCENARIO_MAP.fire;
    const text = JSON.stringify(fire).toLowerCase();
    // "confirmed fire" may only appear negated ("not a confirmed fire")
    expect(text.replace(/not a confirmed fire/g, "")).not.toContain("confirmed fire");
    expect(fire.fireMonitoring).toContain("Not a confirmed fire");
  });
});
