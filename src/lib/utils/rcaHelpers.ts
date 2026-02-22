import type { PersonRequest } from "@/types/insuretech";
import type { RcaOffer, VehicleData, RcaFlowState, AdditionalDriver, SelectOption } from "@/types/rcaFlow";
import { emptyPersonPF, emptyPersonPJ } from "@/components/shared/PersonForm";
import { emptyAddress } from "@/components/shared/AddressForm";
import { formatDate } from "./formatters";

// ============================================================
// DRPCIV data extraction helpers (extracted from VehicleForm.tsx)
// ============================================================

export function readString(
  data: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function readNumber(
  data: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    if (value && typeof value === "object" && "id" in value) {
      const idValue = (value as { id?: unknown }).id;
      if (typeof idValue === "number" && Number.isFinite(idValue)) {
        return idValue;
      }
    }
  }
  return null;
}

// ============================================================
// Offer normalization (extracted from rca/page.tsx)
// ============================================================

export type RcaOfferApi = {
  offerId?: number;
  id?: number;
  productId?: number | string;
  productName?: string;
  vendorName?: string;
  policyPremium?: number;
  currency?: string;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  productDetails?: {
    productName?: string;
    vendorDetails?: {
      commercialName?: string;
      logo?: string;
      logoUrl?: string;
      imageUrl?: string;
    };
  };
  offerDetails?: {
    policyPremium?: number;
    policyPremiumWithDirectSettlement?: number;
    currency?: string;
    periodMonths?: number;
    error?: boolean;
    message?: string | null;
    withDirectSettlement?: boolean;
    directSettlement?: {
      premium?: number;
    };
    installments?: {
      number: number;
      amount: number;
      dueDate: string;
    }[];
  };
  error?: boolean;
  message?: string | null;
  premium?: number | string;
  totalPremium?: number | string;
  periodMonths?: number;
  policyPremiumWithDirectSettlement?: number | string;
  withDirectSettlement?: boolean;
  directSettlement?: {
    premium?: number | string;
  };
  vendorDetails?: {
    commercialName?: string;
    logo?: string;
    logoUrl?: string;
    imageUrl?: string;
  };
};

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function extractRcaOffers(input: unknown): RcaOfferApi[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => extractRcaOffers(item));
  }
  if (!input || typeof input !== "object") return [];
  const obj = input as Record<string, unknown>;

  const looksLikeOffer =
    "offerId" in obj ||
    "id" in obj ||
    "offerDetails" in obj ||
    "policyPremium" in obj ||
    "premium" in obj ||
    "totalPremium" in obj;

  if (looksLikeOffer) {
    return [obj as unknown as RcaOfferApi];
  }

  if (Array.isArray(obj.offers)) {
    return extractRcaOffers(obj.offers);
  }

  const nested = Object.values(obj)
    .filter((v) => v && typeof v === "object")
    .flatMap((v) => extractRcaOffers(v));
  return nested;
}

// Canonical vendor name mapping for consistent grouping & display
const VENDOR_CANONICAL: Record<string, string> = {
  "hellas": "Hellas",
  "hellas direct": "Hellas",
  "hellas next ins": "Hellas",
  "allianz": "Allianz Tiriac",
  "allianz tiriac": "Allianz Tiriac",
  "allianz-tiriac": "Allianz Tiriac",
  "signal iduna": "Signal Iduna",
  "eazy insure": "Eazy Insure",
};

export function normalizeVendorName(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return VENDOR_CANONICAL[lower] ?? raw;
}

// Green Card (Carte Verde) excluded countries per insurer
const VENDOR_GREEN_CARD_EXCLUSIONS: Record<string, string[]> = {
  "Omniasig": ["AL", "AZ", "BY", "IR", "MA", "MD", "MK", "RUS", "TN", "TR", "UA"],
  "Groupama": ["BY", "IR", "RUS"],
  "Grawe": ["AZ", "BY", "IR", "MA", "RUS", "TN"],
  "Asirom": ["BY", "IR", "RUS"],
  "Axeria": ["BY", "IL", "IR", "MA", "MK", "RUS", "TN"],
  "Generali": ["AZ", "BY", "IL", "IR", "RUS"],
  "Eazy Insure": ["AZ", "BY", "IR", "RUS", "UA"],
  "Allianz Tiriac": ["BY", "IR", "RUS"],
  "Hellas": ["BY", "IR", "MA", "RUS", "TN", "UA"],
};

