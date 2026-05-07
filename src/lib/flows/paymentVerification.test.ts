import { describe, expect, it } from "vitest";
import { getPaymentCheckFailureMessage } from "./paymentVerification";

describe("payment verification", () => {
  it("accepts a confirmed single-offer response", () => {
    expect(
      getPaymentCheckFailureMessage(
        { offerId: 100, success: true, message: "Plata confirmata!" },
        [100]
      )
    ).toBeNull();
  });

  it("accepts confirmed multi-offer responses returned as text", () => {
    const response = JSON.stringify([
      { offerId: 100, success: true, message: "Plata confirmata!" },
      { offerId: 101, success: true, message: "Plata confirmata!" },
    ]);

    expect(getPaymentCheckFailureMessage(response, [100, 101])).toBeNull();
  });

  it("rejects when an expected offer is missing from the check response", () => {
    expect(
      getPaymentCheckFailureMessage(
        [{ offerId: 100, success: true, message: "Plata confirmata!" }],
        [100, 101]
      )
    ).toBe("Plata nu a fost confirmata de procesatorul de plati.");
  });

  it("returns the processor message for a failed offer", () => {
    expect(
      getPaymentCheckFailureMessage(
        [
          { offerId: 100, success: true, message: "Plata confirmata!" },
          { offerId: 101, success: false, message: "Plata refuzata." },
        ],
        [100, 101]
      )
    ).toBe("Plata refuzata.");
  });

  it("throws for invalid payment check responses", () => {
    expect(() => getPaymentCheckFailureMessage("not json", [100])).toThrow(
      "Raspuns invalid la verificarea platii."
    );
  });
});
