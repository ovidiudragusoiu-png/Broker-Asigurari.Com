import { describe, expect, it } from "vitest";
import {
  buildOfferFailureAuditPayload,
  extractRawOfferErrorMessage,
  isComparatorOfferPath,
  isFailedOfferResponse,
} from "./offerFailureLog";

describe("offerFailureLog", () => {
  it("detects comparator paths", () => {
    expect(isComparatorOfferPath("online/offers/house/comparator/v3?orderHash=abc")).toBe(
      true
    );
    expect(isComparatorOfferPath("online/offers/travel/comparator/v3")).toBe(true);
    expect(isComparatorOfferPath("online/offers/order/v3")).toBe(false);
  });

  it("treats API error responses as failures", () => {
    expect(
      isFailedOfferResponse(200, {
        error: true,
        policyPremium: 0,
        message: "Tip structura nu a fost completat sau este invalid!",
      })
    ).toBe(true);
  });

  it("ignores successful offers with premium", () => {
    expect(
      isFailedOfferResponse(200, {
        policyPremium: 120.5,
        message: "Mesajul a fost prelucrat cu succes. | MENTIUNI TEST",
      })
    ).toBe(false);
  });

  it("builds audit payload with raw message and context", () => {
    const payload = buildOfferFailureAuditPayload({
      path: "online/offers/house/comparator/v3",
      httpStatus: 200,
      requestBody: {
        productId: 36,
        productCode: "ALLIANZ_MYHOME",
        offerDetails: {
          buildingStructureTypeId: 4,
          environmentType: "Urban",
          noOfFloors: 1,
        },
      },
      responseBody: {
        error: true,
        policyPremium: 0,
        message: "Tip structura nu a fost completat sau este invalid!",
        productDetails: {
          productName: "MYHOME",
          vendorDetails: { commercialName: "Allianz Tiriac" },
        },
      },
    });

    expect(payload).toMatchObject({
      productType: "HOUSE",
      vendorName: "Allianz Tiriac",
      rawMessage: "Tip structura nu a fost completat sau este invalid!",
      context: {
        buildingStructureTypeId: 4,
        environmentType: "Urban",
        noOfFloors: 1,
      },
    });
  });

  it("extracts nested HTTP error bodies", () => {
    expect(
      extractRawOfferErrorMessage({
        message: "Household: only real value insurance sum option is available",
      })
    ).toBe("Household: only real value insurance sum option is available");
  });
});
