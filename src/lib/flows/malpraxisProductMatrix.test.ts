import { describe, expect, it } from "vitest";
import {
  buildMalpraxisProductMatrix,
  getIncludedProductIdsFromMatrix,
  getMalpraxisMoralInputMode,
  getProductMatrixCell,
} from "./malpraxisProductMatrix";

const ALL_PRODUCTS = [
  { id: 1218, vendorDetails: { name: "Garanta" }, productName: "Malpraxis" },
  { id: 195, vendorDetails: { name: "Euroins" }, productName: "Malpraxis" },
  { id: 358, vendorDetails: { name: "Signal Iduna" }, productName: "Malpraxis" },
  { id: 1321, vendorDetails: { name: "Omniasig" }, productName: "Malpraxis General" },
  { id: 1374, vendorDetails: { name: "ABC Insurance" }, productName: "Rasp Prof" },
  { id: 47, vendorDetails: { name: "Asirom" }, productName: "Malpraxis" },
  { id: 79, vendorDetails: { name: "Uniqa" }, productName: "Malpraxis" },
] as const;

const noneMoral = {
  moralDamagesLimitCode: "0",
  customMoralDamagesLimit: "",
  generalLimit: "37000",
};

const percent5 = {
  moralDamagesLimitCode: "5",
  customMoralDamagesLimit: "",
  generalLimit: "37000",
};

const numeric20000 = {
  moralDamagesLimitCode: "0",
  customMoralDamagesLimit: "20000",
  generalLimit: "37000",
};

function includedCodes(
  selection: typeof noneMoral,
  retroactivePeriod = "0"
): string[] {
  const matrix = buildMalpraxisProductMatrix(ALL_PRODUCTS, selection, retroactivePeriod);
  return matrix.filter((c) => c.status === "included").map((c) => c.productCode);
}

function excludedCodes(
  selection: typeof noneMoral,
  retroactivePeriod = "0"
): string[] {
  const matrix = buildMalpraxisProductMatrix(ALL_PRODUCTS, selection, retroactivePeriod);
  return matrix.filter((c) => c.status === "excluded").map((c) => c.productCode);
}

describe("getMalpraxisMoralInputMode", () => {
  it("detects none, percent, and numeric", () => {
    expect(getMalpraxisMoralInputMode(noneMoral)).toBe("none");
    expect(getMalpraxisMoralInputMode(percent5)).toBe("percent");
    expect(getMalpraxisMoralInputMode(numeric20000)).toBe("numeric");
  });
});

describe("malpraxis product matrix (live scenarios)", () => {
  it("moral Fără includes all known malpraxis products", () => {
    expect(includedCodes(noneMoral).sort()).toEqual(
      [
        "ABC_MALPRAXIS",
        "ASIROM_MALPRAXIS",
        "EUROINS_MALPRAXIS",
        "GARANTA_MALPRAXIS",
        "OMNIASIG_MALPRAXIS_GENERAL",
        "SIGNAL_IDUNA_MALPRAXIS",
        "UNIQA_MALPRAXIS",
      ].sort()
    );
  });

  it("5% moral includes percent insurers and Signal, excludes numeric-only", () => {
    expect(includedCodes(percent5).sort()).toEqual(
      [
        "ABC_MALPRAXIS",
        "GARANTA_MALPRAXIS",
        "OMNIASIG_MALPRAXIS_GENERAL",
        "SIGNAL_IDUNA_MALPRAXIS",
        "UNIQA_MALPRAXIS",
      ].sort()
    );
    expect(excludedCodes(percent5).sort()).toEqual(
      ["ASIROM_MALPRAXIS", "EUROINS_MALPRAXIS"].sort()
    );
  });

  it("fixed moral amount includes numeric insurers and Signal, excludes percent-only", () => {
    expect(includedCodes(numeric20000).sort()).toEqual(
      ["ASIROM_MALPRAXIS", "EUROINS_MALPRAXIS", "SIGNAL_IDUNA_MALPRAXIS"].sort()
    );
    expect(excludedCodes(numeric20000).sort()).toEqual(
      [
        "ABC_MALPRAXIS",
        "GARANTA_MALPRAXIS",
        "OMNIASIG_MALPRAXIS_GENERAL",
        "UNIQA_MALPRAXIS",
      ].sort()
    );
  });

  it("retroactive period excludes Signal Iduna", () => {
    expect(includedCodes(noneMoral, "24")).not.toContain("SIGNAL_IDUNA_MALPRAXIS");
    expect(excludedCodes(noneMoral, "24")).toContain("SIGNAL_IDUNA_MALPRAXIS");
    const cell = getProductMatrixCell("SIGNAL_IDUNA_MALPRAXIS", "none", "24");
    expect(cell.status).toBe("excluded");
    expect(cell.reason).toMatch(/perioada retroactiva/i);
  });
});

describe("getIncludedProductIdsFromMatrix", () => {
  it("returns only included product ids", () => {
    const matrix = buildMalpraxisProductMatrix(ALL_PRODUCTS, percent5, "0");
    expect(getIncludedProductIdsFromMatrix(matrix).sort((a, b) => a - b)).toEqual(
      [79, 358, 1218, 1321, 1374]
    );
  });
});
