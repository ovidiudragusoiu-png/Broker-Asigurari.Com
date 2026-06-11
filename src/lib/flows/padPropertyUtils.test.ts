import { describe, expect, it } from "vitest";
import {
  normalizeLabeledIdOptions,
  padProductIdForBuildingType,
  PAD_CONSTRUCTION_TYPE_FALLBACK,
} from "./padPropertyUtils";

describe("padPropertyUtils", () => {
  it("maps PAD building type A/B to product ids", () => {
    expect(padProductIdForBuildingType("A")).toBe(1270);
    expect(padProductIdForBuildingType("B")).toBe(1272);
  });

  it("normalizes API option arrays", () => {
    expect(
      normalizeLabeledIdOptions([
        { id: 1, name: "BetonPrefabricate", description: "Beton Prefabricate" },
      ])
    ).toEqual([
      { id: 1, name: "BetonPrefabricate", description: "Beton Prefabricate" },
    ]);
  });

  it("ignores invalid option rows", () => {
    expect(normalizeLabeledIdOptions([{ id: "x" }, { id: 4, description: "Caramida Piatra" }])).toEqual([
      { id: 4, name: "Caramida Piatra", description: "Caramida Piatra" },
    ]);
  });

  it("exposes PAD construction fallback options", () => {
    expect(PAD_CONSTRUCTION_TYPE_FALLBACK.length).toBeGreaterThanOrEqual(2);
  });
});
