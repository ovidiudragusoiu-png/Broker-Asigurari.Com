import { appEnv, insureTechEnv } from "@/lib/config/env";

/**
 * Server-side InsureTech API client.
 * ONLY import this in server components or API routes - never in client code.
 * Handles Basic Auth + Api_key authentication.
 */

const API_URL = insureTechEnv.apiUrl;
const USERNAME = insureTechEnv.username;
const PASSWORD = insureTechEnv.password;
const API_KEY = insureTechEnv.apiKey;

function getAuthHeaders(): Record<string, string> {
  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    Api_key: API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  accept?: string;
}

export async function insuretechFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers: extraHeaders, accept } = options;
  const authHeaders = getAuthHeaders();

  if (accept) {
    authHeaders.Accept = accept;
  }

  const url = `${API_URL}${path}`;
  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...authHeaders,
      ...extraHeaders,
    },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    appEnv.requestTimeoutMs
  );
  fetchOptions.signal = controller.signal;

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new InsureTechError(504, "InsureTech API timeout");
    }
    throw new InsureTechError(502, "Failed to connect to InsureTech API");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { message: errorText };
    }
    throw new InsureTechError(
      response.status,
      errorJson.message || errorJson.error || "API request failed",
      errorJson
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  // For text/plain responses (e.g., payment URLs)
  return response.text() as unknown as T;
}

export class InsureTechError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "InsureTechError";
  }
}

// ----- Shared Helper APIs -----

export async function getCountries() {
  return insuretechFetch<{ id: number; name: string; code: string }[]>(
    "/online/address/utils/countries"
  );
}

export async function getCounties() {
  return insuretechFetch<{ id: number; name: string; code: string }[]>(
    "/online/address/utils/counties"
  );
}

export async function getCities(countyId: number) {
  return insuretechFetch<{ id: number; name: string; countyId: number; uniquePostalCode: string | null }[]>(
    `/online/address/utils/cities?countyId=${countyId}`
  );
}

export async function getPostalCodes(cityId: number, streetName: string) {
  return insuretechFetch<{ postalCode: string; streetName: string }[]>(
    `/online/address/utils/postalCodes/find?cityId=${cityId}&streetName=${encodeURIComponent(streetName)}`
  );
}

export async function getStreetTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/address/utils/streetTypes"
  );
}

export async function getFloors() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/address/utils/floors"
  );
}

export async function getIdTypes() {
  return insuretechFetch<{ id: string; name: string }[]>("/online/idtypes");
}

export async function getCompanyTypes() {
  return insuretechFetch<{ id: number; name: string }[]>("/online/companytypes");
}

export async function getCaenCodes() {
  return insuretechFetch<string[]>("/online/caencodes");
}

export async function lookupCompany(cui: number) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/companies/utils/${cui}`
  );
}

// ----- Consent & DNT -----

export async function checkConsentStatus(
  legalType: string,
  cif: string,
  vendorProductType: string
) {
  const params = new URLSearchParams({ legalType, cif, vendorProductType });
  return insuretechFetch<{ hasConsent: boolean; expiresAt?: string }>(
    `/online/client/documents/status?${params}`
  );
}

export async function fetchConsentQuestions(
  legalType: string,
  vendorProductType: string
) {
  const params = new URLSearchParams({ legalType, vendorProductType });
  return insuretechFetch<Record<string, unknown>>(
    `/online/client/documents/fetch-questions?${params}`
  );
}

export async function submitConsentAnswers(body: Record<string, unknown>) {
  return insuretechFetch<string>("/online/client/documents/submit-answers", {
    method: "POST",
    body,
  });
}

// ----- Order V3 -----

export async function createOrder(body: Record<string, unknown>) {
  return insuretechFetch<{ id: number; productType: string; hash: string }>(
    "/online/offers/order/v3",
    { method: "POST", body }
  );
}

// ----- Payment V3 -----

export async function createPayment(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<string>(
    `/online/offers/payment/v3?orderHash=${encodeURIComponent(orderHash)}`,
    { method: "POST", body, accept: "text/plain" }
  );
}

export async function checkPayment(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<{ status: string; message: string }>(
    `/online/offers/payment/check/v3?orderHash=${encodeURIComponent(orderHash)}`,
    { method: "POST", body }
  );
}

export async function createPaymentLoan(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<string>(
    `/online/offers/payment/loan/v3?orderHash=${encodeURIComponent(orderHash)}`,
    { method: "POST", body, accept: "text/plain" }
  );
}

// ----- Policy V3 -----

export async function createPolicy(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/policies/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

// ----- Documents V3 -----

export async function getOfferDocument(offerId: number, orderHash: string) {
  return insuretechFetch<unknown>(
    `/online/offers/${offerId}/document/v3?orderHash=${orderHash}`
  );
}

export async function getPolicyDocument(policyId: number, orderHash: string) {
  return insuretechFetch<unknown>(
    `/online/policies/${policyId}/document/v3?orderHash=${orderHash}`
  );
}

// ----- RCA -----

export async function getVehicleByVin(vin: string) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/vehicles?VIN=${encodeURIComponent(vin)}`
  );
}