export function getGreenCardExclusions(vendorName: string): string[] {
  return VENDOR_GREEN_CARD_EXCLUSIONS[vendorName] ?? [];
}

export function normalizeRcaOffer(
  raw: RcaOfferApi,
  fallbackProductName: string,
  fallbackProductId: string | number,
  fallbackVendorName?: string
): RcaOffer {
  const isError = raw.offerDetails?.error || raw.error;
  const premium =
    toNumber(raw.offerDetails?.policyPremium) ??
    toNumber(raw.policyPremium) ??
    toNumber(raw.totalPremium) ??
    toNumber(raw.premium) ??
    0;
  const directPremium =
    toNumber(raw.offerDetails?.policyPremiumWithDirectSettlement) ??
    toNumber(raw.policyPremiumWithDirectSettlement) ??
    toNumber(raw.offerDetails?.directSettlement?.premium) ??
    toNumber(raw.directSettlement?.premium);
  return {
    id: raw.offerId ?? raw.id ?? 0,
    productId: raw.productId ?? fallbackProductId,
    productName:
      raw.productDetails?.productName || raw.productName || fallbackProductName,
    vendorName: normalizeVendorName(
      raw.productDetails?.vendorDetails?.commercialName ||
      raw.vendorDetails?.commercialName ||
      raw.vendorName ||
      fallbackVendorName ||
      ""
    ),
    vendorLogoUrl:
      raw.productDetails?.vendorDetails?.logoUrl ||
      raw.productDetails?.vendorDetails?.imageUrl ||
      raw.productDetails?.vendorDetails?.logo ||
      raw.vendorDetails?.logoUrl ||
      raw.vendorDetails?.imageUrl ||
      raw.vendorDetails?.logo,
    policyPremium: premium,
    policyPremiumWithDirectSettlement: directPremium,
    directSettlementPremium: directPremium,
    withDirectSettlement:
      raw.offerDetails?.withDirectSettlement ?? raw.withDirectSettlement,
    currency: raw.offerDetails?.currency || raw.currency || "RON",
    periodMonths: raw.offerDetails?.periodMonths ?? raw.periodMonths,
    installments:
      raw.offerDetails?.installments?.map((i) => ({
        installmentNo: i.number,
        amount: i.amount,
        dueDate: i.dueDate,
      })) || raw.installments,
    error: isError
      ? raw.offerDetails?.message || raw.message || "Eroare oferta"
      : undefined,
  };
}

// ============================================================
// Offer filtering & display helpers
// ============================================================

export function toRcaDate(date: string): string {
  return `${date}T00:00:00`;
}

export function periodText(period?: number): string {
  if (!period) return "";
  return `${period} ${period === 1 ? "luna" : "luni"}`;
}

export function isOfferInPeriod(offer: RcaOffer, period: string): boolean {
  if (period === "12") {
    return String(offer.periodMonths ?? 12) === "12";
  }
  return String(offer.periodMonths ?? "") === period;
}

export function getLocalVendorLogo(vendorName: string): string | undefined {
  const normalized = vendorName.toLowerCase().trim();
  const map: Record<string, string> = {
    groupama: "/insurers/logos/Groupama.svg",
    grawe: "/insurers/logos/Grawe.svg",
    asirom: "/insurers/logos/Asirom.svg",
    omniasig: "/insurers/logos/Omniasig.svg",
    generali: "/insurers/logos/Generali.svg",
    "signal iduna": "/insurers/logos/Signal Iduna.svg",
    uniqa: "/insurers/logos/Uniqa.svg",
    allianz: "/insurers/logos/Allianz.svg",
    hellas: "/insurers/logos/Hellas.svg",
    axeria: "/insurers/logos/Axeria.svg",
  };

  const direct = map[normalized];
  if (direct) return direct;

  const byContains = Object.entries(map).find(([key]) => normalized.includes(key));
  return byContains?.[1];
}

