import { describe, expect, it } from "vitest";
import {
  paymentVerificationErrorMessage,
  verifyPaymentCheckResponse,
} from "./paymentVerification";

describe("payment verification", () => {
  it("accepts a JSON string response that confirms the expected offer", () => {
    const result = verifyPaymentCheckResponse(
      JSON.stringify({ offerId: 42, success: true, message: "" }),
      [42]
    );

    expect(result.success).toBe(true);
  });

  it("requires every expected offer to be explicitly confirmed", () => {
    const result = verifyPaymentCheckResponse(
      [
        { offerId: 42, success: true, message: "" },
        { offerId: 43, success: false, message: "PAD unpaid" },
      ],
      [42, 43]
    );

    expect(result).toEqual({
      success: false,
      message: "PAD unpaid",
    });
  });

  it("fails closed when the response is malformed or missing an offer", () => {
    expect(verifyPaymentCheckResponse("approved", [42]).success).toBe(false);
    expect(
      verifyPaymentCheckResponse({ offerId: 41, success: true }, [42]).success
    ).toBe(false);
  });

  it("returns a user-facing message when payment verification throws", () => {
    expect(paymentVerificationErrorMessage(new Error("Request timed out"))).toBe(
      "Nu am putut confirma plata: Request timed out"
    );
  });
});
