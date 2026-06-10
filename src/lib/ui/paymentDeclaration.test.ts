import { describe, expect, it } from "vitest";
import {
  getPaymentDeclarationPolicyLabel,
  getPaymentDeclarationText,
} from "@/lib/ui/paymentDeclaration";

describe("paymentDeclaration", () => {
  it("uses product-specific policy labels", () => {
    expect(getPaymentDeclarationPolicyLabel("RCA")).toBe("RCA");
    expect(getPaymentDeclarationPolicyLabel("PAD")).toBe("PAD");
    expect(getPaymentDeclarationPolicyLabel("TRAVEL")).toBe("de călătorie");
    expect(getPaymentDeclarationPolicyLabel("HOUSE")).toBe("locuință");
    expect(getPaymentDeclarationPolicyLabel("MALPRAXIS")).toBe("malpraxis");
  });

  it("builds full declaration text", () => {
    expect(getPaymentDeclarationText("PAD")).toContain("poliței PAD");
    expect(getPaymentDeclarationText("TRAVEL")).toContain("poliței de călătorie");
    expect(getPaymentDeclarationText("RCA")).toContain("peste 18 ani");
  });
});