export function getOfferPrice(offer: RcaOffer, withDirectSettlement: boolean): number | null {
  if (!withDirectSettlement) {
    return offer.policyPremium;
  }
  const normalizedName = (offer.productName || "").toLowerCase();
  const looksDirectFromName =
    normalizedName.includes("direct settlement") ||
    normalizedName.includes("decontare");
  return (
    offer.directSettlementPremium ??
    offer.policyPremiumWithDirectSettlement ??
    (offer.withDirectSettlement || looksDirectFromName
      ? offer.policyPremium
      : null)
  );
}

export function isDirectSettlementOffer(offer: RcaOffer): boolean {
  if (typeof offer.withDirectSettlement === "boolean") {
    return offer.withDirectSettlement;
  }
  const normalizedName = (offer.productName || "").toLowerCase();
  return (
    normalizedName.includes("direct settlement") ||
    normalizedName.includes("decontare")
  );
}

export function pickOfferByVariant(
  vendorOffers: RcaOffer[],
  period: string,
  withDirectSettlement: boolean
): RcaOffer | null {
  const candidates = vendorOffers.filter(
    (offer) => !offer.error && isOfferInPeriod(offer, period)
  );
  if (candidates.length === 0) return null;

  const directFlagMatches = candidates.filter(
    (offer) => isDirectSettlementOffer(offer) === withDirectSettlement
  );
  const pool = directFlagMatches.length > 0 ? directFlagMatches : candidates;
  return pool[0] ?? null;
}

// ============================================================
// Person/driver builders
// ============================================================

const DEFAULT_STREET_TYPE_ID = 1;

export function normalizePersonForRca(person: PersonRequest): PersonRequest {
  const streetTypeId = person.address.streetTypeId ?? DEFAULT_STREET_TYPE_ID;
  return {
    ...person,
    address: {
      ...person.address,
      streetTypeId,
    },
  };
}

export function toDriver(person: PersonRequest) {
  if (person.legalType !== "PF") return null;
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    cnp: String(person.cif),
    idType: person.idType,
    idSeries: person.idSerial,
    idNumber: person.idNumber,
    phoneNumber: person.phoneNumber,
  };
}

// Romanian plate prefix → county name mapping (for matching API county list)
export const PLATE_COUNTY_MAP: Record<string, string> = {
  B: "Bucuresti", AB: "Alba", AR: "Arad", AG: "Arges", BC: "Bacau", BH: "Bihor",
  BN: "Bistrita-Nasaud", BT: "Botosani", BV: "Brasov", BR: "Braila", BZ: "Buzau",
  CS: "Caras-Severin", CL: "Calarasi", CJ: "Cluj", CT: "Constanta", CV: "Covasna",
  DB: "Dambovita", DJ: "Dolj", GL: "Galati", GR: "Giurgiu", GJ: "Gorj",
  HR: "Harghita", HD: "Hunedoara", IL: "Ialomita", IS: "Iasi", IF: "Ilfov",
  MM: "Maramures", MH: "Mehedinti", MS: "Mures", NT: "Neamt", OT: "Olt",
  PH: "Prahova", SM: "Satu Mare", SJ: "Salaj", SB: "Sibiu", SV: "Suceava",
  TR: "Teleorman", TM: "Timis", TL: "Tulcea", VS: "Vaslui", VL: "Valcea", VN: "Vrancea",
};

/**
 * Extract the county prefix from a Romanian license plate.
 */
export function getPlateCountyPrefix(plate: string): string {
  const clean = plate.replace(/\s+/g, "").toUpperCase();
  // Bucharest: B followed by digits
  if (/^B\d/.test(clean)) return "B";
  // Other counties: 2-letter prefix
  const prefix = clean.substring(0, 2);
  if (PLATE_COUNTY_MAP[prefix]) return prefix;
  return "B"; // fallback
}

/**
 * Find county ID from API counties list based on plate prefix.
 */
export function findCountyIdForPlate(
  plate: string,
  counties: { id: number; name: string }[]
): number | null {
  const prefix = getPlateCountyPrefix(plate);
  const countyName = PLATE_COUNTY_MAP[prefix];
  if (!countyName) return null;

  // Try exact match first, then partial/normalized match
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const target = normalize(countyName);
  const match = counties.find((c) => normalize(c.name) === target)
    || counties.find((c) => normalize(c.name).includes(target));
  return match?.id ?? null;
}

/**
 * Build a PersonRequest with minimal real data + placeholders for order creation.
 * The API requires a full PersonRequest but we only have CNP/CUI + email at this point.
 * Pass countyId/cityId from plate prefix lookup when available to improve offer success rate.
 */
