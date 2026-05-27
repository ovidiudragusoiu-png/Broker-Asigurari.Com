import { describe, expect, it } from "vitest";
import { verifyPaymentCheckResponse } from "./paymentVerification";

describe("verifyPaymentCheckResponse", () => {
  it("confirms a single successful object response", () => {
    expect(
      verifyPaymentCheckResponse({ offerId: 101, success: true }, [101])
    ).toEqual({ success: true, message: "" });
  });

  it("parses JSON string responses returned as text/plain", () => {
    expect(
      verifyPaymentCheckResponse(
        JSON.stringify({ offerId: 101, success: true }),
        [101]
      )
    ).toEqual({ success: true, message: "" });
  });

  it("requires every bundled offer to be explicitly confirmed", () => {
    expect(
      verifyPaymentCheckResponse(
        [
          { offerId: 101, success: true },
          { offerId: 202, success: true },
        ],
        [101, 202]
      )
    ).toEqual({ success: true, message: "" });

    expect(
      verifyPaymentCheckResponse([{ offerId: 101, success: true }], [101, 202])
    ).toMatchObject({
      success: false,
      message: "Nu am primit confirmarea platii pentru toate produsele.",
    });
  });

  it("fails closed for failed, unparsable, or unrelated responses", () => {
    expect(
      verifyPaymentCheckResponse(
        { offerId: 101, success: false, message: "pending" },
        [101]
      )
    ).toEqual({ success: false, message: "pending" });

    expect(verifyPaymentCheckResponse("not json", [101]).success).toBe(false);
    expect(
      verifyPaymentCheckResponse({ offerId: 999, success: true }, [101]).success
    ).toBe(false);
  });
});
