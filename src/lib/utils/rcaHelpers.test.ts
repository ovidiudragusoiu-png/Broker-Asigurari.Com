import { describe, expect, it } from "vitest";
import {
  buildFullPersonFromFlowState,
  buildRcaDisclosurePopoverLines,
  emptyRcaFlowState,
  mergeLegalDisclosure,
  normalizeRcaOfferLegalDisclosure,
  parseOrderReferenceTariff,
} from "./rcaHelpers";

describe("rcaHelpers", () => {
  it("copies driver licence date into the RCA person request", () => {
    const state = {
      ...emptyRcaFlowState(),
      ownerType: "PF" as const,
      cnpOrCui: "1900720807726",
      email: "alex@example.com",
      ownerFirstName: "Alex",
      ownerLastName: "Cretu",
      idType: "CI" as const,
      idSeries: "IF",
      idNumber: "232322",
      phoneNumber: "0720385551",
      driverLicenceDate: "2008-03-06",
      address: {
        countryId: 185,
        cityId: 1598,
        countyId: 14,
        postalCode: "011454",
        streetTypeId: 11,
        floorId: null,
        addressType: "HOME" as const,
        foreignCountyName: null,
        foreignCityName: null,
        streetName: "Averescu Alexandru, maresal",
        streetNumber: "1",
        building: "B2",
        entrance: "C",
        apartment: "125",
      },
    };

    const person = buildFullPersonFromFlowState(state);

    expect(person.legalType).toBe("PF");
    if (person.legalType !== "PF") {
      throw new Error("Expected PF person request");
    }
    expect(person.driverLicenceDate).toBe("2008-03-06T00:00:00");
    expect(person.idSerial).toBe("IF");
  });

  it("normalizes legal disclosure from offer details shape", () => {
    const disclosure = normalizeRcaOfferLegalDisclosure({
      offerDetails: {
        referenceTariff: 1234.5,
        periodMonths: 12,
        brokerCommission: { amount: 87.3, percent: 12.5 },
        directSettlement: {
          brokerCommission: { amount: 92.1, percent: 12.5 },
        },
      },
    });

    expect(disclosure?.referenceTariff).toBe(1234.5);
    expect(disclosure?.brokerCommission?.amount).toBe(87.3);
    expect(disclosure?.directSettlementBrokerCommission?.amount).toBe(92.1);
  });

  it("builds Romanian popover lines with reference tariff and commission", () => {
    const lines = buildRcaDisclosurePopoverLines({
      vendorName: "Allianz Tiriac",
      disclosures: [
        {
          periodMonths: 12,
          withDirectSettlement: false,
          brokerCommission: { amount: 150, percent: 10 },
        },
      ],
      orderReferenceTariff: 2000,
    });

    const text = lines.map((l) => l.text).join("\n");
    expect(text).toContain("Tarif referință");
    expect(text).toContain("Comision (inclus) Allianz Tiriac");
    expect(text).toContain("150,00 lei");
  });

  it("merges disclosure patches without dropping existing fields", () => {
    const merged = mergeLegalDisclosure(
      { referenceTariff: 100, brokerCommission: { amount: 10 } },
      { brokerCommission: { amount: 12, percent: 5 } }
    );
    expect(merged?.referenceTariff).toBe(100);
    expect(merged?.brokerCommission?.amount).toBe(12);
    expect(merged?.brokerCommission?.percent).toBe(5);
  });

  it("parses order reference tariff v2/v3 object or bare number", () => {
    expect(parseOrderReferenceTariff(1500)).toBe(1500);
    expect(parseOrderReferenceTariff({ referenceTariff: 999 })).toBe(999);
    expect(parseOrderReferenceTariff({ bonusMalus: "B8" })).toBeNull();
  });
});