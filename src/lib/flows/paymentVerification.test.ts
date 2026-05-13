import { describe, expect, it } from "vitest";
import { verifyPaymentCheckResponse } from "./paymentVerification";

describe("verifyPaymentCheckResponse", () => {
  it("accepts a text/plain JSON array when every expected offer is confirmed", () => {
    const result = verifyPaymentCheckResponse(
      JSON.stringify([
        { offerId: 1952, success: true, message: "Plata confirmata!" },
        { offerId: 1953, success: true, message: "Plata confirmata!" },
      ]),
      [1952, 1953]
    );

    expect(result).toEqual({
      success: true,
      message: "Plata a fost efectuata cu succes!",
    });
  });

  it("accepts a single object response for one expected offer", () => {
    const result = verifyPaymentCheckResponse(
      { offerId: 6575544, success: true, message: "Plata confirmata!" },
      [6575544]
    );

    expect(result.success).toBe(true);
  });

  it("rejects when any expected offer is explicitly unconfirmed", () => {
    const result = verifyPaymentCheckResponse(
      [
        { offerId: 1952, success: true, message: "Plata confirmata!" },
        { offerId: 1953, success: false, message: "PAD neplatit" },
      ],
      [1952, 1953]
    );

    expect(result).toEqual({
      success: false,
      message: "PAD neplatit",
    });
  });

  it("rejects when the response omits an expected offer", () => {
    const result = verifyPaymentCheckResponse(
      [{ offerId: 1952, success: true, message: "Plata confirmata!" }],
      [1952, 1953]
    );

    expect(result).toEqual({
      success: false,
      message: "Verificarea platii nu a confirmat toate produsele din comanda.",
    });
  });

  it("rejects malformed text responses", () => {
    const result = verifyPaymentCheckResponse("Plata confirmata!", [1952]);

    expect(result.success).toBe(false);
  });
});
