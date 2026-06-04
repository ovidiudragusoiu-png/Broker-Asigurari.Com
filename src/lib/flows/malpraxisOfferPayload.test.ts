import { describe, expect, it } from "vitest";
import {
  adaptMalpraxisMoralDamagesForProduct,
  buildAbcClaimSpecificDetails,
  buildAbcComparatorSpecificDetails,
  buildComparatorPayloadFromBodiesResponse,
  buildMalpraxisBodiesPayload,
  buildMalpraxisComparatorOfferDetails,
  buildMalpraxisComparatorPayload,
  buildMalpraxisMoralSublimitValues,
  buildMalpraxisOfferDetails,
  buildMalpraxisOfferDetailsForProduct,
  groupMalpraxisEligibilityBatches,
  inferMalpraxisProductCode,
  mergeMalpraxisSpecificDetails,
  normalizeMalpraxisComparatorProxyPayload,
  normalizeMalpraxisPostBody,
  prepareComparatorOfferDetailsFromBody,
} from "./malpraxisOfferPayload";

const baseOfferDetails = buildMalpraxisOfferDetails({
  malpraxisProfessionId: "15",
  category: "MediciSpecialistiSpecialitatiMedicale",
  categoryType: "Hematologie",
  generalLimit: "37000",
  moralDamagesLimit: 10,
  customMoralDamagesLimit: null,
  currency: "EUR",
  operatingAuthorizationType: 0,
  installmentsNo: 1,
  retroactivePeriod: "0",
});

describe("buildMalpraxisOfferDetails", () => {
  it("coerces fields to Insuretech schema types", () => {
    expect(
      buildMalpraxisOfferDetails({
        malpraxisProfessionId: 15,
        category: "MediciSpecialistiSpecialitatiMedicale",
        categoryType: "Hematologie",
        generalLimit: 37000,
        moralDamagesLimit: "10",
        customMoralDamagesLimit: null,
        currency: "EUR",
        operatingAuthorizationType: "0",
        installmentsNo: 1,
        retroactivePeriod: 0,
      })
    ).toEqual({
      malpraxisProfessionId: "15",
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Hematologie",
      generalLimit: "37000",
      moralDamagesLimit: 10,
      customMoralDamagesLimit: 0,
      currency: "EUR",
      operatingAuthorizationType: 0,
      installmentsNo: 1,
      retroactivePeriod: "0",
    });
  });
});

describe("adaptMalpraxisMoralDamagesForProduct", () => {
  it("keeps percentage for Garanta when user selected percent", () => {
    expect(
      adaptMalpraxisMoralDamagesForProduct("GARANTA_MALPRAXIS", baseOfferDetails, {
        moralDamagesLimitCode: "10",
        customMoralDamagesLimit: "",
        generalLimit: "37000",
      })
    ).toEqual({ moralDamagesLimit: 10, customMoralDamagesLimit: 0 });
  });

  it("converts custom amount to percent for Garanta when only sum was entered", () => {
    expect(
      adaptMalpraxisMoralDamagesForProduct("GARANTA_MALPRAXIS", baseOfferDetails, {
        moralDamagesLimitCode: "0",
        customMoralDamagesLimit: "3700",
        generalLimit: "37000",
      })
    ).toEqual({ moralDamagesLimit: 10, customMoralDamagesLimit: 0 });
  });

  it("uses numeric custom for Euroins when user selected percent", () => {
    expect(
      adaptMalpraxisMoralDamagesForProduct("EUROINS_MALPRAXIS", baseOfferDetails, {
        moralDamagesLimitCode: "10",
        customMoralDamagesLimit: "",
        generalLimit: "37000",
      })
    ).toEqual({ moralDamagesLimit: 0, customMoralDamagesLimit: 3700 });
  });

  it("keeps custom amount for Euroins", () => {
    expect(
      adaptMalpraxisMoralDamagesForProduct("EUROINS_MALPRAXIS", baseOfferDetails, {
        moralDamagesLimitCode: "0",
        customMoralDamagesLimit: "2500",
        generalLimit: "37000",
      })
    ).toEqual({ moralDamagesLimit: 0, customMoralDamagesLimit: 2500 });
  });
});

