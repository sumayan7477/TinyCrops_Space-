import { describe, expect, it, vi } from "vitest";
import { currentForecast, parseDangerHtml } from "./effis";
import { fetchEffis, readCapabilities } from "./effis.server";

const now = new Date("2026-10-28T10:06:00Z");
const catalogue = `<WMT_MS_Capabilities><Capability><Layer queryable="1"><Name>EFFIS</Name><Layer queryable="1"><Name>mf010.query</Name><LatLonBoundingBox minx="-25" miny="25" maxx="50" maxy="72"/><Extent name="time" default="2026-10-30">2018-01-01/2099-12-31</Extent></Layer><Layer queryable="0"><Name>mf010.fwi</Name></Layer><Layer queryable="1"><Name>viirs.hs.query</Name></Layer></Layer></Capability></WMT_MS_Capabilities>`;
const placeholder = `<table><tr><td>Date</td><td>[DAY]</td></tr><tr><td>Fire Weather Index (FWI)</td><td>[FWI]</td></tr><tr><td>Danger Risk (DR)</td><td>[DANGER_RISK]</td></tr></table>`;
const fetcher = (reply = placeholder) => vi.fn(async (input: URL | RequestInfo) => new Response(String(input).includes("GetCapabilities") ? catalogue : reply)) as unknown as typeof fetch;

describe("EFFIS evidence safety", () => {
  it("reads actual queryability without converting image layers to records", () => {
    expect(readCapabilities(catalogue).find((l) => l.name === "mf010.fwi")?.queryable).toBe(false);
  });
  it("rejects unresolved official response placeholders", () => {
    expect(parseDangerHtml(placeholder, "2026-10-28")).toBeNull();
  });
  it("does not invent a category from numeric DR", () => {
    expect(parseDangerHtml(`<tr><td>Date</td><td>2026-10-28</td></tr><tr><td>Fire Weather Index (FWI)</td><td>20.5</td></tr><tr><td>Danger Risk (DR)</td><td>3</td></tr>`, "2026-10-28")).toEqual({ date: "2026-10-28", fwi: 20.5, category: null });
  });
  it("requires matching observation date", () => {
    expect(parseDangerHtml(`<tr><td>Date</td><td>2026-10-27</td></tr><tr><td>Fire Weather Index (FWI)</td><td>20</td></tr>`, "2026-10-28")).toBeNull();
  });
  it("does not treat advertised future default as today's risk", () => {
    expect(currentForecast("2026-10-30", now)).toBe(false);
    expect(currentForecast("2026-10-28", now)).toBe(true);
  });
  it("returns no-data rather than successful risk for empty real-shaped responses", async () => {
    const r = await fetchEffis(40.4, -3.7, fetcher(), now);
    expect(r.serviceResponded).toBe(true);
    expect(r.danger.state).toBe("no_data");
    expect(r.danger.category).toBeNull();
    expect(r.danger.queriedDates).toEqual(["2026-10-28", "2026-10-30"]);
  });
  it("does not turn a successful no-hotspot point response into a complete search", async () => {
    const r = await fetchEffis(40.4, -3.7, fetcher("Search returned no results."), now);
    expect(r.fires.queryResponded).toBe(true);
    expect(r.fires.state).toBe("unsupported");
  });
  it("handles service failure without substituted risk", async () => {
    const r = await fetchEffis(40.4, -3.7, vi.fn().mockRejectedValue(new Error("timeout")), now);
    expect(r.serviceResponded).toBe(false);
    expect(r.danger.state).toBe("error");
    expect(r.danger.fwi).toBeNull();
  });
  it("does not query danger outside advertised coverage", async () => {
    const f = fetcher();
    const r = await fetchEffis(23.8, 90.4, f, now);
    expect(r.danger.state).toBe("unsupported");
    expect(r.danger.queriedDates).toEqual([]);
  });
  it("handles missing layers", async () => {
    const f = vi.fn(async () => new Response("<WMT_MS_Capabilities><Capability><Layer><Name>EFFIS</Name></Layer></Capability></WMT_MS_Capabilities>"));
    const r = await fetchEffis(40.4, -3.7, f, now);
    expect(r.danger.state).toBe("unsupported");
    expect(r.fires.queryResponded).toBe(false);
  });
});