export async function getVehicleCategories() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/vehicles/categories"
  );
}

export async function getVehicleSubcategories(categoryId: number) {
  return insuretechFetch<{ id: number; name: string }[]>(
    `/online/vehicles/categories/${categoryId}/subcategories`
  );
}

export async function getVehicleMakes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/vehicles/makes"
  );
}

export async function getVehicleRegistrationTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/vehicles/registrationtypes"
  );
}

export async function getVehicleFuelTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/vehicles/fueltypes"
  );
}

export async function getVehicleActivityTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/vehicles/activitytypes"
  );
}

export async function getRcaProducts() {
  return insuretechFetch<Record<string, unknown>[]>("/online/products/rca");
}

export async function getRcaAdditionals() {
  return insuretechFetch<Record<string, unknown>[]>(
    "/online/products/rca/additionals"
  );
}

export async function generateRcaOffer(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/rca/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

export async function getRcaOfferDetails(offerId: number, orderHash: string) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/rca/${offerId}/details/v3?orderHash=${orderHash}`
  );
}

export async function getRcaReferenceTariff(
  orderId: number,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/rca/order/${orderId}/referenceTariff/v3?orderHash=${orderHash}`
  );
}

export async function createRcaPolicy(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/policies/rca/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

// ----- Travel -----

export async function getTravelProducts() {
  return insuretechFetch<Record<string, unknown>[]>("/online/products/travel");
}

export async function getTravelUtils() {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/travel/comparator/utils"
  );
}

export async function checkTravelEligibility(body: Record<string, unknown>) {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/travel/comparator/products/eligible",
    { method: "POST", body }
  );
}

export async function getTravelBodies(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>[]>(
    `/online/offers/travel/comparator/bodies/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

export async function generateTravelOffer(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/travel/comparator/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

// ----- House -----

export async function getHouseProducts() {
  return insuretechFetch<Record<string, unknown>[]>(
    "/online/products/house/facultative"
  );
}

export async function getHouseUtils() {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/house/comparator/utils"
  );
}

export async function getBuildingStructures() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/utils/buildingStructures"
  );
}

export async function getSeismicRiskTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/utils/seismicRiskTypes"
  );
}

export async function getInsuredSumTypes() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/utils/insuredSumTypes"
  );
}

export async function getConstructionType(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return insuretechFetch<Record<string, unknown>>(
    `/online/utils/constructionType?${query}`
  );
}

export async function checkHouseEligibility(body: Record<string, unknown>) {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/house/comparator/products/eligible",
    { method: "POST", body }
  );
}

export async function getHouseBodies(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>[]>(
    `/online/offers/house/comparator/bodies/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

export async function generateHouseOffer(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/house/comparator/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

// ----- PAD -----

export async function getPadUtils() {
  return insuretechFetch<Record<string, unknown>>(
    "/online/paid/pad/utils"
  );
}

export async function getPadCesionari() {
  return insuretechFetch<{ id: number; name: string }[]>(
    "/online/paid/pad/cesionari"
  );
}

export async function generatePadOffer(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/paid/pad/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

// ----- Malpraxis -----

export async function getMalpraxisUtils() {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/malpraxis/comparator/utils"
  );
}

export async function getMalpraxisProducts() {
  return insuretechFetch<Record<string, unknown>[]>(
    "/online/products/malpraxis"
  );
}

export async function checkMalpraxisEligibility(
  body: Record<string, unknown>
) {
  return insuretechFetch<Record<string, unknown>>(
    "/online/offers/malpraxis/comparator/products/eligible",
    { method: "POST", body }
  );
}

export async function getMalpraxisBodies(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>[]>(
    `/online/offers/malpraxis/comparator/bodies/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

export async function generateMalpraxisOffer(
  body: Record<string, unknown>,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/malpraxis/comparator/v3?orderHash=${orderHash}`,
    { method: "POST", body }
  );
}

export async function getMalpraxisOrderOffers(
  orderId: number,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>[]>(
    `/online/offers/malpraxis/order/${orderId}/v3?orderHash=${orderHash}`
  );
}

export async function getMalpraxisOfferDetails(
  offerId: number,
  orderHash: string
) {
  return insuretechFetch<Record<string, unknown>>(
    `/online/offers/malpraxis/${offerId}/details/v3?orderHash=${orderHash}`
  );
}
