import { describe, expect, it } from "vitest";
import { formatPadDntSummary, formatTravelDntSummary } from "@/lib/email/dntSummaryFormatters";
import { PAD_AGREEMENTS_DEFAULTS } from "@/lib/flows/padAgreementsCopy";
import { TRAVEL_AGREEMENTS_DEFAULTS } from "@/lib/flows/travelAgreementsCopy";
import { buildDntSummaryHtml } from "@/lib/email/dntSummaryEmail";

describe("dntSummaryFormatters", () => {
  it("maps PAD answers to readable rows", () => {
    const rows = formatPadDntSummary(PAD_AGREEMENTS_DEFAULTS);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some((row) => row.answer.includes("DA"))).toBe(true);
    expect(rows.some((row) => row.question.includes("1.1"))).toBe(true);
  });

  it("maps Travel checkbox groups with multiple selections", () => {
    const rows = formatTravelDntSummary({
      ...TRAVEL_AGREEMENTS_DEFAULTS,
      dnt_0_7_baggage: true,
      dnt_0_7_sports: true,
      dnt_0_7_none: false,
      dnt_0_8_plane: true,
      dnt_0_8_car: true,
      dnt_0_8_other: false,
    });
    const coverages = rows.find((row) => row.question.includes("0.7"));
    expect(coverages?.answer).toBe("Pierdere / furt bagaje, Sporturi extreme");
    const transport = rows.find((row) => row.question.includes("0.8"));
    expect(transport?.answer).toBe("Avion, Autoturism");
  });
});

describe("dntSummaryEmail", () => {
  it("builds Romanian HTML with product label", () => {
    const html = buildDntSummaryHtml({
      firstName: "Ion",
      productType: "PAD",
      rows: [{ question: "0.1 Test", answer: "DA" }],
      submittedAt: new Date("2026-06-09T12:00:00Z"),
    });
    expect(html).toContain("Opțiunile tale DNT");
    expect(html).toContain("Bună, Ion");
    expect(html).toContain("PAD");
  });
});
