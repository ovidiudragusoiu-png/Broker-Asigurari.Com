import { describe, expect, it } from "vitest";
import {
  applyVendorDisplayNameOverrides,
  getAddonDisplayLabel,
  sortVendorGroupProducts,
} from "./rcaAddonDisplayNames";
import type { RcaAdditionalOffer, RcaAdditionalProduct } from "@/types/rcaAddons";

function makeProduct(
  overrides: Partial<RcaAdditionalProduct> & Pick<RcaAdditionalProduct, "id">
): RcaAdditionalProduct {
  return {
    id: overrides.id,
    productName: overrides.productName ?? "Product",
    productType: overrides.productType ?? "ADD",
    productSubType: overrides.productSubType ?? null,
    vendorProductType: overrides.vendorProductType ?? "ROAD_ASSIST",
    insuranceClass: "A",
    vat: 19,
    vendorDetails: {
      id: overrides.vendorDetails?.id ?? 1,
      name: overrides.vendorDetails?.name ?? "Vendor",
      commercialName:
        overrides.vendorDetails?.commercialName ?? "Vendor",
      linkLogo: "",
    },
  };
}

function makeOffer(
  product: RcaAdditionalProduct,
  premium: number,
  periodMonths = 12
): RcaAdditionalOffer {
  return {
    id: product.id * 100 + periodMonths,
    orderId: 1,
    policyPremium: premium,
    currency: "RON",
    periodMonths,
    error: false,
    message: null,
    productDetails: product,
  };
}

function offersMap(
  pairs: Array<{ product: RcaAdditionalProduct; premium: number }>
): Map<number, RcaAdditionalOffer[]> {
  const map = new Map<number, RcaAdditionalOffer[]>();
  for (const { product, premium } of pairs) {
    map.set(product.id, [makeOffer(product, premium)]);
  }
  return map;
}