export function buildMinimalPersonForOrder(
  ownerType: "PF" | "PJ",
  cnpOrCui: string,
  email: string,
  countyId?: number | null,
  cityId?: number | null,
  postalCode?: string,
  companyData?: { companyName?: string; registrationNumber?: string; caenCode?: string | null; companyTypeId?: number | null }
): PersonRequest {
  const defaultAddress = {
    ...emptyAddress(),
    countyId: countyId ?? 1,
    cityId: cityId ?? 1,
    streetTypeId: 1,
    streetName: "Strada",
    streetNumber: "1",
    postalCode: postalCode || "",
  };

  if (ownerType === "PF") {
    return {
      ...emptyPersonPF(),
      cif: Number(cnpOrCui) || 0,
      email,
      firstName: "Test",
      lastName: "Test",
      idSerial: "XX",
      idNumber: "000000",
      phoneNumber: "0700000000",
      driverLicenceDate: "2010-02-01",
      address: defaultAddress,
    };
  }
  return {
    ...emptyPersonPJ(),
    cif: Number(cnpOrCui) || 0,
    email,
    companyName: companyData?.companyName || "Firma",
    registrationNumber: companyData?.registrationNumber || "J00/0000/0000",
    caenCode: companyData?.caenCode ?? null,
    companyTypeId: companyData?.companyTypeId ?? null,
    phoneNumber: "0700000000",
    address: defaultAddress,
  };
}

/**
 * Build a full PersonRequest from the collected flow state (post-offer details).
 */
export function buildFullPersonFromFlowState(state: RcaFlowState): PersonRequest {
  if (state.ownerType === "PF") {
    return normalizePersonForRca({
      ...emptyPersonPF(),
      cif: Number(state.cnpOrCui) || 0,
      email: state.email,
      firstName: state.ownerFirstName,
      lastName: state.ownerLastName,
      idType: state.idType,
      idSerial: state.idSeries,
      idNumber: state.idNumber,
      phoneNumber: state.phoneNumber,
      address: state.address,
    });
  }
  return normalizePersonForRca({
    ...emptyPersonPJ(),
    cif: Number(state.cnpOrCui) || 0,
    email: state.email,
    companyName: state.companyName,
    registrationNumber: state.registrationNumber,
    caenCode: state.caenCode,
    companyTypeId: state.companyTypeId,
    phoneNumber: state.phoneNumber,
    address: state.address,
  });
}

/**
 * Build a driver details object from an AdditionalDriver.
 */
export function toDriverFromAdditional(driver: AdditionalDriver) {
  return {
    firstName: driver.firstName,
    lastName: driver.lastName,
    cnp: driver.cnp,
    idType: driver.idType,
    idSeries: driver.idSeries,
    idNumber: driver.idNumber,
    phoneNumber: "",
  };
}

// ============================================================
// Category filtering
// ============================================================

// Map API category IDs to the 4 user-facing RCA categories.
// API names don't always contain obvious keywords, so we match by ID.
const RCA_ALLOWED_CATEGORY_IDS = new Set([
  1, // Autoturisme (autoturism)
  6, // Alte autovehicule destinate transportului de marfa (autoutilitara <3.5t)
  4, // Motocicletele, mopede, ATVuri (moto)
  5, // Remorci si semiremorci (remorca)
]);

export function filterRcaCategories(categories: SelectOption[]): SelectOption[] {
  return categories.filter((cat) => RCA_ALLOWED_CATEGORY_IDS.has(cat.id));
}

// ============================================================
// License plate validation
// ============================================================

export function validateLicensePlate(plate: string): boolean {
  const cleaned = plate.replace(/[\s\-]/g, "").toUpperCase();
  // B + 2-3 digits + 3 letters, or 2-letter county code + 2-3 digits + 3 letters
  return /^(B\d{2,3}[A-Z]{3}|[A-Z]{2}\d{2,3}[A-Z]{3})$/.test(cleaned);
}

// ============================================================
// Empty state factory
// ============================================================

export function emptyVehicle(): VehicleData {
  return {
    vin: "",
    licensePlate: "",
    makeId: null,
    model: "",
    year: null,
    categoryId: null,
    subcategoryId: null,
    fuelTypeId: null,
    activityTypeId: null,
    engineCapacity: null,
    enginePowerKw: null,
    totalWeight: null,
    seats: null,
    registrationTypeId: null,
  };
}

