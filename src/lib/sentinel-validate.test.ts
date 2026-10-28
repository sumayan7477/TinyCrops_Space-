import { describe, it, expect } from "vitest";
import { validateCoords, validateRange, usableBoundary } from "./sentinel-validate";
const now = new Date("2026-10-28T00:00:00Z");
describe("sentinel validation", () => {
  it("rejects out-of-range coordinates", () => expect(validateCoords(95, 10)).not.toBeNull());
  it("accepts valid coordinates", () => expect(validateCoords(37.9, 23.7)).toBeNull());
  it("rejects start after end", () => expect(validateRange("2026-10-10", "2026-10-01", now)).not.toBeNull());
  it("rejects future end date", () => expect(validateRange("2026-10-01", "2026-11-05", now)).not.toBeNull());
  it("rejects ranges over 120 days", () => expect(validateRange("2026-01-01", "2026-10-01", now)).not.toBeNull());
  it("accepts a 30-day range", () => expect(validateRange("2026-09-27", "2026-10-27", now)).toBeNull());
  it("ignores non-polygon boundaries", () => expect(usableBoundary({ type: "Point", coordinates: [1, 2] })).toBeNull());
});
