import { describe, expect, it } from "vitest";
import { isCheckoutSessionUsable } from "@/lib/portal/checkoutSession";

describe("checkoutSession", () => {
  const base = {
    token: "t",
    orderId: 1,
    offerId: 2,
    orderHash: "hash",
    expiresAt: new Date(Date.now() + 60_000),
  };

  it("accepts pending and completed sessions within TTL", () => {
    expect(
      isCheckoutSessionUsable({ ...base, status: "pending" }, "hash", 2)
    ).toBe(true);
    expect(
      isCheckoutSessionUsable({ ...base, status: "completed" }, "hash", 2)
    ).toBe(true);
  });

  it("rejects mismatched order or expired status", () => {
    expect(
      isCheckoutSessionUsable({ ...base, status: "expired" }, "hash", 2)
    ).toBe(false);
    expect(
      isCheckoutSessionUsable({ ...base, status: "pending" }, "other", 2)
    ).toBe(false);
    expect(
      isCheckoutSessionUsable(
        { ...base, status: "pending", expiresAt: new Date(Date.now() - 1) },
        "hash",
        2
      )
    ).toBe(false);
  });
});
