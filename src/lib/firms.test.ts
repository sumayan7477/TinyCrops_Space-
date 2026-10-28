import { describe, expect, it, vi } from "vitest";
import { distanceKm, isStale, parseFirmsCsv, radiusBox } from "./firms";
import { fetchFirms } from "./firms.server";

const head = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const now = new Date("2026-10-28T10:00:00Z");
const reply = (body: string, status = 200) => vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

describe("NASA FIRMS detections", () => {
  it("computes great-circle distance", () => {
    expect(distanceKm(40.4, -3.7, 40.5, -3.7)).toBeCloseTo(11.1, 1);
  });
  it("box encloses radius", () => {
    expect(radiusBox(0, 0, 111.32)).toBe("-1.0000,-1.0000,1.0000,1.0000");
  });
  it("skips invalid coordinates and keeps only detections inside radius", () => {
    const csv = `${head}\n40.45,-3.7,330,0.4,0.4,2026-10-27,0142,N,VIIRS,n,2.0NRT,290,5.1,N\n95,-3.7,330,0.4,0.4,2026-10-27,0142,N,VIIRS,n,2.0NRT,290,5.1,N\n,-3.7,330,0.4,0.4,2026-10-27,0142,N,VIIRS,n,2.0NRT,290,5.1,N\n41.4,-3.7,330,0.4,0.4,2026-10-27,0142,N,VIIRS,n,2.0NRT,290,5.1,N`;
    const r = parseFirmsCsv(csv, "VIIRS_SNPP_NRT", 40.4, -3.7, 25);
    expect(r.invalid).toBe(2);
    expect(r.detections).toHaveLength(1);
    expect(r.detections[0].distanceKm).toBe(5.6);
    expect(r.detections[0].detectedAt).toBe("2026-10-27T01:42:00Z");
  });
  it("reports no results without claiming absence of fire", async () => {
    const r = await fetchFirms(40.4, -3.7, 25, 2, "k", reply(head), now);
    expect(r.state).toBe("no_results");
    expect(r.message).toMatch(/does not mean there is no fire/);
  });
  it("is unknown without a key", async () => {
    expect((await fetchFirms(40.4, -3.7, 25, 2, undefined, reply(head), now)).state).toBe("not_configured");
  });
  it("is error when every source fails", async () => {
    const r = await fetchFirms(40.4, -3.7, 25, 2, "k", reply("Invalid MAP_KEY.", 400), now);
    expect(r.state).toBe("error");
    expect(r.detections).toEqual([]);
  });
  it("marks results older than 30 minutes stale", () => {
    expect(isStale("2026-10-28T09:00:00Z", now.getTime())).toBe(true);
    expect(isStale("2026-10-28T09:50:00Z", now.getTime())).toBe(false);
  });
});
