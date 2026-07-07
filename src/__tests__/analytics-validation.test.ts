import { describe, it, expect } from "vitest";
import { validateAnalyticsRange } from "@/lib/analyticsValidation";

describe("validateAnalyticsRange", () => {
  it("accepts absent params", () => {
    const result = validateAnalyticsRange(null, null);
    expect(result.valid).toBe(true);
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });

  it("parses valid ISO dates", () => {
    const result = validateAnalyticsRange("2026-01-05", "2026-04-06", "2026-01-05");
    expect(result.valid).toBe(true);
    expect(result.from?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(result.to?.toISOString()).toBe("2026-04-06T00:00:00.000Z");
    expect(result.weekStart?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("accepts from without to", () => {
    const result = validateAnalyticsRange("2026-01-05", null);
    expect(result.valid).toBe(true);
    expect(result.from).toBeDefined();
  });

  it("rejects malformed dates", () => {
    expect(validateAnalyticsRange("not-a-date", null).valid).toBe(false);
    expect(validateAnalyticsRange(null, "13/13/2026x").valid).toBe(false);
    expect(validateAnalyticsRange(null, null, "nope").valid).toBe(false);
  });

  it("rejects from after to", () => {
    const result = validateAnalyticsRange("2026-04-06", "2026-01-05");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("from must be before or equal to to.");
  });

  it("accepts from equal to to", () => {
    expect(validateAnalyticsRange("2026-01-05", "2026-01-05").valid).toBe(true);
  });
});
