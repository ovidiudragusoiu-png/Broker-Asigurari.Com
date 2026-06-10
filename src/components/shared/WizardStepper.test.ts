import { describe, expect, it } from "vitest";
import { parseWizardStep, parseWizardSubstep } from "./WizardStepper";

describe("parseWizardStep", () => {
  it("defaults invalid values to 0", () => {
    expect(parseWizardStep(null, 4)).toBe(0);
    expect(parseWizardStep("abc", 4)).toBe(0);
    expect(parseWizardStep("-1", 4)).toBe(0);
  });

  it("clamps to the last step", () => {
    expect(parseWizardStep("9", 4)).toBe(3);
  });
});

describe("parseWizardSubstep", () => {
  it("accepts known substeps only", () => {
    expect(parseWizardSubstep("dnt")).toBe("dnt");
    expect(parseWizardSubstep("consent")).toBe("consent");
    expect(parseWizardSubstep(null)).toBeNull();
    expect(parseWizardSubstep("other")).toBeNull();
  });
});