describe("rcaAddonDisplayNames", () => {
  it("renames Axeria accident products to Accidente Persoane", () => {
    const product = makeProduct({
      id: 1,
      productName: "Accident",
      vendorProductType: "ACC_PERS",
      vendorDetails: {
        id: 10,
        name: "Axeria",
        commercialName: "AXERIA",
        linkLogo: "",
      },
    });
    const overrides = applyVendorDisplayNameOverrides(
      offersMap([{ product, premium: 40 }]),
      12
    );
    expect(overrides.get(1)).toBe("Accidente Persoane");
    expect(getAddonDisplayLabel(product, overrides)).toBe(
      "Accidente Persoane"
    );
  });

  it("assigns Grawe road assist tiers by ascending premium", () => {
    const vendor = { id: 20, name: "Grawe", commercialName: "GRAWE", linkLogo: "" };
    const cheap = makeProduct({
      id: 1,
      productName: "RA Basic",
      vendorProductType: "ROAD_ASSIST",
      vendorDetails: vendor,
    });
    const mid = makeProduct({
      id: 2,
      productName: "RA Util",
      vendorProductType: "ROAD_ASSIST",
      vendorDetails: vendor,
    });
    const expensive = makeProduct({
      id: 3,
      productName: "RA Premium",
      vendorProductType: "ROAD_ASSIST",
      vendorDetails: vendor,
    });

    const overrides = applyVendorDisplayNameOverrides(
      offersMap([
        { product: mid, premium: 80 },
        { product: expensive, premium: 120 },
        { product: cheap, premium: 50 },
      ]),
      12
    );

    expect(overrides.get(1)).toBe("Asistenta Rutiera BasicPlus");
    expect(overrides.get(2)).toBe("Asistenta Rutiera Util");
    expect(overrides.get(3)).toBe("Asistenta Rutiera Premium");
  });

  it("assigns fourth Grawe tier to PremiumEuropa", () => {
    const vendor = { id: 20, name: "Grawe", commercialName: "GRAWE", linkLogo: "" };
    const products = [1, 2, 3, 4].map((id) =>
      makeProduct({
        id,
        productName: `RA ${id}`,
        vendorProductType: "ROAD_ASSIST",
        vendorDetails: vendor,
      })
    );
    const overrides = applyVendorDisplayNameOverrides(
      offersMap(
        products.map((product, index) => ({
          product,
          premium: 40 + index * 10,
        }))
      ),
      12
    );

    expect(overrides.get(1)).toBe("Asistenta Rutiera BasicPlus");
    expect(overrides.get(2)).toBe("Asistenta Rutiera Util");
    expect(overrides.get(3)).toBe("Asistenta Rutiera Premium");
    expect(overrides.get(4)).toBe("Asistenta Rutiera PremiumEuropa");
  });

  it("assigns Pointer road assist Premium then VIP by price", () => {
    const vendor = {
      id: 30,
      name: "Pointer",
      commercialName: "POINTER",
      linkLogo: "",
    };
    const cheap = makeProduct({
      id: 10,
      productName: "Asistenta rutiera A",
      vendorDetails: vendor,
    });
    const expensive = makeProduct({
      id: 11,
      productName: "Asistenta rutiera B",
      vendorDetails: vendor,
    });

    const overrides = applyVendorDisplayNameOverrides(
      offersMap([
        { product: expensive, premium: 200 },
        { product: cheap, premium: 90 },
      ]),
      12
    );

    expect(overrides.get(10)).toBe("Asistenta Rutiera Premium");
    expect(overrides.get(11)).toBe("Asistenta Rutiera VIP");
  });

  it("assigns Signal Expert B1–B4 by ascending premium", () => {
    const vendor = {
      id: 40,
      name: "Signal Iduna",
      commercialName: "SIGNAL IDUNA",
      linkLogo: "",
    };
    const products = [1, 2, 3, 4].map((id) =>
      makeProduct({
        id,
        productName: `Signal Expert ${id}`,
        productType: "EXPERT",
        vendorProductType: "ROAD_ASSIST",
        vendorDetails: vendor,
      })
    );

    const overrides = applyVendorDisplayNameOverrides(
      offersMap(
        products.map((product, index) => ({
          product,
          premium: 30 + index * 15,
        }))
      ),
      12
    );

    expect(overrides.get(1)).toBe("Signal Expert B1");
    expect(overrides.get(2)).toBe("Signal Expert B2");
    expect(overrides.get(3)).toBe("Signal Expert B3");
    expect(overrides.get(4)).toBe("Signal Expert B4");
  });

  it("assigns Signal Event M1–M4 by ascending premium", () => {
    const vendor = {
      id: 40,
      name: "Signal Iduna",
      commercialName: "SIGNAL IDUNA",
      linkLogo: "",
    };
    const products = [5, 6, 7, 8].map((id) =>
      makeProduct({
        id,
        productName: `Signal Event ${id}`,
        productType: "EVENT",
        vendorProductType: "ROAD_ASSIST",
        vendorDetails: vendor,
      })
    );

    const overrides = applyVendorDisplayNameOverrides(
      offersMap(
        products.map((product, index) => ({
          product,
          premium: 20 + index * 12,
        }))
      ),
      12
    );

    expect(overrides.get(5)).toBe("Signal Event M1");
    expect(overrides.get(6)).toBe("Signal Event M2");
    expect(overrides.get(7)).toBe("Signal Event M3");
    expect(overrides.get(8)).toBe("Signal Event M4");
  });

  it("falls back to API productName when no override applies", () => {
    const product = makeProduct({
      id: 99,
      productName: "Custom Addon",
      vendorDetails: {
        id: 50,
        name: "Other",
        commercialName: "OTHER INSURER",
        linkLogo: "",
      },
    });
    expect(getAddonDisplayLabel(product, new Map())).toBe("Custom Addon");
  });

  describe("sortVendorGroupProducts", () => {
    it("orders Grawe road assist by premium then accident products", () => {
      const vendor = { id: 20, name: "Grawe", commercialName: "GRAWE", linkLogo: "" };
      const raCheap = makeProduct({
        id: 1,
        productName: "RA Basic",
        vendorProductType: "ROAD_ASSIST",
        vendorDetails: vendor,
      });
      const raExpensive = makeProduct({
        id: 2,
        productName: "RA Premium",
        vendorProductType: "ROAD_ASSIST",
        vendorDetails: vendor,
      });
      const accCheap = makeProduct({
        id: 3,
        productName: "Accident",
        vendorProductType: "ACC_PERS",
        vendorDetails: vendor,
      });
      const accExpensive = makeProduct({
        id: 4,
        productName: "Accident Plus",
        vendorProductType: "ACC_PERS",
        vendorDetails: vendor,
      });

      const offers = offersMap([
        { product: accExpensive, premium: 90 },
        { product: raExpensive, premium: 80 },
        { product: accCheap, premium: 40 },
        { product: raCheap, premium: 50 },
      ]);
      const overrides = applyVendorDisplayNameOverrides(offers, 12);

      const sorted = sortVendorGroupProducts(
        [accExpensive, raExpensive, accCheap, raCheap],
        offers,
        "grawe",
        12,
        overrides
      );

      expect(sorted.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    });

    it("orders Signal Expert B1–B4 and Event M1–M4 by tier label", () => {
      const vendor = {
        id: 40,
        name: "Signal Iduna",
        commercialName: "SIGNAL IDUNA",
        linkLogo: "",
      };
      const expertProducts = [1, 2, 3, 4].map((id) =>
        makeProduct({
          id,
          productName: `Signal Expert ${id}`,
          productType: "EXPERT",
          vendorProductType: "ROAD_ASSIST",
          vendorDetails: vendor,
        })
      );
      const eventProducts = [5, 6, 7, 8].map((id) =>
        makeProduct({
          id,
          productName: `Signal Event ${id}`,
          productType: "EVENT",
          vendorProductType: "ROAD_ASSIST",
          vendorDetails: vendor,
        })
      );

      const allProducts = [...expertProducts, ...eventProducts];
      const offers = offersMap(
        allProducts.map((product) => ({
          product,
          premium: product.id * 10,
        }))
      );
      const overrides = applyVendorDisplayNameOverrides(offers, 12);

      const shuffled = [
        eventProducts[3]!,
        expertProducts[2]!,
        eventProducts[0]!,
        expertProducts[0]!,
        eventProducts[2]!,
        expertProducts[3]!,
        eventProducts[1]!,
        expertProducts[1]!,
      ];

      const sorted = sortVendorGroupProducts(
        shuffled,
        offers,
        "signal iduna",
        12,
        overrides
      );

      expect(sorted.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
});