export function emptyAdditionalDriver(): AdditionalDriver {
  return {
    firstName: "",
    lastName: "",
    cnp: "",
    idType: "CI",
    idSeries: "",
    idNumber: "",
    driverLicenceDate: "",
  };
}

export function emptyRcaFlowState(): RcaFlowState {
  return {
    licensePlate: "",
    vehicleSubStep: "plate",
    identificationSubStep: "owner",
    vehicle: emptyVehicle(),
    ownerType: "PF",
    cnpOrCui: "",
    email: "",
    skipDnt: false,

    plateCountyId: null,
    plateCityId: null,
    platePostalCode: "",

    orderId: null,
    orderHash: null,
    offers: [],
    hasDirectSettlementData: null,
    selectedOffer: null,
    loadingOffers: false,

    registrationCertSeries: "",
    startDate: formatDate(new Date(Date.now() + 86400000)), // tomorrow
    ownerFirstName: "",
    ownerLastName: "",
    companyName: "",
    registrationNumber: "",
    caenCode: null,
    companyTypeId: null,
    companyFound: false,
    idType: "CI",
    idSeries: "",
    idNumber: "",
    address: emptyAddress(),

    hasAdditionalDriver: false,
    additionalDriver: null,

    phoneNumber: "",

    error: null,
  };
}

// ============================================================
// Reducer
// ============================================================

export function rcaFlowReducer(state: RcaFlowState, action: import("@/types/rcaFlow").RcaAction): RcaFlowState {
  switch (action.type) {
    case "SET_PLATE":
      return { ...state, licensePlate: action.plate.toUpperCase(), vehicle: { ...state.vehicle, licensePlate: action.plate.toUpperCase() } };
    case "SET_PLATE_LOCATION":
      return { ...state, plateCountyId: action.countyId, plateCityId: action.cityId, platePostalCode: action.postalCode };
    case "SET_VEHICLE_SUB_STEP":
      return { ...state, vehicleSubStep: action.subStep };
    case "SET_IDENTIFICATION_SUB_STEP":
      return { ...state, identificationSubStep: action.subStep };
    case "SET_CATEGORY":
      return { ...state, vehicle: { ...state.vehicle, categoryId: action.categoryId, subcategoryId: action.subcategoryId } };
    case "SET_VEHICLE":
      return { ...state, vehicle: { ...state.vehicle, ...action.vehicle } };
    case "SET_OWNER_TYPE":
      return { ...state, ownerType: action.ownerType, cnpOrCui: "" };
    case "SET_CNP_OR_CUI":
      return { ...state, cnpOrCui: action.value };
    case "SET_EMAIL":
      return { ...state, email: action.email };
    case "SET_SKIP_DNT":
      return { ...state, skipDnt: action.skip };
    case "SET_ORDER":
      return { ...state, orderId: action.orderId, orderHash: action.orderHash };
    case "SET_OFFERS":
      return { ...state, offers: action.offers, hasDirectSettlementData: action.hasDirectSettlementData, loadingOffers: false };
    case "SET_LOADING_OFFERS":
      return { ...state, loadingOffers: action.loading };
    case "SELECT_OFFER":
      return { ...state, selectedOffer: action.selected };
    case "SET_POLICY_DETAILS":
      return { ...state, ...action.details };
    case "SET_COMPANY_DATA":
      return { ...state, companyName: action.companyName, registrationNumber: action.registrationNumber, caenCode: action.caenCode, companyTypeId: action.companyTypeId, companyFound: true };
    case "SET_ADDRESS":
      return { ...state, address: action.address };
    case "SET_ADDITIONAL_DRIVER_TOGGLE":
      return { ...state, hasAdditionalDriver: action.has, additionalDriver: action.has ? state.additionalDriver ?? emptyAdditionalDriver() : null };
    case "SET_ADDITIONAL_DRIVER":
      return { ...state, additionalDriver: action.driver };
    case "SET_PHONE":
      return { ...state, phoneNumber: action.phone };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESTORE":
      return { ...action.state };
    case "RESET":
      return emptyRcaFlowState();
    default:
      return state;
  }
}
