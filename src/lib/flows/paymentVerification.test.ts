import { describe, expect, it } from "vitest";
import { verifyPaymentCheckResponse } from "./paymentVerification";

describe("verifyPaymentCheckResponse", () => {
  it("confirms a single offer from the payment-check response", () => {
    expect(
      verifyPaymentCheckResponse({ offerId: 123, success: true }, [123])
    ).toEqual({ confirmed: true });
  });

  it("requires every expected offer in bundled payments", () => {
    expect(
      verifyPaymentCheckResponse({ offerId: 123, success: true }, [123, 456])
    ).toMatchObject({ confirmed: false });

    expect(
      verifyPaymentCheckResponse(
        [
          { offerId: 123, success: true },
          { offerId: 456, success: true },
        ],
        [123, 456]
      )
    ).toEqual({ confirmed: true });
  });

  it("parses JSON strings returned with text/plain content type", () => {
    expect(
      verifyPaymentCheckResponse(
        JSON.stringify({ offerIds: [123, 456], success: true }),
        [123, 456]
      )
    ).toEqual({ confirmed: true });
  });

  it("fails closed for unparseable or unsuccessful responses", () => {
    expect(verifyPaymentCheckResponse("OK", [123])).toMatchObject({
      confirmed: false,
    });
    expect(
      verifyPaymentCheckResponse({ offerId: 123, success: false }, [123])
    ).toMatchObject({ confirmed: false });
  });
});
