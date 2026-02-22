import { describe, expect, it, vi, beforeEach } from "vitest";
import { createOrderAndOffers } from "./offerFlow";
import { buildOrderPayload } from "./payloadBuilders";

const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe("RCA flow integration", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("creates order and generates offers with partial failures", async () => {
    const owner = {
      legalType: "PF",
      firstName: "Ion",
      lastName: "Popescu",
      idType: "CI",
      idSerial: "RX",
      idNumber: "123456",
      idExpirationDate: null,
      driverLicenceDate: null,
      email: "ion@example.com",
      phoneNumber: "0722123456",
      address: {
        countryId: 185,
        cityId: 1,
        countyId: 1,
        postalCode: "010001",
        streetTypeId: 1,
        floorId: null,
        addressType: "HOME",
        foreignCountyName: null,
        foreignCityName: null,
        streetName: "Strada Test",
        streetNumber: "1",
        building: "",
        entrance: "",
        apartment: "",
      },
      cif: 1960523420011,
    };

    postMock.mockImplementation((url: string) => {
      if (url === "/online/offers/order/v3") {
        return Promise.resolve({ id: 10, productType: "RCA", hash: "abc123" });
      }
      if (url.startsWith("/online/offers/rca/v3")) {
        return Promise.resolve({
          id: 100,
          productId: "prod-1",
          productName: "RCA Test",
          vendorName: "Vendor",
          policyPremium: 350,
          currency: "RON",
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const products = [
      { id: "prod-1", productName: "RCA 1" },
      { id: "prod-2", productName: "RCA 2" },
    ];

    const result = await createOrderAndOffers({
      orderPayload: buildOrderPayload("RCA", owner, owner),
      fetchBodies: async () => [
        { productId: products[0].id, orderId: 0 },
        { productId: products[1].id, orderId: 0 },
      ],
      fetchOffer: async (body, order) => {
        if (body.productId === "prod-2") {
          throw new Error("Offer generation failed");
        }
        return postMock(`/online/offers/rca/v3?orderHash=${order.hash}`, body);
      },
      mapOfferError: (body, err) => ({
        id: 0,
        productId: String(body.productId),
        productName:
          products.find((p) => p.id === body.productId)?.productName || "RCA",
        vendorName: "",
        policyPremium: 0,
        currency: "RON",
        error: err instanceof Error ? err.message : "Eroare",
      }),
    });

    expect(result.order.hash).toBe("abc123");
    expect(result.offers).toHaveLength(2);
    expect(result.offers[0].productName).toBe("RCA Test");
    expect(result.offers[1]).toMatchObject({
      productId: "prod-2",
      error: "Offer generation failed",
    });
  });
});
