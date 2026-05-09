import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPaidOffers } from "./paymentVerification";

const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe("verifyPaidOffers", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("confirms payment only when every expected offer is explicitly confirmed", async () => {
    postMock.mockResolvedValue([
      { offerId: 10, success: true },
      { offerId: 20, status: "APPROVED" },
    ]);

    const result = await verifyPaidOffers("order hash/with unsafe chars", [10, 20]);

    expect(result.confirmed).toBe(true);
    expect(result.missingOfferIds).toEqual([]);
    expect(postMock).toHaveBeenCalledWith(
      "/online/offers/payment/check/v3?orderHash=order%20hash%2Fwith%20unsafe%20chars",
      { offerIds: [10, 20] },
      { Accept: "text/plain" }
    );
  });

  it("fails closed when an additional offer is missing from the payment check response", async () => {
    postMock.mockResolvedValue({ offerId: 10, success: true });

    const result = await verifyPaidOffers("abc123", [10, 20]);

    expect(result.confirmed).toBe(false);
    expect(result.missingOfferIds).toEqual([20]);
  });

  it("parses JSON returned as text/plain before checking confirmations", async () => {
    postMock.mockResolvedValue(
      JSON.stringify({
        results: [
          { offerId: 10, success: true },
          { offerId: 20, paid: true },
        ],
      })
    );

    const result = await verifyPaidOffers("abc123", [10, 20]);

    expect(result.confirmed).toBe(true);
  });
});
