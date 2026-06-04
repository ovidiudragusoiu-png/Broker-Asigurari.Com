import { setTimeout as sleep } from "node:timers/promises";

const BASE = "https://insuretech.staging.insuretech.ro/api/v1";
const USER = "maxygo_dragusoiu_ovidiu_test";
const PASS = "}h-U@I[rwV";
const API_KEY = "df5a81be-2564-412f-9375-999349e68bc8";

const AUTH = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");
const HEADERS = {
  Authorization: AUTH,
  Api_key: API_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function call(method, path, body, label) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: HEADERS,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  const isErr =
    res.status >= 400 ||
    (Array.isArray(parsed) && parsed[0] && parsed[0].error === true);
  const mark = isErr ? "FAIL" : "OK  ";
  console.log(`${mark} [${label}] ${res.status} ${typeof parsed === "object" && parsed && parsed.detail ? parsed.detail : Array.isArray(parsed) && parsed[0] ? `error=${parsed[0].error} msg=${parsed[0].message}` : ""}`);
  return { status: res.status, body: parsed, raw: text };
}

const person = {
  legalType: "PF",
  firstName: "OVIDIU",
  lastName: "DRAGUSOIU",
  idType: "CI",
  idSerial: "RX",
  idNumber: "999999",
  idExpirationDate: null,
  driverLicenceDate: null,
  email: "ovidiu+test@example.com",
  phoneNumber: "0722000000",
  cif: 1860219295601,
  dateOfBirth: "1986-02-19",
  address: {
    countryId: 185,
    cityId: 1598,
    countyId: 17,
    postalCode: "010001",
    streetTypeId: 1,
    floorId: null,
    addressType: "HOME",
    foreignCountyName: null,
    foreignCityName: null,
    streetName: "Strada Test",
    streetNumber: "1",
    building: "",
    entrance: "",
    apartment: "",
  },
};

const orderPayload = {
  vendorProductType: "MALPRAXIS",
  mainInsuredDetails: { ...person, policyPartyType: "INSURED" },
  contractorDetails: { ...person, policyPartyType: "CONTRACTOR" },
  clientDetails: { ...person, policyPartyType: "CLIENT" },
};

const policyStartDate = "2026-06-15T00:00:00";
const policyEndDate = "2027-06-14T00:00:00";

async function main() {
  const order = await call("POST", "/online/offers/order/v3", orderPayload, "order/v3");
  if (order.status >= 400) return;
  const orderId = order.body.id;
  const orderHash = order.body.hash;
  console.log("orderId", orderId, "hash", orderHash);
  await sleep(150);

  // Request bodies for the three failing insurers AND euroins for comparison
  const offerDetailsForBodies = {
    malpraxisProfessionId: 15,
    category: "MediciSpecialistiSpecialitatiMedicale",
    categoryType: "Hematologie",
    generalLimit: 37000,
    moralDamagesLimit: 5,
    customMoralDamagesLimit: null,
    retroactivePeriod: 0,
    currency: "EUR",
    operatingAuthorizationType: "0",
    installmentsNo: 1,
  };
  const specificDetails = [
    { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
    { code: "OPERATING_LICENSE_TYPE", value: "0" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "0" },
    { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "0" },
    { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
    { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
  ];

  const bodies = await call(
    "POST",
    `/online/offers/malpraxis/comparator/bodies/v3?orderHash=${orderHash}`,
    { orderId, productIds: [1218, 358, 79, 195], policyStartDate, policyEndDate, offerDetails: offerDetailsForBodies, specificDetails },
    "bodies/v3"
  );
  console.log("\nBODIES/V3 RAW RESPONSE:");
  console.log(JSON.stringify(bodies.body, null, 2));
  await sleep(150);

  // Take the verbatim body returned by bodies/v3 and POST it to comparator/v3.
  const baselineBodies = Array.isArray(bodies.body) ? bodies.body : [];

  console.log("\n===== Step 1: post bodies/v3 entries verbatim to comparator/v3 =====");
  for (const b of baselineBodies) {
    await call(
      "POST",
      `/online/offers/malpraxis/comparator/v3?orderHash=${orderHash}`,
      b,
      `comparator/v3 verbatim ${b.productCode}`
    );
    await sleep(200);
  }

  // ===== Step 2 - bisect: try a known-failing insurer (Garanta) with various offerDetails shapes =====
  console.log("\n===== Step 2: Garanta wire-shape bisection =====");
  const garantaEntry = baselineBodies.find((b) => b.productCode === "GARANTA_MALPRAXIS");
  if (!garantaEntry) {
    console.log("No GARANTA body returned by bodies/v3 — skipping bisect");
  } else {
    const base = { ...garantaEntry };
    const cases = [
      {
        label: "GAR verbatim again",
        body: base,
      },
      {
        label: "GAR + agencyId removed",
        body: (() => { const c = { ...base }; delete c.agencyId; return c; })(),
      },
      {
        label: "GAR + saveError removed",
        body: (() => { const c = { ...base }; delete c.saveError; return c; })(),
      },
      {
        label: "GAR + productCode removed",
        body: (() => { const c = { ...base }; delete c.productCode; return c; })(),
      },
      {
        label: "GAR generalLimit as STRING",
        body: { ...base, offerDetails: { ...base.offerDetails, generalLimit: String(base.offerDetails.generalLimit) } },
      },
      {
        label: "GAR malpraxisProfessionId as STRING",
        body: { ...base, offerDetails: { ...base.offerDetails, malpraxisProfessionId: String(base.offerDetails.malpraxisProfessionId) } },
      },
      {
        label: "GAR retroactivePeriod as STRING",
        body: { ...base, offerDetails: { ...base.offerDetails, retroactivePeriod: String(base.offerDetails.retroactivePeriod) } },
      },
      {
        label: "GAR operatingAuthorizationType as NUMBER 0",
        body: { ...base, offerDetails: { ...base.offerDetails, operatingAuthorizationType: 0 } },
      },
      {
        label: "GAR customMoralDamagesLimit 0 (was null)",
        body: { ...base, offerDetails: { ...base.offerDetails, customMoralDamagesLimit: 0 } },
      },
      {
        label: "GAR moralDamagesLimit 0 (was 5)",
        body: { ...base, offerDetails: { ...base.offerDetails, moralDamagesLimit: 0 } },
      },
      {
        label: "GAR + SUBLIMIT 5 in specificDetails (May 27 broken shape)",
        body: { ...base, specificDetails: [
          { code: "EVENT_LIMIT_INSURED_AMOUNT", value: "37000" },
          { code: "OPERATING_LICENSE_TYPE", value: "0" },
          { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: "5" },
          { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: "5" },
          { code: "PREVIOUS_CIVIL_LIABILITY", value: "NU" },
          { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: "NU" },
        ] },
      },
      {
        label: "GAR + empty specificDetails",
        body: { ...base, specificDetails: [] },
      },
    ];

    for (const c of cases) {
      await call(
        "POST",
        `/online/offers/malpraxis/comparator/v3?orderHash=${orderHash}`,
        c.body,
        c.label
      );
      await sleep(300);
    }
  }
}

main().catch((e) => console.error("FATAL", e));
