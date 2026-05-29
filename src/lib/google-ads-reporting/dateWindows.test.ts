import { describe, expect, it } from "vitest";
import { buildWeeklyDateWindows } from "./dateWindows";

describe("buildWeeklyDateWindows", () => {
  it("uses the last seven completed days in Europe/Bucharest", () => {
    const windows = buildWeeklyDateWindows("Europe/Bucharest", new Date("2026-06-01T05:00:00.000Z"));

    expect(windows.last7Days).toEqual({
      start: "2026-05-25",
      end: "2026-05-31",
    });
    expect(windows.previous7Days).toEqual({
      start: "2026-05-18",
      end: "2026-05-24",
    });
    expect(windows.monthToDate).toBeUndefined();
  });

  it("includes month-to-date when the current month has completed days", () => {
    const windows = buildWeeklyDateWindows("Europe/Bucharest", new Date("2026-05-29T05:00:00.000Z"));

    expect(windows.last7Days).toEqual({
      start: "2026-05-22",
      end: "2026-05-28",
    });
    expect(windows.monthToDate).toEqual({
      start: "2026-05-01",
      end: "2026-05-28",
    });
  });
});
