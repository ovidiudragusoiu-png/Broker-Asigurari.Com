import { describe, expect, it } from "vitest";
import { verifyPaymentCheckResponse } from "./paymentVerification";

describe("verifyPaymentCheckResponse", () => {
  it("accepts the documented array response when every expected offer is confirmed", () => {
    expect(
      verifyPaymentCheckResponse(
        [
          { offerId: 1952, success: true, message: "Plata confirmata!" },
          { offerId: 1953, success: true, message: "Plata confirmata!" },
        ],
        [1952, 1953]
      )
    ).toMatchObject({ success: true });
  });

  it("accepts a JSON string response", () => {
    expect(
      verifyPaymentCheckResponse(
        JSON.stringify([{ offerId: 6535564, success: true }]),
        [6535564]
      )
    ).toMatchObject({ success: true });
  });

  it("rejects bundled payments when one expected offer is not confirmed", () => {
    expect(
      verifyPaymentCheckResponse(
        [{ offerId: 1952, success: true, message: "Plata confirmata!" }],
        [1952, 1953]
      )
    ).toMatchObject({
      success: false,
      message: "Plata nu a fost confirmata pentru ofertele: 1953.",
    });
  });

  it("rejects malformed responses", () => {
    expect(verifyPaymentCheckResponse("temporarily unavailable", [1952]))
      .toMatchObject({
        success: false,
        message: "Raspuns invalid la verificarea platii.",
      });
  });
});