describe("buildMalpraxisMoralSublimitValues", () => {
  it("returns derived amount (not percent) for all insurers — homogeneous sublimit", () => {
    // Regression: the previous "percent-only → '0' sublimit" rule moved Uniqa
    // and Signal_Iduna back to body-parse on the May 27, 2026 screenshot.
    // March 6, 2026 working Garanta comparator (line 38, premium 12 SUCCESS)
    // had moralDamagesLimit=0 and SUBLIMIT="0" (amount=0). We preserve that
    // behavior when moral=0 and emit the derived EUR amount when moral > 0.
    const adapted = { moralDamagesLimit: 10, customMoralDamagesLimit: 0 };
    const selection = { moralDamagesLimitCode: "10", customMoralDamagesLimit: "", generalLimit: "37000" };
    for (const productCode of [
      "UNIQA_MALPRAXIS",
      "GARANTA_MALPRAXIS",
      "OMNIASIG_MALPRAXIS_GENERAL",
      "OMNIASIG_MALPRAXIS_PHARMACIST",
      "ABC_MALPRAXIS",
      "SIGNAL_IDUNA_MALPRAXIS",
      "ASIROM_MALPRAXIS",
      "EUROINS_MALPRAXIS",
    ]) {
      expect(buildMalpraxisMoralSublimitValues(productCode, selection, adapted)).toEqual({
        perEvent: "3700", // 10% of 37000
        perPeriod: "3700",
      });
    }
  });

  it('emits "0" sublimits for any insurer when no moral damage is selected (March 6 working shape)', () => {
    const adapted = { moralDamagesLimit: 0, customMoralDamagesLimit: 0 };
    for (const productCode of [
      "GARANTA_MALPRAXIS",
      "UNIQA_MALPRAXIS",
      "SIGNAL_IDUNA_MALPRAXIS",
      "ASIROM_MALPRAXIS",
    ]) {
      expect(
        buildMalpraxisMoralSublimitValues(
          productCode,
          { moralDamagesLimitCode: "0", customMoralDamagesLimit: "", generalLimit: "37000" },
          adapted
        )
      ).toEqual({ perEvent: "0", perPeriod: "0" });
    }
  });

  it("uses fixed amounts for Euroins (numeric-only)", () => {
    const adapted = { moralDamagesLimit: 0, customMoralDamagesLimit: 3700 };
    expect(
      buildMalpraxisMoralSublimitValues(
        "EUROINS_MALPRAXIS",
        { moralDamagesLimitCode: "0", customMoralDamagesLimit: "3700", generalLimit: "37000" },
        adapted
      )
    ).toEqual({ perEvent: "3700", perPeriod: "3700" });
  });
});

