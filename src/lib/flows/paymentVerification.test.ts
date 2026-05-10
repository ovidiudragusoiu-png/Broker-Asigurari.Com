import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  verifyPaymentCheckResponse,
  verifyPaymentForOffers,
} from "./paymentVerification";

const postMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe("payment verification", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("accepts the RCA single-object payment response when the offer ID matches", () => {
    const result = verifyPaymentCheckResponse(
      { offerId: 123, success: true, message: "Plata confirmata!" },
      [123]
    );

    expect(result).toMatchObject({
      success: true,
      confirmedOfferIds: [123],
      missingOfferIds: [],
      failedOfferIds: [],
    });
  });

  it("parses text/plain JSON array responses and requires every expected offer", () => {
    const result = verifyPaymentCheckResponse(
      JSON.stringify([
        { offerId: 123, success: true, message: "Plata confirmata!" },
        { offerId: 456, success: true, message: "Plata confirmata!" },
      ]),
      [123, 456]
    );

    expect(result.success).toBe(true);
    expect(result.confirmedOfferIds).toEqual([123, 456]);
  });

  it("fails closed when an additional offer is absent from the payment response", () => {
    const result = verifyPaymentCheckResponse(
      [{ offerId: 123, success: true, message: "Plata confirmata!" }],
      [123, 456]
    );

    expect(result).toMatchObject({
      success: false,
      confirmedOfferIds: [123],
      missingOfferIds: [456],
      failedOfferIds: [],
    });
  });

  it("uses the processor failure message for declined offers", () => {
    const result = verifyPaymentCheckResponse(
      [{ offerId: 123, success: false, message: "Plata respinsa" }],
      [123]
    );

    expect(result).toMatchObject({
      success: false,
      message: "Plata respinsa",
      confirmedOfferIds: [],
      missingOfferIds: [],
      failedOfferIds: [123],
    });
  });

  it("propagates API failures instead of treating the redirect status as paid", async () => {
    postMock.mockRejectedValueOnce(new Error("InsureTech API timeout"));

    await expect(verifyPaymentForOffers("hash value/?", [123, 456])).rejects.toThrow(
      "InsureTech API timeout"
    );
    expect(postMock).toHaveBeenCalledWith(
      "/online/offers/payment/check/v3?orderHash=hash%20value%2F%3F",
      { offerIds: [123, 456] },
      { Accept: "text/plain" }
    );
  });
});
