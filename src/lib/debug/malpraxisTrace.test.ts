import { describe, it, expect } from "vitest";
import {
  maskMalpraxisTracePayload,
  isMalpraxisDebugEnabled,
} from "./malpraxisTrace";

describe("maskMalpraxisTracePayload", () => {
  it("masks sensitive keys", () => {
    const out = maskMalpraxisTracePayload({
      cnp: "1960101223344",
      email: "ion.popescu@example.com",
      orderHash: "abcdef0123456789",
    }) as Record<string, string>;
    expect(out.cnp).not.toContain("960101");
    expect(out.email).not.toContain("popescu");
    expect(out.orderHash).not.toContain("0123456789");
  });

  it("masks unknown string fields by default (deny-by-default)", () => {
    const out = maskMalpraxisTracePayload({
      firstName: "Ionel",
      lastName: "Georgescu",
      address: "Str. Exemplu 10, Bucuresti",
      categoryType: "Endocrinologie",
    }) as Record<string, string>;
    expect(out.firstName).not.toBe("Ionel");
    expect(out.lastName).not.toBe("Georgescu");
    expect(out.address).not.toContain("Exemplu");
    expect(out.categoryType).not.toBe("Endocrinologie");
  });

  it("keeps safe technical string keys in clear", () => {
    const out = maskMalpraxisTracePayload({
      method: "POST",
      phase: "proxy_request",
      status: "200",
      currency: "EUR",
      productCode: "ASIROM_MALPRAXIS",
    }) as Record<string, string>;
    expect(out.method).toBe("POST");
    expect(out.phase).toBe("proxy_request");
    expect(out.currency).toBe("EUR");
    expect(out.productCode).toBe("ASIROM_MALPRAXIS");
  });

  it("keeps numbers and booleans visible", () => {
    const out = maskMalpraxisTracePayload({
      orderId: 812078,
      installmentsNo: 1,
      error: false,
    }) as Record<string, unknown>;
    expect(out.orderId).toBe(812078);
    expect(out.installmentsNo).toBe(1);
    expect(out.error).toBe(false);
  });
});

describe("isMalpraxisDebugEnabled", () => {
  it("honors explicit override", () => {
    expect(isMalpraxisDebugEnabled(true)).toBe(true);
    expect(isMalpraxisDebugEnabled(false)).toBe(false);
  });
});
