import { describe, expect, it } from "vitest";
import {
  adjustHouseComparatorBody,
  garantaContentSumForApi,
  isGarantaHouseBody,
  isOmniasigHouseBody,
  omniasigFloorsForApi,
} from "./houseOfferBodyAdjustments";

describe("houseOfferBodyAdjustments", () => {
  it("maps parter 0 floors to 1 for Omniasig only", () => {
    const omniasigBody = {
      productCode: "OMNIASIG_GARANT_SUMMUM",
      offerDetails: { noOfFloors: 0, contentInsuredSum: 5000 },
      goodDetails: { noOfFloors: 0 },
    };
    const garantaBody = {
      productCode: "GARANTA_GOLD_HOUSE",
      offerDetails: { noOfFloors: 0 },
    };

    const omni = adjustHouseComparatorBody(omniasigBody, {
      noOfFloors: 0,
      buildingSum: 80000,
      contentSum: 5000,
    });
    const garanta = adjustHouseComparatorBody(garantaBody, {
      noOfFloors: 0,
      buildingSum: 80000,
      contentSum: 5000,
    });

    expect(omni.offerDetails).toMatchObject({ noOfFloors: 1 });
    expect(omni.goodDetails).toMatchObject({ noOfFloors: 1 });
    expect(garanta.offerDetails).toMatchObject({ noOfFloors: 0 });
  });

  it("keeps P+1 as 1 for Omniasig", () => {
    expect(omniasigFloorsForApi(1)).toBe(1);
    const body = adjustHouseComparatorBody(
      { productName: "Omniasig Garant", offerDetails: { noOfFloors: 1 } },
      { noOfFloors: 1, buildingSum: 80000, contentSum: 8000 }
    );
    expect(body.offerDetails).toMatchObject({ noOfFloors: 1 });
  });

  it("forces Garanta content to 10% of building", () => {
    expect(garantaContentSumForApi(80000)).toBe(8000);
    const body = adjustHouseComparatorBody(
      { vendorName: "Garanta", offerDetails: { contentInsuredSum: 5000 } },
      { noOfFloors: 0, buildingSum: 80000, contentSum: 5000 }
    );
    expect(body.offerDetails).toMatchObject({ contentInsuredSum: 8000 });
  });

  it("detects insurers from product metadata", () => {
    expect(isOmniasigHouseBody({ productCode: "OMNIASIG_TEST" })).toBe(true);
    expect(isGarantaHouseBody({ productCode: "GARANTA_GOLD_HOUSE" })).toBe(true);
  });
});
