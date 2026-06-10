import { describe, expect, it } from "vitest";
import { isRuralEnvironment } from "@/lib/utils/ruralAddress";

describe("isRuralEnvironment", () => {
  it("detects PAD rural value", () => {
    expect(isRuralEnvironment("Rural")).toBe(true);
    expect(isRuralEnvironment("Urban")).toBe(false);
  });

  it("detects house comparator codes via options", () => {
    const options = [
      { code: "URBAN", name: "Urban" },
      { code: "RURAL_ENV", name: "Rural" },
    ];
    expect(isRuralEnvironment("RURAL_ENV", options)).toBe(true);
    expect(isRuralEnvironment("URBAN", options)).toBe(false);
  });
});
