import { describe, expect, it, vi } from "vitest";
import {
  assertPaymentConfirmed,
  PaymentVerificationError,
  verifyPaymentBeforePolicyCreation,
} from "./paymentVerification";

describe("payment verification", () => {
  it("accepts JSON-string payment check responses", () => {
    assertPaymentConfirmed(
      JSON.stringify({ offerId: 101, success: true, message: "Plata confirmata!" }),
      [101]
    );
  });

  it("requires every expected bundled offer to be confirmed", () => {
    assertPaymentConfirmed(
      [
        { offerId: 101, success: true, message: "Plata confirmata!" },
        { offerId: 202, success: true, message: "Plata confirmata!" },
      ],
      [101, 202]
    );

    expect(() =>
      assertPaymentConfirmed(
        [{ offerId: 101, success: true, message: "Plata confirmata!" }],
        [101, 202]
      )
    ).toThrow("Plata nu a fost confirmata pentru toate ofertele.");
  });

  it("rejects failed payment checks", () => {
    expect(() =>
      assertPaymentConfirmed(
        { offerId: 101, success: false, message: "Plata refuzata" },
        [101]
      )
    ).toThrow("Plata refuzata");
  });

  it("fails closed when the payment check request errors", async () => {
    const post = vi.fn().mockRejectedValue(new Error("timeout"));

    await expect(
      verifyPaymentBeforePolicyCreation({
        post,
        orderHash: "order-hash",
        offerIds: [101],
      })
    ).rejects.toBeInstanceOf(PaymentVerificationError);

    expect(post).toHaveBeenCalledWith(
      "/online/offers/payment/check/v3?orderHash=order-hash",
      { offerIds: [101] },
      { Accept: "text/plain" }
    );
  });
});
