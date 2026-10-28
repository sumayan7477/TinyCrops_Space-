import { describe, it, expect } from "vitest";
import { analyzeNdvi, parcelAdvice, type NdviObs } from "./ndvi-trend";

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
  it("rejects duplicate dates instead of counting them as independent evidence", () => {
    expect(analyzeNdvi([o("2026-10-01", 0.7), o("2026-10-01", 0.6), o("2026-10-10", 0.5)]).change).toBe("not_comparable");
  });
  it("excludes invalid dates and unknown parcel pixel quality", () => {
    const a = analyzeNdvi([o("2026-02-30", 0.7), { ...o("2026-10-01", 0.5), quality: null }]);
    expect(a.points).toHaveLength(1); expect(a.reliableCount).toBe(0);
  });
  it("does not infer a trend across a long data gap", () => {
    expect(analyzeNdvi([o("2026-09-01", 0.7), o("2026-09-10", 0.6), o("2026-10-20", 0.4)]).change).toBe("not_comparable");
  });
});

const details = { boundary: true, crop: "rice", stage: "growing" };
const today = "2026-10-28";
const stable = [o("2026-10-01", 0.7), o("2026-10-10", 0.71), o("2026-10-20", 0.72)];
describe("shared farmer advice safety", () => {
  it("stable real-quality readings do not raise an inspection warning", () => { const a = parcelAdvice(stable, details, today); expect(a.limited).toBe(false); expect(a.needsInspection).toBe(false); expect(a.analysis.change).toBe("stable"); });
  it("a consistent synthetic decline suggests inspection, never a diagnosis", () => { const a = parcelAdvice([o("2026-10-01", 0.7), o("2026-10-10", 0.6), o("2026-10-20", 0.5)], details, today); expect(a.needsInspection).toBe(true); expect(a.analysis.change).toBe("decrease"); });
  it("cloud-affected latest observations cannot support confident current advice", () => { const a = parcelAdvice([...stable, o("2026-10-25", 0.3, 80)], details, today); expect(a.limited).toBe(true); expect(a.needsInspection).toBe(false); });
  it("no observations have no confident interpretation", () => { expect(parcelAdvice([], details, today).limited).toBe(true); });
  it("old images cannot raise a current decline warning", () => { const a = parcelAdvice([o("2026-09-01", 0.7), o("2026-09-10", 0.6), o("2026-09-20", 0.5)], details, today); expect(a.stale).toBe(true); expect(a.needsInspection).toBe(false); });
  it("missing boundaries prevent field-specific certainty", () => { const a = parcelAdvice(stable, { ...details, boundary: false }, today); expect(a.approximate).toBe(true); expect(a.limited).toBe(true); });
  it("unknown crop and stage remain an explicit limitation", () => { expect(parcelAdvice(stable, { ...details, crop: null, stage: null }, today).missingCropDetails).toBe(true); });
  it("saved boundaries do not erase the approximate area used by old readings", () => { const a = parcelAdvice(stable.map((row) => ({ ...row, quality: "farm-point area (~500 m square); 90 clear px, 10 masked" })), details, today); expect(a.approximate).toBe(true); expect(a.limited).toBe(true); });
});
