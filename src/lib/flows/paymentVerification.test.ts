import { describe, expect, it } from "vitest";
import { verifyPaymentCheckResponse } from "./paymentVerification";

describe("verifyPaymentCheckResponse", () => {
  it("accepts a confirmed single-offer object", () => {
    expect(
      verifyPaymentCheckResponse(
        { offerId: 8191621, success: true, message: "Plata confirmata!" },
        [8191621]
      )
    ).toEqual({ success: true });
  });

  it("accepts a confirmed bundled response only when every expected offer is paid", () => {
    expect(
      verifyPaymentCheckResponse(
        [
          { offerId: 1952, success: true, message: "Plata confirmata!" },
          { offerId: 1953, success: true, message: "Plata confirmata!" },
        ],
        [1952, 1953]
      )
    ).toEqual({ success: true });
  });

  it("parses JSON string responses returned as text/plain", () => {
    expect(
      verifyPaymentCheckResponse(
        JSON.stringify({ offerId: 6535564, success: true }),
        [6535564]
      )
    ).toEqual({ success: true });
  });

  it("rejects failed payment entries", () => {
    expect(
      verifyPaymentCheckResponse(
        { offerId: 8191621, success: false, message: "Plata neconfirmata" },
        [8191621]
      )
    ).toEqual({ success: false, message: "Plata neconfirmata" });
  });

  it("rejects bundled responses missing an expected offer", () => {
    expect(
      verifyPaymentCheckResponse(
        [{ offerId: 1952, success: true, message: "Plata confirmata!" }],
        [1952, 1953]
      )
    ).toEqual({
      success: false,
      message: "Plata nu a fost confirmata pentru oferta 1953.",
    });
  });

  it("rejects unparseable responses", () => {
    expect(verifyPaymentCheckResponse("not json", [1])).toEqual({
      success: false,
      message: "Raspuns invalid la verificarea platii.",
    });
  });
});
