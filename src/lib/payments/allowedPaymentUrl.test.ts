import { describe, expect, it } from "vitest";
import { isAllowedPaymentUrl } from "./allowedPaymentUrl";

describe("isAllowedPaymentUrl", () => {
  it("allows InsureTech staging broker payment links", () => {
    expect(
      isAllowedPaymentUrl(
        "https://insuretech.staging.insuretech.ro/api/v1/online/broker/payments/pub/pay?token=abc"
      )
    ).toBe(true);
  });

  it("allows InsureTech production broker payment links", () => {
    expect(
      isAllowedPaymentUrl(
        "https://insuretech.prod.insuretech.ro/api/v1/online/broker/payments/pub/pay?token=abc"
      )
    ).toBe(true);
    expect(
      isAllowedPaymentUrl(
        "https://maxygo.insuretech.ro/api/v1/public/payments/link?token=abc"
      )
    ).toBe(true);
  });

  it("allows pay.insuretech.ro", () => {
    expect(isAllowedPaymentUrl("https://pay.insuretech.ro/checkout/123")).toBe(true);
  });

  it("allows EuPlatesc / Netopia hosts", () => {
    expect(isAllowedPaymentUrl("https://secure.euplatesc.ro/process")).toBe(true);
    expect(isAllowedPaymentUrl("https://secure.mobilpay.ro/order")).toBe(true);
  });

  it("rejects non-https and unknown hosts", () => {
    expect(isAllowedPaymentUrl("http://pay.insuretech.ro/x")).toBe(false);
    expect(isAllowedPaymentUrl("https://evil.example/phish")).toBe(false);
    expect(
      isAllowedPaymentUrl("https://insuretech.prod.insuretech.ro/api/v1/online/offers/rca/v3")
    ).toBe(false);
  });
});
