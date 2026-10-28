import { describe, expect, it } from "vitest";
import { modeKey, parseMode } from "./view-mode";

describe("account mode preferences", () => {
  it("defaults new users to Farmer Mode", () => { expect(parseMode(null)).toBe("farmer"); });
  it("restores only a valid saved Inspector preference", () => { expect(parseMode("inspector")).toBe("inspector"); expect(parseMode("invalid")).toBe("farmer"); });
  it("isolates mode preferences by account", () => { const storage = new Map([[modeKey("account-a"), "inspector"]]); expect(parseMode(storage.get(modeKey("account-b")) ?? null)).toBe("farmer"); expect(parseMode(storage.get(modeKey("account-a")) ?? null)).toBe("inspector"); });
});