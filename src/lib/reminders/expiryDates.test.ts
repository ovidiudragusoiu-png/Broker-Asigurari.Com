import { describe, expect, it } from "vitest";
import {
  daysUntilExpiry,
  matchesReminderWindow,
  parsePolicyEndDate,
} from "./expiryDates";

describe("expiryDates", () => {
  it("parses ISO end dates", () => {
    expect(parsePolicyEndDate("2026-07-05")?.getFullYear()).toBe(2026);
  });

  it("matches 30-day reminder window", () => {
    const today = new Date("2026-06-05T10:00:00");
    expect(matchesReminderWindow("2026-07-05", 30, today)).toBe(true);
    expect(matchesReminderWindow("2026-07-06", 30, today)).toBe(false);
  });

  it("computes days until expiry", () => {
    const today = new Date("2026-06-05T10:00:00");
    expect(daysUntilExpiry("2026-07-05", today)).toBe(30);
    expect(daysUntilExpiry("2026-06-06", today)).toBe(1);
  });
});
