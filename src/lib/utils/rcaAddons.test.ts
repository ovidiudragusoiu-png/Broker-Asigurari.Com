import { describe, expect, it } from "vitest";
import {
  buildAddonOffersCacheKey,
  buildAddonSelectionKey,
  parseAddonSelectionKey,
  sumSelectedAddonPremiums,
  formatAddonOfferSubtext,
  filterAddonOffersForRequestedPeriods,
  filterAdditionalProductsForVendor,
  getAddonProductDisplayName,
  getAddonPrefetchVariantsForTab,
  getAddonQuotePeriodMonths,
  groupAdditionalProductsByVendor,
  hasQuotableAddonOffers,
  RCA_ADDON_PREVIEW_PRODUCT_LIMIT,
  normalizeRcaAdditionalOffer,
  normalizeRcaAdditionalProduct,
  normalizeRcaAdditionalOffers,
  parseRcaAdditionalCatalogResponse,
  pickAdditionalOfferForPeriod,
  resolveSelectedAddons,
  vendorNamesMatch,
} from "./rcaAddons";
import { applyVendorDisplayNameOverrides } from "@/lib/config/rcaAddonDisplayNames";
import type { RcaAdditionalOffer, RcaAdditionalProduct } from "@/types/rcaAddons";

describe("rcaAddons", () => {
  const product: RcaAdditionalProduct = {
    id: 10,
    productName: "Road Assist",
    productType: "ADD",
    productSubType: null,
    vendorProductType: "ROAD_ASSIST",
    insuranceClass: "A",
    vat: 19,
    vendorDetails: {
      id: 1,
      name: "Grawe",
      commercialName: "Grawe",
      linkLogo: "",
    },
  };

  it("normalizes catalog rows", () => {
    const normalized = normalizeRcaAdditionalProduct({
      id: 10,
      productName: "Road Assist",
      vendorProductType: "ROAD_ASSIST",
      vendorDetails: { commercialName: "Grawe" },
    });
    expect(normalized?.id).toBe(10);
    expect(normalized?.vendorProductType).toBe("ROAD_ASSIST");
  });

  it("filters products by vendor name", () => {
    const filtered = filterAdditionalProductsForVendor([product], "Grawe");
    expect(filtered).toHaveLength(1);
    expect(filterAdditionalProductsForVendor([product], "Other")).toHaveLength(0);
  });

  it("matches vendor names with prefix overlap", () => {
    expect(
      vendorNamesMatch("Generali", "Generali Asigurari", "Generali Romania")
    ).toBe(true);
    expect(vendorNamesMatch("Grawe", "Other", "Other")).toBe(false);
  });

  it("filters by vendorDetails id when provided", () => {
    const filtered = filterAdditionalProductsForVendor([product], "", 1);
    expect(filtered).toHaveLength(1);
    expect(filterAdditionalProductsForVendor([product], "", 99)).toHaveLength(0);
  });

  it("parses catalog from array or envelope", () => {
    expect(parseRcaAdditionalCatalogResponse([{ id: 1 }])).toHaveLength(1);
    expect(
      parseRcaAdditionalCatalogResponse({ data: [{ id: 2 }] })
    ).toHaveLength(1);
    expect(parseRcaAdditionalCatalogResponse(null)).toHaveLength(0);
  });

  it("picks offer for requested period only", () => {
    const offers: RcaAdditionalOffer[] = [
      {
        id: 1,
        orderId: 1,
        policyPremium: 50,
        currency: "RON",
        periodMonths: 6,
        error: false,
        message: null,
        productDetails: product,
      },
      {
        id: 2,
        orderId: 1,
        policyPremium: 90,
        currency: "RON",
        periodMonths: 12,
        error: false,
        message: null,
        productDetails: product,
      },
    ];
    expect(pickAdditionalOfferForPeriod(offers, 12)?.id).toBe(2);
    expect(pickAdditionalOfferForPeriod(offers, 3)).toBeNull();
  });

  it("normalizes offers when API uses product instead of productDetails", () => {
    const normalized = normalizeRcaAdditionalOffer(
      {
        id: 501,
        orderId: 1,
        policyPremium: 40,
        periodMonths: 6,
        error: false,
        product: {
          id: 10,
          productName: "Road Assist",
          vendorProductType: "ROAD_ASSIST",
          vendorDetails: { commercialName: "Grawe" },
        },
      },
      product
    );
    expect(normalized?.id).toBe(501);
    expect(normalized?.periodMonths).toBe(6);
    expect(normalized?.productDetails.vendorProductType).toBe("ROAD_ASSIST");
  });

  it("normalizes offer arrays with catalog fallback", () => {
    const offers = normalizeRcaAdditionalOffers(
      [
        {
          id: 77,
          policyPremium: 25,
          periodMonths: 12,
          product: { id: 10, productName: "Road Assist" },
        },
      ],
      product
    );
    expect(offers).toHaveLength(1);
    expect(offers[0]?.periodMonths).toBe(12);
  });

  it("filters offers to requested tab periods", () => {
    const offers: RcaAdditionalOffer[] = [
      {
        id: 1,
        orderId: 1,
        policyPremium: 50,
        currency: "RON",
        periodMonths: 6,
        error: false,
        message: null,
        productDetails: product,
      },
      {
        id: 2,
        orderId: 1,
        policyPremium: 90,
        currency: "RON",
        periodMonths: 12,
        error: false,
        message: null,
        productDetails: product,
      },
    ];
    expect(
      filterAddonOffersForRequestedPeriods(offers, ["6"]).map((o) => o.id)
    ).toEqual([1]);
  });

  it("returns eligible addon periods for 6/12 tabs only", () => {
    expect(getAddonQuotePeriodMonths(["6", "12"])).toEqual(["6", "12"]);
    expect(getAddonQuotePeriodMonths(["1", "2", "3"])).toBeNull();
  });

  it("prefetches only visible keys for each offer tab", () => {
    expect(getAddonPrefetchVariantsForTab("short")).toEqual([]);
    expect(getAddonPrefetchVariantsForTab("standard")).toEqual([
      { period: "6", withDirectSettlement: false },
      { period: "12", withDirectSettlement: false },
    ]);
    expect(getAddonPrefetchVariantsForTab("direct")).toEqual([
      { period: "6", withDirectSettlement: true },
      { period: "12", withDirectSettlement: true },
    ]);
  });

  it("keeps preview quote size in speed-safe range", () => {
    expect(RCA_ADDON_PREVIEW_PRODUCT_LIMIT).toBeGreaterThanOrEqual(3);
    expect(RCA_ADDON_PREVIEW_PRODUCT_LIMIT).toBeLessThanOrEqual(5);
  });

  it("builds offers cache keys per period and settlement mode (order-wide)", () => {
    expect(buildAddonOffersCacheKey("6", false)).toBe("6|std");
    expect(buildAddonOffersCacheKey("6", true)).toBe("6|dd");
    expect(buildAddonOffersCacheKey("12", false)).toBe("12|std");
    expect(buildAddonOffersCacheKey("12", true)).toBe("12|dd");
  });

  it("builds unique cache keys for all addon variants", () => {
    const keys = new Set([
      buildAddonOffersCacheKey("6", false),
      buildAddonOffersCacheKey("6", true),
      buildAddonOffersCacheKey("12", false),
      buildAddonOffersCacheKey("12", true),
    ]);
    expect(keys.size).toBe(4);
  });

  it("builds selection keys per RCA vendor card + period + tab", () => {
    expect(buildAddonSelectionKey("Generali", "12", false)).toBe(
      "generali|12|std"
    );
    expect(buildAddonSelectionKey("Allianz-Tiriac", "6", true)).toBe(
      "allianz tiriac|6|dd"
    );
    expect(parseAddonSelectionKey("generali|12|std")).toEqual({
      vendorName: "generali",
      period: "12",
      withDirectSettlement: false,
    });
  });

  it("uses commercial productName for display label", () => {
    expect(
      getAddonProductDisplayName({
        ...product,
        productName: "Asistenta Rutiera BasicPlus",
      })
    ).toBe("Asistenta Rutiera BasicPlus");
  });

  it("groups catalog products by supplementary vendor", () => {
    const colonnade: RcaAdditionalProduct = {
      ...product,
      id: 11,
      vendorDetails: { ...product.vendorDetails, id: 2, commercialName: "COLONNADE" },
    };
    const groups = groupAdditionalProductsByVendor([product, colonnade]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.vendorLabel).sort()).toEqual([
      "COLONNADE",
      "Grawe",
    ]);
  });

  it("detects quotable offers for a period", () => {
    const offersByProductId = new Map<number, RcaAdditionalOffer[]>([
      [
        10,
        [
          {
            id: 1,
            orderId: 1,
            policyPremium: 50,
            currency: "RON",
            periodMonths: 6,
            error: false,
            message: null,
            productDetails: product,
          },
        ],
      ],
    ]);
    expect(hasQuotableAddonOffers(offersByProductId, 6)).toBe(true);
    expect(hasQuotableAddonOffers(offersByProductId, 12)).toBe(false);
  });

  it("sums selected addon premiums for one period", () => {
    const offersByProductId = new Map<number, RcaAdditionalOffer[]>([
      [
        10,
        [
          {
            id: 99,
            orderId: 1,
            policyPremium: 90,
            currency: "RON",
            periodMonths: 12,
            error: false,
            message: null,
            productDetails: product,
          },
        ],
      ],
    ]);
    expect(sumSelectedAddonPremiums(offersByProductId, [10], 12)).toBe(90);
    expect(sumSelectedAddonPremiums(offersByProductId, [10], 6)).toBe(0);
  });

  it("formats offer subtext with start date and validity", () => {
    const subtext = formatAddonOfferSubtext({
      id: 1,
      orderId: 1,
      policyPremium: 50,
      currency: "RON",
      periodMonths: 6,
      policyStartDate: "2026-06-01T00:00:00.000Z",
      error: false,
      message: null,
      productDetails: product,
    });
    expect(subtext).toContain("Valabilitate: 6 luni");
    expect(subtext).toContain("Început:");
  });

  it("resolves selected addons to offer ids", () => {
    const offersByProductId = new Map<number, RcaAdditionalOffer[]>([
      [
        10,
        [
          {
            id: 99,
            orderId: 1,
            policyPremium: 90,
            currency: "RON",
            periodMonths: 12,
            error: false,
            message: null,
            productDetails: product,
          },
        ],
      ],
    ]);
    const resolved = resolveSelectedAddons(offersByProductId, [10], 12);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.offerId).toBe(99);
  });

  it("resolveSelectedAddons uses vendor display overrides for labels", () => {
    const axeriaProduct: RcaAdditionalProduct = {
      ...product,
      id: 20,
      productName: "Accident",
      vendorProductType: "ACC_PERS",
      vendorDetails: {
        id: 5,
        name: "Axeria",
        commercialName: "AXERIA",
        linkLogo: "",
      },
    };
    const offersByProductId = new Map<number, RcaAdditionalOffer[]>([
      [
        20,
        [
          {
            id: 200,
            orderId: 1,
            policyPremium: 55,
            currency: "RON",
            periodMonths: 12,
            error: false,
            message: null,
            productDetails: axeriaProduct,
          },
        ],
      ],
    ]);
    const resolved = resolveSelectedAddons(offersByProductId, [20], 12);
    expect(resolved[0]?.label).toBe("Accidente Persoane");
    expect(
      applyVendorDisplayNameOverrides(offersByProductId, 12).get(20)
    ).toBe("Accidente Persoane");
  });
});
