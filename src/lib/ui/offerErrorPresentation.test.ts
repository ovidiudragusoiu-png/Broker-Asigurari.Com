import { describe, expect, it } from "vitest";
import {
  GENERIC_UNAVAILABLE_OFFER_MESSAGE,
  isTechnicalOfferError,
  isUserFriendlyRomanianOfferError,
  presentUnavailableOfferError,
} from "./offerErrorPresentation";

describe("offerErrorPresentation", () => {
  it("flags Generali XSD-style errors as technical", () => {
    const raw =
      "The 'building_structure' element is invalid - The value 'OfferDetailsMultiClient.insuredGoodDetails.insuredGood.buildingStructureDetails.nameGenerali' is invalid according to its datatype 'building_structure' - The Enumeration constraint failed.";
    expect(isTechnicalOfferError(raw)).toBe(true);
    expect(presentUnavailableOfferError(raw).display).toBe(
      GENERIC_UNAVAILABLE_OFFER_MESSAGE
    );
    expect(presentUnavailableOfferError(raw).technical).toBe(raw);
  });

  it("rewrites Omniasig real-value message to Romanian", () => {
    const raw = "Household: only real value insurance sum option is available";
    const presented = presentUnavailableOfferError(raw);
    expect(presented.display).toContain("valoare reală");
    expect(presented.technical).toBe(raw);
  });

  it("keeps clear Romanian messages from Grawe or Garanta", () => {
    const grawe =
      "Pe acest produs nu se asigură case din lemn și/sau chirpici!";
    expect(isUserFriendlyRomanianOfferError(grawe)).toBe(true);
    expect(presentUnavailableOfferError(grawe).display).toBe(grawe);

    const garanta = "TipStructura nu are o valoare care sa corespunda cu oferta";
    expect(presentUnavailableOfferError(garanta).display).toContain("Structura");
  });
});
