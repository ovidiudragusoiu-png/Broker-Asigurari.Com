import type { AddressRequest } from "./insuretech";
import type { RcaSelectedAddon } from "./rcaAddons";

// ----- Offer types (extracted from page.tsx) -----

/** Broker commission from InsureTech offer details (legal disclosure). */
export interface RcaBrokerCommission {
  amount?: number;
  percent?: number;
  minPercent?: number;
  maxPercent?: number;
}

/** Tariff / commission fields for ASF-mandated disclosure (shown in popover only). */
export interface RcaOfferLegalDisclosure {
  referenceTariff?: number;
  brokerCommission?: RcaBrokerCommission;
  directSettlementBrokerCommission?: RcaBrokerCommission;
  /** Net premium when returned in API specificFields (optional). */
  netPremium?: number;
  periodMonths?: number;
  withDirectSettlement?: boolean;
}

export interface RcaOffer {
  id: number;
  productId: string | number;
  productName: string;
  vendorName: string;
  vendorLogoUrl?: string;
  policyPremium: number;
  policyPremiumWithDirectSettlement?: number;
  directSettlementPremium?: number;
  withDirectSettlement?: boolean;
  currency: string;
  periodMonths?: number;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  error?: string;
  /** Populated from offer generation or lazy offer-details fetch. */
  legalDisclosure?: RcaOfferLegalDisclosure;
}

export interface SelectedOfferState {
  offer: RcaOffer;
  period: string;
  withDirectSettlement: boolean;
  premium: number;
  addons?: RcaSelectedAddon[];
}

// ----- Vehicle data -----

export interface VehicleData {
  vin: string;
  licensePlate: string;
  makeId: number | null;
  model: string;
  year: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  fuelTypeId: number | null;
  activityTypeId: number | null;
  engineCapacity: number | null;
  enginePowerKw: number | null;
  totalWeight: number | null;
  seats: number | null;
  registrationTypeId: number | null;
  firstRegistration: string | null;
  itpExpiration: string | null;
  vignetteExpiration: string | null;
}

// ----- Additional driver -----

export interface AdditionalDriver {
  firstName: string;
  lastName: string;
  cnp: string;
  idType: "CI" | "PASSPORT";
  idSeries: string;
  idNumber: string;
  driverLicenceDate: string;
}

// ----- Flow state -----

export type OwnerType = "PF" | "PJ";
export type OfferTab = "short" | "standard" | "direct";

/** Sub-steps within visual step 1 (Date vehicul) */
export type VehicleSubStep = "plate" | "locality" | "category" | "vin" | "details";

/** Sub-steps within visual step 2 (Identificare) */
export type IdentificationSubStep = "owner" | "company" | "dnt";

export interface RcaFlowState {
  // Phase 1: Pre-offer data (steps 1-2)
  licensePlate: string;
  vehicleSubStep: VehicleSubStep;
  identificationSubStep: IdentificationSubStep;
  vehicle: VehicleData;
  ownerType: OwnerType;
  cnpOrCui: string;
  email: string;
  skipDnt: boolean;

  // Vehicle mileage (user input in Step 1)
  mileage: string;

  // Plate-derived location (for offer generation)
  plateCountyId: number | null;
  plateCityId: number | null;
  platePostalCode: string;

  // Phase 2: Order/offer data (step 3)
  orderId: number | null;
  orderHash: string | null;
  offers: RcaOffer[];
  hasDirectSettlementData: boolean | null;
  selectedOffer: SelectedOfferState | null;
  loadingOffers: boolean;
  /** True after the current offer-generation batch has finished (success or failure). */
  offersReady: boolean;

  // Phase 3: Post-offer data (steps 4-5)
  registrationCertSeries: string;
  startDate: string;
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  registrationNumber: string;
  caenCode: string | null;
  companyTypeId: number | null;
  companyFound: boolean; // true if CUI lookup returned data
  idType: "CI" | "PASSPORT";
  idSeries: string;
  idNumber: string;
  address: AddressRequest;

  // Driver licence date (PF only, Step 4)
  driverLicenceDate: string;

  // Additional driver
  hasAdditionalDriver: boolean;
  additionalDriver: AdditionalDriver | null;

  // Contact
  phoneNumber: string;

  // Error
  error: string | null;
}

// ----- Reducer actions -----

export type RcaAction =
  | { type: "SET_PLATE"; plate: string }
  | { type: "SET_PLATE_LOCATION"; countyId: number | null; cityId: number | null; postalCode: string }
  | { type: "SET_VEHICLE_SUB_STEP"; subStep: VehicleSubStep }
  | { type: "SET_IDENTIFICATION_SUB_STEP"; subStep: IdentificationSubStep }
  | { type: "SET_CATEGORY"; categoryId: number; subcategoryId: number | null }
  | { type: "SET_VEHICLE"; vehicle: Partial<VehicleData> }
  | { type: "SET_OWNER_TYPE"; ownerType: OwnerType }
  | { type: "SET_CNP_OR_CUI"; value: string }
  | { type: "SET_EMAIL"; email: string }
  | { type: "SET_MILEAGE"; mileage: string }
  | { type: "SET_SKIP_DNT"; skip: boolean }
  | { type: "SET_ORDER"; orderId: number; orderHash: string }
  | { type: "SET_OFFERS"; offers: RcaOffer[]; hasDirectSettlementData: boolean | null }
  | { type: "APPEND_OFFERS"; offers: RcaOffer[] }
  | { type: "SET_LOADING_OFFERS"; loading: boolean }
  | { type: "SET_OFFERS_READY"; ready: boolean }
  | { type: "SELECT_OFFER"; selected: SelectedOfferState | null }
  | { type: "SET_POLICY_DETAILS"; details: Partial<Pick<RcaFlowState, "registrationCertSeries" | "startDate" | "ownerFirstName" | "ownerLastName" | "companyName" | "registrationNumber" | "caenCode" | "idType" | "idSeries" | "idNumber" | "driverLicenceDate">> }
  | { type: "SET_COMPANY_DATA"; companyName: string; registrationNumber: string; caenCode: string | null; companyTypeId: number | null }
  | { type: "SET_ADDRESS"; address: AddressRequest }
  | { type: "SET_ADDITIONAL_DRIVER_TOGGLE"; has: boolean }
  | { type: "SET_ADDITIONAL_DRIVER"; driver: AdditionalDriver }
  | { type: "SET_PHONE"; phone: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESTORE"; state: RcaFlowState }
  | { type: "RESET" };

// ----- Select option (for nomenclatures) -----

export interface SelectOption {
  id: number;
  name: string;
  categoryId?: number;
}