describe("mergeMalpraxisSpecificDetails", () => {
  it("restores general limit when body returns zero", () => {
    const merged = mergeMalpraxisSpecificDetails(
      [{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" }],
      [{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: 0 }],
      "37000"
    );

    expect(merged).toEqual([{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" }]);
  });

  it("restores moral sublimits when body returns zero", () => {
    const merged = mergeMalpraxisSpecificDetails(
      [
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "10" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "10" },
      ],
      [
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: 0 },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: 0 },
      ],
      "37000"
    );

    expect(merged).toEqual([
      { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "10" },
      { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "10" },
    ]);
  });

  it("ignores body specific details when saveError", () => {
    const merged = mergeMalpraxisSpecificDetails(
      [{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" }],
      [{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: 0 }],
      "37000",
      { ignoreBodyValues: true }
    );

    expect(merged).toEqual([{ code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" }]);
  });

  it("stringifies numeric specific detail values", () => {
    const merged = mergeMalpraxisSpecificDetails(
      [],
      [{ code: "OPERATING_LICENSE_TYPE", value: 1 }],
      "37000"
    );

    expect(merged).toEqual([{ code: "OPERATING_LICENSE_TYPE", value: "1" }]);
  });
});

const moralNoneInput = {
  malpraxisProfessionId: "15",
  category: "MediciSpecialistiSpecialitatiMedicale",
  categoryType: "Hematologie",
  generalLimit: "37000",
  moralDamagesLimit: "0",
  customMoralDamagesLimit: "",
  currency: "EUR",
  operatingAuthorizationType: 0,
  installmentsNo: 1,
  retroactivePeriod: "0",
};

const moralTenPercentInput = {
  ...moralNoneInput,
  moralDamagesLimit: "10",
};

describe("live scenarios: Fără vs 10% moral damages", () => {
  it("Fără + Fără retro sends zeros for all insurer modes", () => {
    const selection = { moralDamagesLimitCode: "0", customMoralDamagesLimit: "", generalLimit: "37000" };
    expect(
      buildMalpraxisOfferDetailsForProduct("GARANTA_MALPRAXIS", moralNoneInput, selection)
    ).toMatchObject({ moralDamagesLimit: 0, customMoralDamagesLimit: 0, retroactivePeriod: "0" });
    expect(
      buildMalpraxisOfferDetailsForProduct("EUROINS_MALPRAXIS", moralNoneInput, selection)
    ).toMatchObject({ moralDamagesLimit: 0, customMoralDamagesLimit: 0, retroactivePeriod: "0" });
    expect(
      buildMalpraxisOfferDetailsForProduct("UNIQA_MALPRAXIS", moralNoneInput, selection)
    ).toMatchObject({ moralDamagesLimit: 0, customMoralDamagesLimit: 0, retroactivePeriod: "0" });
  });

  it("10% + Fără retro: percent insurers vs numeric insurers", () => {
    const selection = { moralDamagesLimitCode: "10", customMoralDamagesLimit: "", generalLimit: "37000" };
    expect(
      buildMalpraxisOfferDetailsForProduct("GARANTA_MALPRAXIS", moralTenPercentInput, selection)
    ).toEqual({
      ...buildMalpraxisOfferDetails(moralTenPercentInput),
      moralDamagesLimit: 10,
      customMoralDamagesLimit: 0,
    });
    expect(
      buildMalpraxisOfferDetailsForProduct("UNIQA_MALPRAXIS", moralTenPercentInput, selection)
    ).toMatchObject({ moralDamagesLimit: 10, customMoralDamagesLimit: 0 });
    expect(
      buildMalpraxisOfferDetailsForProduct("EUROINS_MALPRAXIS", moralTenPercentInput, selection)
    ).toMatchObject({ moralDamagesLimit: 0, customMoralDamagesLimit: 3700 });
  });

  it("groups eligibility batches by adapted moral-damage fields", () => {
    const selection = { moralDamagesLimitCode: "10", customMoralDamagesLimit: "", generalLimit: "37000" };
    const batches = groupMalpraxisEligibilityBatches(
      [
        { productId: 1, productCode: "GARANTA_MALPRAXIS" },
        { productId: 2, productCode: "UNIQA_MALPRAXIS" },
        { productId: 3, productCode: "EUROINS_MALPRAXIS" },
        { productId: 4, productCode: "ASIROM_MALPRAXIS" },
      ],
      moralTenPercentInput,
      selection
    );

    expect(batches).toHaveLength(2);
    const percentBatch = batches.find((b) => b.offerDetails.moralDamagesLimit === 10);
    const numericBatch = batches.find((b) => b.offerDetails.customMoralDamagesLimit === 3700);
    expect(percentBatch?.productIds.sort()).toEqual(["1", "2"]);
    expect(numericBatch?.productIds.sort()).toEqual(["3", "4"]);
  });
});

describe("inferMalpraxisProductCode", () => {
  it("maps vendor names to product codes", () => {
    expect(inferMalpraxisProductCode("Garanta", "Malpraxis")).toBe("GARANTA_MALPRAXIS");
    expect(inferMalpraxisProductCode("Euroins", "Malpraxis")).toBe("EUROINS_MALPRAXIS");
    expect(inferMalpraxisProductCode("Omniasig", "Malpraxis Farmacist")).toBe(
      "OMNIASIG_MALPRAXIS_PHARMACIST"
    );
    expect(inferMalpraxisProductCode("Omniasig", "Malpraxis General")).toBe(
      "OMNIASIG_MALPRAXIS_GENERAL"
    );
  });
});

describe("buildMalpraxisBodiesPayload", () => {
  it("coerces productIds to numbers and emits the March 6 working wire shape", () => {
    const payload = buildMalpraxisBodiesPayload({
      orderId: 812070,
      productIds: ["47", "79"],
      policyStartDate: "2026-03-11T00:00:00",
      policyEndDate: "2027-03-10T00:00:00",
      offerDetails: {
        malpraxisProfessionId: 15,
        generalLimit: 37000,
        customMoralDamagesLimit: null,
        operatingAuthorizationType: "0",
        retroactivePeriod: 0,
      },
      specificDetails: [{ code: "OPERATING_LICENSE_TYPE", value: 1 }],
    });

    expect(payload.productIds).toEqual([47, 79]);
    // Empirically verified against successful March 6 traffic
    // (.codex-logs/malpraxis-dev.log lines 35 + 38): numbers for
    // profession/limit/retro, string for operatingAuthorizationType,
    // null for an unused customMoralDamagesLimit.
    expect(payload.offerDetails).toMatchObject({
      malpraxisProfessionId: 15,
      generalLimit: 37000,
      customMoralDamagesLimit: null,
      operatingAuthorizationType: "0",
      retroactivePeriod: 0,
    });
    expect(payload.specificDetails).toEqual([
      { code: "OPERATING_LICENSE_TYPE", value: "1" },
    ]);
  });
});

describe("prepareComparatorOfferDetailsFromBody", () => {
  it("keeps bodies/v3 offerDetails shape and null custom moral when unused", () => {
    const bodiesOfferDetails = {
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: null,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    };

    expect(
      prepareComparatorOfferDetailsFromBody(bodiesOfferDetails, "GARANTA_MALPRAXIS", {
        moralDamagesLimitCode: "0",
        customMoralDamagesLimit: "",
        generalLimit: "37000",
      })
    ).toEqual({
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: null,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    });
  });

  it("adapts only moral fields for Euroins percent selection", () => {
    const bodiesOfferDetails = {
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: null,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    };

    expect(
      prepareComparatorOfferDetailsFromBody(bodiesOfferDetails, "EUROINS_MALPRAXIS", {
        moralDamagesLimitCode: "10",
        customMoralDamagesLimit: "",
        generalLimit: "37000",
      })
    ).toMatchObject({
      malpraxisProfessionId: 8,
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: 3700,
      operatingAuthorizationType: "0",
      retroactivePeriod: 0,
    });
  });
});

describe("buildMalpraxisComparatorOfferDetails", () => {
  it("emits the empirically-verified comparator/v3 wire shape", () => {
    // March 6 2026 successful Garanta request: numbers for profession/limit/retro,
    // string for operatingAuthorizationType, null for unused customMoralDamagesLimit.
    expect(
      buildMalpraxisComparatorOfferDetails({
        malpraxisProfessionId: "15",
        category: "MediciSpecialistiSpecialitatiMedicale",
        categoryType: "Hematologie",
        generalLimit: "37000",
        moralDamagesLimit: 5,
        customMoralDamagesLimit: 0,
        currency: "EUR",
        operatingAuthorizationType: 0,
        installmentsNo: 1,
        retroactivePeriod: "0",
      })
    ).toEqual({
      malpraxisProfessionId: 15,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Hematologie",
      generalLimit: 37000,
      moralDamagesLimit: 5,
      customMoralDamagesLimit: null,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
      retroactivePeriod: 0,
    });
  });
});

describe("normalizeMalpraxisComparatorProxyPayload", () => {
  it("emits the March 6 working wire shape and keeps agencyId/productCode/saveError", () => {
    const payload = normalizeMalpraxisComparatorProxyPayload({
      orderId: 812070,
      productId: 47,
      agencyId: null,
      saveError: true,
      productCode: "ASIROM_MALPRAXIS",
      policyStartDate: "2026-03-11T00:00:00",
      policyEndDate: "2027-03-10T00:00:00",
      offerDetails: {
        malpraxisProfessionId: 15,
        generalLimit: 37000,
        moralDamagesLimit: 10,
        customMoralDamagesLimit: null,
        operatingAuthorizationType: "0",
        retroactivePeriod: 0,
      },
      specificDetails: [
        { code: "OPERATING_LICENSE_TYPE", value: 1 },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: 0 },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: 0 },
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: 0 },
      ],
    });

    expect(payload.saveError).toBe(true);
    expect(payload.productCode).toBe("ASIROM_MALPRAXIS");
    expect(payload.agencyId).toBeNull();
    expect(payload.offerDetails).toMatchObject({
      malpraxisProfessionId: 15,
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: 3700,
      operatingAuthorizationType: "0",
      retroactivePeriod: 0,
    });
    expect(payload.specificDetails).toEqual(
      expect.arrayContaining([
        { code: "OPERATING_LICENSE_TYPE", value: "1" },
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "3700" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "3700" },
      ])
    );
  });
});

describe("normalizeMalpraxisPostBody", () => {
  it("rewrites comparator/v3 JSON in the proxy to match March 6 working wire shape", () => {
    const raw = JSON.stringify({
      orderId: 1,
      productId: 47,
      agencyId: null,
      saveError: true,
      productCode: "ASIROM_MALPRAXIS",
      offerDetails: {
        malpraxisProfessionId: 15,
        generalLimit: 37000,
        moralDamagesLimit: 0,
        customMoralDamagesLimit: null,
        operatingAuthorizationType: "0",
        retroactivePeriod: 0,
        installmentsNo: 1,
        currency: "EUR",
      },
      specificDetails: [{ code: "OPERATING_LICENSE_TYPE", value: 1 }],
    });
    const normalized = JSON.parse(
      normalizeMalpraxisPostBody("online/offers/malpraxis/comparator/v3", raw)
    );
    expect(normalized.saveError).toBe(true);
    expect(normalized.productCode).toBe("ASIROM_MALPRAXIS");
    expect(normalized.agencyId).toBeNull();
    expect(normalized.offerDetails.generalLimit).toBe(37000);
    expect(normalized.offerDetails.malpraxisProfessionId).toBe(15);
    expect(normalized.offerDetails.customMoralDamagesLimit).toBeNull();
    expect(normalized.offerDetails.operatingAuthorizationType).toBe("0");
    expect(normalized.offerDetails.retroactivePeriod).toBe(0);
  });
});

describe("buildComparatorPayloadFromBodiesResponse", () => {
  it("forwards empty specificDetails when bodies returned [] (March 6 Garanta success)", () => {
    const payload = buildComparatorPayloadFromBodiesResponse(
      {
        orderId: 812070,
        productId: 1218,
        agencyId: null,
        productCode: "GARANTA_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 15,
          category: "MediciSpecialistiSpecialitatiMedicale",
          categoryType: "Hematologie",
          generalLimit: 37000,
          moralDamagesLimit: 10,
          retroactivePeriod: 0,
          currency: "EUR",
          operatingAuthorizationType: "0",
          installmentsNo: 1,
        },
        specificDetails: [],
      },
      { moralDamagesLimitCode: "10", customMoralDamagesLimit: "", generalLimit: "37000" }
    );

    expect(payload.specificDetails).toEqual([]);
    expect(payload.offerDetails).toMatchObject({
      moralDamagesLimit: 10,
      customMoralDamagesLimit: null,
    });
  });
});

describe("buildMalpraxisComparatorPayload", () => {
  it("keeps agencyId/productCode/saveError and adapts moral fields from bodies offerDetails", () => {
    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812070,
        productId: 79,
        agencyId: null,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        productCode: "UNIQA_MALPRAXIS",
        saveError: true,
        offerDetails: {
          malpraxisProfessionId: 15,
          generalLimit: 37000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          operatingAuthorizationType: "0",
          installmentsNo: 1,
          currency: "EUR",
        },
        specificDetails: [],
      },
      baseOfferDetails,
      undefined,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "10",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    expect(payload.saveError).toBe(true);
    expect(payload.productCode).toBe("UNIQA_MALPRAXIS");
    expect(payload.agencyId).toBeNull();
    expect(payload.offerDetails).toMatchObject({
      malpraxisProfessionId: 15,
      generalLimit: 37000,
      moralDamagesLimit: 10,
      customMoralDamagesLimit: null,
      operatingAuthorizationType: "0",
      retroactivePeriod: 0,
    });
    expect(payload.specificDetails).toEqual([]);
  });

  it("passes through Garanta bodies offerDetails with empty specificDetails (March 6)", () => {
    const bodiesOfferDetails = {
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    };

    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812078,
        productId: 1218,
        agencyId: null,
        productCode: "GARANTA_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: bodiesOfferDetails,
        specificDetails: [],
      },
      baseOfferDetails,
      undefined,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    expect(payload.offerDetails).toEqual({
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: null,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    });
    expect(payload.specificDetails).toEqual([]);
    expect(payload.productCode).toBe("GARANTA_MALPRAXIS");
    expect(payload.saveError).toBe(true);
    expect(payload.agencyId).toBeNull();
  });

  it("matches March 2026 successful Garanta comparator shape from malpraxis-dev.log", () => {
    const bodiesOfferDetails = {
      malpraxisProfessionId: 8,
      category: "MediciSpecialistiSpecialitatiMedicale",
      categoryType: "Endocrinologie",
      generalLimit: 37000,
      moralDamagesLimit: 0,
      retroactivePeriod: 0,
      currency: "EUR",
      operatingAuthorizationType: "0",
      installmentsNo: 1,
    };

    const clientPayload = buildMalpraxisComparatorPayload(
      {
        orderId: 812078,
        productId: 1218,
        agencyId: null,
        productCode: "GARANTA_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: bodiesOfferDetails,
        specificDetails: [],
      },
      baseOfferDetails,
      undefined,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    const upstream = JSON.parse(
      normalizeMalpraxisPostBody(
        "online/offers/malpraxis/comparator/v3",
        JSON.stringify(clientPayload)
      )
    );

    expect(upstream).toEqual({
      orderId: 812078,
      productId: 1218,
      agencyId: null,
      policyStartDate: "2026-03-11T00:00:00",
      policyEndDate: "2027-03-10T00:00:00",
      offerDetails: {
        malpraxisProfessionId: 8,
        category: "MediciSpecialistiSpecialitatiMedicale",
        categoryType: "Endocrinologie",
        generalLimit: 37000,
        moralDamagesLimit: 0,
        customMoralDamagesLimit: null,
        retroactivePeriod: 0,
        currency: "EUR",
        operatingAuthorizationType: "0",
        installmentsNo: 1,
      },
      productCode: "GARANTA_MALPRAXIS",
      specificDetails: [],
      saveError: true,
    });
  });

  it("drops client-injected specificDetails when bodies returned [] (May 27 regression)", () => {
    const upstream = JSON.parse(
      normalizeMalpraxisPostBody(
        "online/offers/malpraxis/comparator/v3",
        JSON.stringify(
          buildMalpraxisComparatorPayload(
            {
              orderId: 824648,
              productId: 1218,
              productCode: "GARANTA_MALPRAXIS",
              saveError: true,
              policyStartDate: "2026-05-29T00:00:00",
              policyEndDate: "2027-05-28T00:00:00",
              offerDetails: {
                malpraxisProfessionId: 4,
                generalLimit: 37000,
                moralDamagesLimit: 0,
                retroactivePeriod: 0,
                operatingAuthorizationType: "0",
                installmentsNo: 1,
                currency: "EUR",
              },
              specificDetails: [],
            },
            baseOfferDetails,
            undefined,
            {
              moralDamagesSelection: {
                moralDamagesLimitCode: "0",
                customMoralDamagesLimit: "",
                generalLimit: "37000",
              },
            }
          )
        )
      )
    );

    expect(upstream.specificDetails).toEqual([]);
    expect(upstream.offerDetails.malpraxisProfessionId).toBe(4);
    expect(upstream.offerDetails.generalLimit).toBe(37000);
  });

  it("rewrites moral sublimits only when bodies included SUBLIMIT codes (Asirom)", () => {
    const failingMay27 = {
      orderId: 824570,
      productId: 47,
      productCode: "ASIROM_MALPRAXIS",
      saveError: true,
      policyStartDate: "2026-05-30T00:00:00",
      policyEndDate: "2027-05-29T00:00:00",
      offerDetails: {
        malpraxisProfessionId: 15,
        generalLimit: 37000,
        moralDamagesLimit: 5,
        retroactivePeriod: 0,
        operatingAuthorizationType: "0",
        installmentsNo: 1,
        currency: "EUR",
      },
      specificDetails: [
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: 0 },
        { code: "OPERATING_LICENSE_TYPE", value: 1 },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: 0 },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: 0 },
      ],
    };

    const upstream = JSON.parse(
      normalizeMalpraxisPostBody(
        "online/offers/malpraxis/comparator/v3",
        JSON.stringify(failingMay27)
      )
    );

    expect(upstream.specificDetails).toEqual(
      expect.arrayContaining([
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
        { code: "OPERATING_LICENSE_TYPE", value: "1" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "1850" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "1850" },
      ])
    );
    expect(upstream.offerDetails.moralDamagesLimit).toBe(0);
    expect(upstream.offerDetails.customMoralDamagesLimit).toBe(1850);
  });

  it("recovers from May 27 failing payload shape (string types) and emits working wire shape", () => {
    // Reproduces the actual failing comparator/v3 request body from
    // terminal 792217.txt line 58 (May 27, 2026 traceId 7578cc04 → 500
    // "Problem reading request body. Check ... format for date or numeric fields").
    const failingPayloadFromMay27 = {
      orderId: 824570,
      productId: 1218,
      policyStartDate: "2026-05-30T00:00:00",
      policyEndDate: "2027-05-29T00:00:00",
      offerDetails: {
        malpraxisProfessionId: "15",
        category: "MediciSpecialistiSpecialitatiMedicale",
        categoryType: "Hematologie",
        generalLimit: "37000",
        moralDamagesLimit: 5,
        customMoralDamagesLimit: 0,
        currency: "EUR",
        operatingAuthorizationType: 0,
        installmentsNo: 1,
        retroactivePeriod: "0",
      },
      specificDetails: [
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
        { code: "OPERATING_LICENSE_TYPE", value: "0" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "5" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "5" },
        { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
        { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
      ],
    };

    const upstream = JSON.parse(
      normalizeMalpraxisPostBody(
        "online/offers/malpraxis/comparator/v3",
        JSON.stringify(failingPayloadFromMay27)
      )
    );

    expect(upstream.offerDetails.malpraxisProfessionId).toBe(15);
    expect(upstream.offerDetails.generalLimit).toBe(37000);
    expect(upstream.offerDetails.retroactivePeriod).toBe(0);
    expect(upstream.offerDetails.operatingAuthorizationType).toBe("0");
    expect(upstream.offerDetails.customMoralDamagesLimit).toBeNull();
    expect(upstream.offerDetails.moralDamagesLimit).toBe(5);
    expect(upstream.productCode).toBe("GARANTA_MALPRAXIS");
    expect(upstream.agencyId).toBeNull();
    // Default-true when missing on the wire (March 6 working state).
    expect(upstream.saveError).toBe(true);
  });

  it("stringifies Asirom numeric specificDetails from bodies and keeps internals", () => {
    const clientPayload = buildMalpraxisComparatorPayload(
      {
        orderId: 812078,
        productId: 47,
        productCode: "ASIROM_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 8,
          category: "MediciSpecialistiSpecialitatiMedicale",
          categoryType: "Endocrinologie",
          generalLimit: 37000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          currency: "EUR",
          operatingAuthorizationType: "0",
          installmentsNo: 1,
        },
        specificDetails: [
          { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: 0 },
          { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: 0 },
          { code: "EVENT_LIMIT_INSURED_AMOUNT", value: 0 },
          { code: "OPERATING_LICENSE_TYPE", value: 1 },
        ],
      },
      baseOfferDetails,
      undefined,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    const upstream = JSON.parse(
      normalizeMalpraxisPostBody(
        "online/offers/malpraxis/comparator/v3",
        JSON.stringify(clientPayload)
      )
    );

    expect(upstream.offerDetails.malpraxisProfessionId).toBe(8);
    expect(upstream.productCode).toBe("ASIROM_MALPRAXIS");
    expect(upstream.saveError).toBe(true);
    expect(upstream.specificDetails).toEqual(
      expect.arrayContaining([
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
        { code: "OPERATING_LICENSE_TYPE", value: "1" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "0" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "0" },
      ])
    );
  });

  it("adapts Euroins to numeric moral damages with empty bodies specificDetails", () => {
    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812070,
        productId: 195,
        productCode: "EUROINS_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 15,
          category: "MediciSpecialistiSpecialitatiMedicale",
          categoryType: "Hematologie",
          generalLimit: 37000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          currency: "EUR",
          operatingAuthorizationType: "0",
          installmentsNo: 1,
        },
        specificDetails: [],
      },
      baseOfferDetails,
      undefined,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "10",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    expect(payload.offerDetails).toMatchObject({
      malpraxisProfessionId: 15,
      generalLimit: 37000,
      moralDamagesLimit: 0,
      customMoralDamagesLimit: 3700,
      operatingAuthorizationType: "0",
      retroactivePeriod: 0,
    });
    expect(payload.specificDetails).toEqual([]);
  });

  it("keeps ABC bodies specificDetails only (PRIOR/PREVIOUS), drops null booleans", () => {
    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812078,
        productId: 1374,
        productCode: "ABC_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 8,
          generalLimit: 37000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          operatingAuthorizationType: "0",
          installmentsNo: 1,
          currency: "EUR",
        },
        specificDetails: [
          { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
          { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
          { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: false },
        ],
      },
      baseOfferDetails,
      [],
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    expect(payload.specificDetails).toEqual([
      { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: "false" },
      { code: "REGISTERED_COMPENSATION_CLAIMS", value: "false" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
    ]);
  });

  it("coerces ABC bodies boolean specificDetails to NU/DA strings (registeredCompensationClaims NPE)", () => {
    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812065,
        productId: 1374,
        productCode: "ABC_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 1,
          category: "General",
          categoryType: "MediciFamilieMediciMedicinaGenerala",
          generalLimit: 12000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          operatingAuthorizationType: "0",
          installmentsNo: 1,
          currency: "EUR",
        },
        specificDetails: [
          { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: false },
          { code: "PREVIOUS_CIVIL_LIABILITY", value: false },
          { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: null },
        ],
      },
      baseOfferDetails,
      [],
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "12000",
        },
      }
    );

    expect(payload.specificDetails).toEqual([
      { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: "false" },
      { code: "REGISTERED_COMPENSATION_CLAIMS", value: "false" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
    ]);
  });

  it("uses client PRIOR/PREVIOUS when ABC bodies specificDetails is empty", () => {
    const clientSpecificDetails = [
      { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "DA" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "DA" },
    ];

    const payload = buildMalpraxisComparatorPayload(
      {
        orderId: 812067,
        productId: 1374,
        productCode: "ABC_MALPRAXIS",
        saveError: true,
        policyStartDate: "2026-03-11T00:00:00",
        policyEndDate: "2027-03-10T00:00:00",
        offerDetails: {
          malpraxisProfessionId: 15,
          generalLimit: 37000,
          moralDamagesLimit: 0,
          retroactivePeriod: 0,
          operatingAuthorizationType: "0",
          installmentsNo: 1,
          currency: "EUR",
        },
        specificDetails: [],
      },
      baseOfferDetails,
      clientSpecificDetails,
      {
        moralDamagesSelection: {
          moralDamagesLimitCode: "0",
          customMoralDamagesLimit: "",
          generalLimit: "37000",
        },
      }
    );

    expect(payload.specificDetails).toEqual([
      { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: "true" },
      { code: "REGISTERED_COMPENSATION_CLAIMS", value: "true" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "DA" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "DA" },
    ]);
  });
});

describe("buildAbcComparatorSpecificDetails", () => {
  it("always emits utils booleans and DA/NU wire codes", () => {
    expect(buildAbcComparatorSpecificDetails([], [])).toEqual([
      { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: "false" },
      { code: "REGISTERED_COMPENSATION_CLAIMS", value: "false" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
    ]);
  });
});

describe("buildAbcClaimSpecificDetails", () => {
  it("emits utils booleans and comparator DA/NU pairs", () => {
    expect(
      buildAbcClaimSpecificDetails({
        knowledgeCompensationClaims: true,
        registeredCompensationClaims: false,
      })
    ).toEqual([
      { code: "KNOWLEDGE_COMPENSATION_CLAIMS", value: "true" },
      { code: "REGISTERED_COMPENSATION_CLAIMS", value: "false" },
      { code: "PREVIOUS_CIVIL_LIABILITY", value: "DA" },
      { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
    ]);
  });
});
