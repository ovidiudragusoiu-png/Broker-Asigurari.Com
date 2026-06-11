import { describe, expect, it } from "vitest";
import {
  ALLIANZ_CARAMIDA_PIATRA_STRUCTURE_MESSAGE,
  groupUnavailableHouseOffers,
  resolveHouseUnavailableOfferReason,
  shouldUseAllianzCaramidaPiatraMessage,
} from "./houseOfferMessages";

describe("houseOfferMessages", () => {
  const allianzUnavailable = {
    vendorName: "Allianz Tiriac",
    productName: "MYHOME",
    hasApiError: true,
    message: "Tip structura nu a fost completat sau este invalid!",
    policyPremium: 0,
  };

  it("uses friendly message for Allianz when structure is Caramida Piatra", () => {
    expect(shouldUseAllianzCaramidaPiatraMessage(allianzUnavailable, 4)).toBe(true);
    expect(resolveHouseUnavailableOfferReason(allianzUnavailable, 4)).toBe(
      ALLIANZ_CARAMIDA_PIATRA_STRUCTURE_MESSAGE
    );
  });

  it("rewrites generic structure errors for Allianz when structure is not Caramida Piatra", () => {
    for (const structureId of [1, 5, 7]) {
      expect(shouldUseAllianzCaramidaPiatraMessage(allianzUnavailable, structureId)).toBe(false);
      expect(resolveHouseUnavailableOfferReason(allianzUnavailable, structureId)).toContain(
        "Structura clădirii"
      );
    }
  });

  it("rewrites known Garanta content-sum errors to Romanian", () => {
    const offer = {
      vendorName: "Garanta",
      message: "SumaAsigurataContinut nu corespunde!",
      policyPremium: 0,
    };

    expect(resolveHouseUnavailableOfferReason(offer, 4)).toContain("conținut");
  });

  it("groups duplicate unavailable offers by vendor and message", () => {
    const offers = [
      {
        vendorName: "Omniasig",
        productName: "Garant SUMMUM A",
        message: "Household: only real value insurance sum option is available",
        policyPremium: 0,
      },
      {
        vendorName: "Omniasig",
        productName: "Garant SUMMUM B",
        message: "Household: only real value insurance sum option is available",
        policyPremium: 0,
      },
    ];

    const grouped = groupUnavailableHouseOffers(offers, 1);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.productNames).toEqual(["Garant SUMMUM A", "Garant SUMMUM B"]);
  });
});
