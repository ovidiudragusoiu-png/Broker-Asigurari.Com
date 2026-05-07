import { describe, expect, it } from "vitest";
import { buildCronExpression, buildWeeklyDateRanges } from "./dateRanges";

describe("buildWeeklyDateRanges", () => {
  it("builds last 7 days, previous 7 days, and month-to-date in the configured timezone", () => {
    const ranges = buildWeeklyDateRanges(new Date("2026-05-04T05:00:00.000Z"), "Europe/Bucharest");

    expect(ranges.current).toEqual({
      label: "Last 7 days",
      startDate: "2026-04-27",
      endDate: "2026-05-03",
    });
    expect(ranges.previous).toEqual({
      label: "Previous 7 days",
      startDate: "2026-04-20",
      endDate: "2026-04-26",
    });
    expect(ranges.monthToDate).toEqual({
      label: "Month to date",
      startDate: "2026-05-01",
      endDate: "2026-05-03",
    });
  });
});

describe("buildCronExpression", () => {
  it("converts report day and time into a cron expression", () => {
    expect(buildCronExpression("monday", "08:30")).toBe("30 8 * * 1");
  });
});
