import { describe, it, expect } from "vitest";
import { analyzeNdvi, type NdviObs } from "./ndvi-trend";

const o = (d: string, v: number, cloud = 5, q = "parcel boundary; 90 clear px, 10 masked"): NdviObs => ({ observed_at: d, mean_value: v, cloud_cover_pct: cloud, quality: q });

describe("analyzeNdvi", () => {
  it("refuses to compare with fewer than 3 clear observations", () => {
    const a = analyzeNdvi([o("2026-09-01", 0.5), o("2026-09-10", 0.3)]);
    expect(a.change).toBe("not_comparable");
    expect(a.tooFew).toBe(true);
  });
  it("excludes observations where under half the parcel is cloud-free", () => {
    const a = analyzeNdvi([o("2026-09-01", 0.5), o("2026-09-10", 0.5), o("2026-09-20", 0.1, 5, "parcel boundary; 30 clear px, 70 masked")]);
    expect(a.reliableCount).toBe(2);
    expect(a.cloudRisk).toBe(true);
  });
  it("treats changes under 0.05 as stable", () => {
    expect(analyzeNdvi([o("2026-09-01", 0.5), o("2026-09-10", 0.52), o("2026-09-20", 0.53)]).change).toBe("stable");
  });
  it("calls a decline consistent only when two successive points are lower", () => {
    expect(analyzeNdvi([o("2026-09-01", 0.6), o("2026-09-10", 0.5), o("2026-09-20", 0.45)]).change).toBe("decrease");
    expect(analyzeNdvi([o("2026-09-01", 0.6), o("2026-09-10", 0.6), o("2026-09-20", 0.45)]).change).toBe("single_drop");
  });
  it("flags the approximate farm-point area", () => {
    const a = analyzeNdvi([o("2026-09-01", 0.5, 5, "farm-point area (~500 m square); 90 clear px, 10 masked")]);
    expect(a.approximateBoundary).toBe(true);
  });
});
