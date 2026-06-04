import { describe, expect, it } from "vitest";
import {
  getInsurerRetryHintMessage,
  inferInsurerAdjustmentFields,
  resolveInsurerOverride,
  suggestInsurerOverride,
} from "./malpraxisInsurerRetry";

const global = {
  moralDamagesLimit: "5",
  customMoralDamagesLimit: "",
  retroactivePeriod: "24",
  generalLimit: "37000",
};

describe("getInsurerRetryHintMessage", () => {
  it("Garanta anterioritate message", () => {
    expect(
      getInsurerRetryHintMessage(
        "GARANTA_MALPRAXIS",
        "INS-9999 | Calculul nu poate fi realizat! Perioada anterioritate fara reinnoire"
      )
    ).toContain("reînnoire");
  });

  it("Uniqa retroactive message", () => {
    expect(
      getInsurerRetryHintMessage(
        "UNIQA_MALPRAXIS",
        "Produsul Uniqa nu accepta perioada retroactiva selectata"
      )
    ).toBe(
      "Produsul Uniqa nu acceptă perioada retroactivă selectată. Alegeți Fără pentru a primi o ofertă."
    );
  });

  it("Signal retroactive message", () => {
    expect(
      getInsurerRetryHintMessage(
        "SIGNAL_IDUNA_MALPRAXIS",
        "Produsul Signal Iduna nu accepta perioada retroactiva selectata"
      )
    ).toContain("Fără perioada retroactivă");
  });

  it("numeric insurers fixed-sum message", () => {
    const msg = getInsurerRetryHintMessage(
      "ASIROM_MALPRAXIS",
      "Produsul Asirom nu accepta procent pentru limita daune morale"
    );
    expect(msg).toBe("Completați o sumă fixă pentru a obține o ofertă.");
    expect(
      getInsurerRetryHintMessage("EUROINS_MALPRAXIS", "nu accepta procent")
    ).toBe(msg);
  });

  it("ABC percent-only: rejects fixed-sum guidance", () => {
    expect(
      getInsurerRetryHintMessage(
        "ABC_MALPRAXIS",
        "Produsul ABC INSURANCE SA accepta doar procent pentru limita daune morale"
      )
    ).toContain("doar procent");
    expect(
      getInsurerRetryHintMessage(
        "ABC_MALPRAXIS",
        "Produsul ABC nu accepta procentul selectat pentru limita daune morale"
      )
    ).toContain("Fără");
  });
});

describe("inferInsurerAdjustmentFields", () => {
  it("Uniqa exposes retroactive only", () => {
    expect(
      inferInsurerAdjustmentFields(
        "UNIQA_MALPRAXIS",
        "Produsul Uniqa nu accepta perioada retroactiva selectata"
      )
    ).toEqual(["retroactive"]);
  });

  it("Asirom exposes moralCustom only without prefilled amount", () => {
    expect(
      inferInsurerAdjustmentFields(
        "ASIROM_MALPRAXIS",
        "Produsul Asirom nu accepta procent pentru limita daune morale"
      )
    ).toEqual(["moralCustom"]);
    const suggested = suggestInsurerOverride(
      "ASIROM_MALPRAXIS",
      "Produsul Asirom nu accepta procent pentru limita daune morale",
      global
    );
    expect(suggested.customMoralDamagesLimit).toBe("");
    expect(suggested.moralDamagesLimit).toBe("0");
  });

  it("ABC exposes moralPercent when percent rejected", () => {
    expect(
      inferInsurerAdjustmentFields(
        "ABC_MALPRAXIS",
        "Produsul ABC nu accepta procentul selectat pentru limita daune morale"
      )
    ).toEqual(["moralPercent"]);
  });
});

describe("resolveInsurerOverride", () => {
  it("suggests retro Fara for Signal", () => {
    const override = resolveInsurerOverride(
      global,
      "SIGNAL_IDUNA_MALPRAXIS",
      "Produsul Signal Iduna nu accepta perioada retroactiva selectata"
    );
    expect(override.retroactivePeriod).toBe("0");
  });

  it("clears percent and leaves custom empty for Euroins when percent rejected", () => {
    const override = resolveInsurerOverride(
      global,
      "EUROINS_MALPRAXIS",
      "Produsul Euroins nu accepta procent pentru limita daune morale"
    );
    expect(override.moralDamagesLimit).toBe("0");
    expect(override.customMoralDamagesLimit).toBe("");
  });

  it("suggests Fara percent for ABC when percent rejected", () => {
    const override = resolveInsurerOverride(
      global,
      "ABC_MALPRAXIS",
      "Produsul ABC nu accepta procentul selectat pentru limita daune morale"
    );
    expect(override.moralDamagesLimit).toBe("0");
    expect(override.customMoralDamagesLimit).toBe("");
  });
});
