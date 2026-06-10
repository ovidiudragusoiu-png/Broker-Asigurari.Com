import { describe, expect, it } from "vitest";
import {
  buildOfferDetailsPath,
  extractOfferPortalFields,
} from "@/lib/portal/offerDetails";

describe("offerDetails", () => {
  it("builds product-specific upstream paths", () => {
    expect(buildOfferDetailsPath("TRAVEL", 12, "hash-1")).toContain(
      "/online/offers/travel/12/details/v3"
    );
    expect(buildOfferDetailsPath("RCA", 12, "hash-1")).toContain(
      "/online/offers/rca/12/details/v3"
    );
  });

  it("extracts portal fields from upstream offer details", () => {
    const fields = extractOfferPortalFields({
      orderId: 99,
      policyStartDate: "2026-07-01",
      policyEndDate: "2027-07-01",
      price: 120.5,
      currency: "RON",
      productDetails: {
        vendorDetails: { commercialName: "Test Asig" },
      },
    });
    expect(fields.orderId).toBe(99);
    expect(fields.vendorName).toBe("Test Asig");
    expect(fields.premium).toBe(120.5);
    expect(fields.startDate).toBe("2026-07-01");
  });
});
