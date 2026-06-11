import { describe, expect, it } from "vitest";
import {
  bareStreetName,
  isNoStreetNamePlaceholder,
  normalizeAddressForInsuretech,
  INSURETECH_STREET_TYPE_STRADA,
} from "./addressNormalize";
import { emptyAddress } from "@/components/shared/AddressForm";

describe("addressNormalize", () => {
  it("detects no-street placeholders", () => {
    expect(isNoStreetNamePlaceholder("-")).toBe(true);
    expect(isNoStreetNamePlaceholder("—")).toBe(true);
    expect(isNoStreetNamePlaceholder("fara strada")).toBe(true);
    expect(isNoStreetNamePlaceholder("Victoriei")).toBe(false);
  });

  it("strips street type prefix from streetName", () => {
    expect(bareStreetName("Strada Mihail Kogalniceanu")).toBe("Mihail Kogalniceanu");
    expect(bareStreetName("Cale Victoriei")).toBe("Victoriei");
  });

  it("sends Strada + dash for localities without a street name", () => {
    const normalized = normalizeAddressForInsuretech({
      ...emptyAddress(),
      streetName: "-",
      streetNumber: "202",
      streetTypeId: null,
    });
    expect(normalized.streetName).toBe("-");
    expect(normalized.streetTypeId).toBe(INSURETECH_STREET_TYPE_STRADA);
  });

  it("defaults missing street type to Strada (41)", () => {
    const normalized = normalizeAddressForInsuretech({
      ...emptyAddress(),
      streetName: "Victoriei",
      streetNumber: "10",
      streetTypeId: null,
    });
    expect(normalized.streetName).toBe("Victoriei");
    expect(normalized.streetTypeId).toBe(INSURETECH_STREET_TYPE_STRADA);
  });
});
