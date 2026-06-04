import { describe, expect, it } from "vitest";
import { articleDateToIso, parseArticleDisplayDate } from "./articleDates";

describe("articleDates", () => {
  it("parses display dates to ISO", () => {
    const parsed = parseArticleDisplayDate("15 Feb 2025");
    expect(parsed?.toISOString()).toBe("2025-02-15T00:00:00.000Z");
    expect(articleDateToIso("15 Feb 2025")).toBe("2025-02-15T00:00:00.000Z");
  });

  it("returns undefined for invalid dates", () => {
    expect(parseArticleDisplayDate("invalid")).toBeUndefined();
    expect(articleDateToIso("invalid")).toBeUndefined();
  });
});
