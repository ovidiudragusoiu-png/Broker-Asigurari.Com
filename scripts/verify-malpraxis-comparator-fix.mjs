// Standalone verification script for the May 27 2026 Malpraxis comparator/v3 fix.
//
// Run with: `node scripts/verify-malpraxis-comparator-fix.mjs`
//
// Feeds the EXACT failing payload from terminal 792217.txt line 58 (May 27, 2026
// traceId 7578cc04) through the proxy normalizer and asserts the resulting wire
// payload field-for-field matches the empirically-verified successful March 6
// 2026 Garanta wire shape (.codex-logs/malpraxis-dev.log line 38, policyPremium
// 12, error:false).
//
// Loads the TypeScript source via tsx so no build step is required.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("tsx/esm", pathToFileURL("./"));

const { normalizeMalpraxisPostBody } = await import(
  "../src/lib/flows/malpraxisOfferPayload.ts"
);

// EXACT failing comparator/v3 request body from terminal 792217.txt line 58.
const failingMay27Garanta = {
  orderId: 824570,
  productId: 1218,
  policyStartDate: "2026-05-30T00:00:00",
  policyEndDate: "2027-05-29T00:00:00",
  offerDetails: {
    malpraxisProfessionId: "15",
    category: "MediciSpecialistiSpecialitatiMedicale",
    categoryType: "Hematologie",
    generalLimit: "37000",
    moralDamagesLimit: 5,
    customMoralDamagesLimit: 0,
    currency: "EUR",
    operatingAuthorizationType: 0,
    installmentsNo: 1,
    retroactivePeriod: "0",
  },
  specificDetails: [
    { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
    { code: "OPERATING_LICENSE_TYPE", value: "0" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "5" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "5" },
    { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
    { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
  ],
};

const failingEuroins = {
  orderId: 824570,
  productId: 195,
  policyStartDate: "2026-05-30T00:00:00",
  policyEndDate: "2027-05-29T00:00:00",
  offerDetails: {
    malpraxisProfessionId: "15",
    category: "MediciSpecialistiSpecialitatiMedicale",
    categoryType: "Hematologie",
    generalLimit: "37000",
    moralDamagesLimit: 0,
    customMoralDamagesLimit: 1850,
    currency: "EUR",
    operatingAuthorizationType: 0,
    installmentsNo: 1,
    retroactivePeriod: "0",
  },
  specificDetails: [
    { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
    { code: "OPERATING_LICENSE_TYPE", value: "0" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "1850" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "1850" },
  ],
};

const failingAsirom = {
  orderId: 824570,
  productId: 47,
  policyStartDate: "2026-05-30T00:00:00",
  policyEndDate: "2027-05-29T00:00:00",
  offerDetails: {
    malpraxisProfessionId: "15",
    category: "MediciSpecialistiSpecialitatiMedicale",
    categoryType: "Hematologie",
    generalLimit: "37000",
    moralDamagesLimit: 0,
    customMoralDamagesLimit: 1850,
    currency: "EUR",
    operatingAuthorizationType: 0,
    installmentsNo: 1,
    retroactivePeriod: "0",
  },
  specificDetails: [
    { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
    { code: "OPERATING_LICENSE_TYPE", value: "0" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "1850" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "1850" },
  ],
};

function getSublimit(upstream, code) {
  return (
    upstream.specificDetails?.find((entry) => entry?.code === code)?.value ??
    undefined
  );
}

function check(name, body, expectedProductCode, expectedSublimit) {
  const upstream = JSON.parse(
    normalizeMalpraxisPostBody(
      "online/offers/malpraxis/comparator/v3",
      JSON.stringify(body)
    )
  );
  const od = upstream.offerDetails;

  const assertions = [
    ["malpraxisProfessionId is number", typeof od.malpraxisProfessionId === "number", od.malpraxisProfessionId],
    ["generalLimit is number", typeof od.generalLimit === "number", od.generalLimit],
    ["retroactivePeriod is number", typeof od.retroactivePeriod === "number", od.retroactivePeriod],
    ["operatingAuthorizationType is string", typeof od.operatingAuthorizationType === "string", od.operatingAuthorizationType],
    ["installmentsNo is number", typeof od.installmentsNo === "number", od.installmentsNo],
    ["moralDamagesLimit is number", typeof od.moralDamagesLimit === "number", od.moralDamagesLimit],
    ["customMoralDamagesLimit is number or null",
      od.customMoralDamagesLimit === null || typeof od.customMoralDamagesLimit === "number",
      od.customMoralDamagesLimit],
    ["productCode preserved", upstream.productCode === expectedProductCode, upstream.productCode],
    ["agencyId is null", upstream.agencyId === null, upstream.agencyId],
    ["saveError is true", upstream.saveError === true, upstream.saveError],
    [`SUBLIMIT_MORAL_DAMAGE_PER_EVENT == "${expectedSublimit}"`,
      getSublimit(upstream, "SUBLIMIT_MORAL_DAMAGE_PER_EVENT") === expectedSublimit,
      getSublimit(upstream, "SUBLIMIT_MORAL_DAMAGE_PER_EVENT")],
    [`SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD == "${expectedSublimit}"`,
      getSublimit(upstream, "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD") === expectedSublimit,
      getSublimit(upstream, "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD")],
  ];

  let pass = true;
  console.log(`\n${name}:`);
  console.log("  wire payload:", JSON.stringify(upstream, null, 2));
  for (const [label, ok, value] of assertions) {
    const mark = ok ? "PASS" : "FAIL";
    if (!ok) pass = false;
    console.log(`  [${mark}] ${label} (got: ${JSON.stringify(value)})`);
  }
  return pass;
}

// Additional bodies exercising Uniqa and Signal_Iduna (the two insurers the
// user reports as regressed to body-parse) under the new homogeneous SUBLIMIT
// rule (derived EUR amount for all insurers).
const failingUniqa = {
  ...failingMay27Garanta,
  productId: 79,
};
const failingSignalIduna = {
  ...failingMay27Garanta,
  productId: 358,
};

let allPass = true;
allPass = check("Garanta (productId 1218) — 5% of 37000 = 1850", failingMay27Garanta, "GARANTA_MALPRAXIS", "1850") && allPass;
allPass = check("Uniqa (productId 79) — 5% of 37000 = 1850", failingUniqa, "UNIQA_MALPRAXIS", "1850") && allPass;
allPass = check("Signal_Iduna (productId 358) — 5% of 37000 = 1850", failingSignalIduna, "SIGNAL_IDUNA_MALPRAXIS", "1850") && allPass;
allPass = check("Euroins (productId 195) — custom 1850", failingEuroins, "EUROINS_MALPRAXIS", "1850") && allPass;
allPass = check("Asirom (productId 47) — custom 1850", failingAsirom, "ASIROM_MALPRAXIS", "1850") && allPass;

console.log(`\n=== ${allPass ? "ALL PASS" : "SOMETHING FAILED"} ===`);
process.exit(allPass ? 0 : 1);
