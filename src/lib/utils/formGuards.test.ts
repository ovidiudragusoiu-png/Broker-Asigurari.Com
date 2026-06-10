import { describe, expect, it } from "vitest";
import { houseAddressRequiresFloor } from "./formGuards";

const padTypes = [
  {
    id: 10,
    name: "Apartament-locuinta permanenta in bloc in zona urbana",
    description: "Apartament-locuinta permanenta in bloc in zona urbana",
  },
  {
    id: 20,
    name: "Casa individuala",
    description: "Casa individuala in zona urbana",
  },
];

describe("houseAddressRequiresFloor", () => {
  it("requires floor for bloc construction type", () => {
    expect(houseAddressRequiresFloor("Bloc", "", padTypes)).toBe(true);
  });

  it("requires floor when PAD construction type is apartment", () => {
    expect(houseAddressRequiresFloor("Casa", "10", padTypes)).toBe(true);
  });

  it("does not require floor for non-apartment types", () => {
    expect(houseAddressRequiresFloor("Casa", "20", padTypes)).toBe(false);
    expect(houseAddressRequiresFloor("", "", padTypes)).toBe(false);
  });
});
