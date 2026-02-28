// ============================================================
// InsureTech API V3 - TypeScript Types
// Covers all 5 products: RCA, Travel, House, PAD, Malpraxis
// ============================================================

// ----- Shared Enums & Literals -----

export type LegalType = "PF" | "PJ";
export type IdType = "CI" | "PASSPORT" | "RESIDENCY_PERMIT";
export type AddressType = "HOME" | "MAILING";
export type VendorProductType = "RCA" | "TRAVEL" | "HOUSE" | "PAD" | "MALPRAXIS";

// ----- Address -----

export interface AddressRequest {
  countryId: number | null;
  cityId: number | null;
  countyId: number | null;
  postalCode: string;
  streetTypeId: number | null;
  floorId: number | null;
  addressType: AddressType;
  foreignCountyName: string | null;
  foreignCityName: string | null;
  streetName: string;
  streetNumber: string;
  building: string;
  entrance: string;
  apartment: string;
}

export interface AddressResponse extends AddressRequest {
  id: number;
  countryName: string | null;
  countyName: string | null;
  cityName: string | null;
  streetTypeName: string | null;
  floorName: string | null;
}

// ----- Person -----

export interface PersonRequestPF {
  legalType: "PF";
  firstName: string;
  lastName: string;
  idType: IdType;
  idSerial: string;
  idNumber: string;
  idExpirationDate: string | null;
  driverLicenceDate: string | null;
  email: string;
  phoneNumber: string;
  address: AddressRequest;
  cif: number; // CNP
  policyPartyType?: string; // "INSURED" | "CONTRACTOR" | "CLIENT" - required for order creation
}

export interface PersonRequestPJ {
  legalType: "PJ";
  companyName: string;
  registrationNumber: string;
  caenCode: string | null;
  companyTypeId: number | null;
  email: string;
  phoneNumber: string;
  address: AddressRequest;
  cif: number; // CUI
  policyPartyType?: string; // "INSURED" | "CONTRACTOR" | "CLIENT" - required for order creation
}

export type PersonRequest = PersonRequestPF | PersonRequestPJ;

export interface PersonResponse {
  id: number;
  legalType: LegalType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  registrationNumber?: string;
  caenCode?: string | null;
  companyTypeId?: number | null;
  idType?: IdType;
  idSerial?: string;
  idNumber?: string;
  idExpirationDate?: string | null;
  driverLicenceDate?: string | null;
  email: string;
  phoneNumber: string;
  cif: number;
  address: AddressResponse;
}

// ----- Helper Data (countries, counties, cities, etc.) -----

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface County {
  id: number;
  name: string;
  code: string;
}

export interface City {
  id: number;
  name: string;
  countyId: number;
  uniquePostalCode: string | null;
}

export interface PostalCode {
  postalCode: string;
  streetName: string;
}

export interface StreetType {
  id: number;
  name: string;
}

export interface Floor {
  id: number;
  name: string;
}

export interface CompanyType {
  id: number;
  name: string;
}

export interface CaenCode {
  code: string;
  name: string;
}

export interface CompanyLookup {
  companyName: string;
  registrationNumber: string;
  caenCode: string | null;
  companyTypeId: number | null;
  cif: number;
  address: AddressResponse;
}

// ----- Consent & DNT Flow -----

export interface ConsentStatusResponse {
  signedDocuments: boolean;
}

export type ConsentAnswerType = "checkbox_oneOf" | "checkbox_allIn" | "text";

export interface ConsentQuestion {
  id: string; // e.g. "inputGroupName_10"
  label: string;
  description: string | null;
  type: ConsentAnswerType;
  hiddenByAnswers: string[];
  answers: ConsentAnswer[];
}

export interface ConsentAnswer {
  id: string; // e.g. "inputName_47"
  label: string;
  mandatory: boolean;
  defaultValue: string; // "true" or "false"
  extraField: { name: string; label: string } | null;
}

export interface ConsentSection {
  title: string;
  questions: ConsentQuestion[];
}

export interface ConsentQuestionsResponse {
  sections: ConsentSection[];
  communicationChannels: string[]; // e.g. ["communicationChannelEmail", ...]
}

export interface ConsentSubmitRequest {
  personBaseRequest: PersonRequest;
  communicationChannelEmail: boolean;
  communicationChannelPhoneNo: boolean;
  communicationChannelAddress: boolean;
  formInputData: Record<string, boolean | string>;
  vendorProductType: VendorProductType;
  website: string;
}

// ----- Order (V3) -----

export interface OrderCreateRequest {
  vendorProductType: VendorProductType;
  mainInsuredDetails: PersonRequest;
  contractorDetails?: PersonRequest;
  clientDetails?: PersonRequest;
  goodDetails?: HouseGoodDetails; // For HOUSE orders
}

export interface OrderCreateResponse {
  id: number;
  productType: VendorProductType;
  hash: string; // This is the orderHash - MANDATORY for all subsequent calls
}

// ----- Payment (V3) -----

export interface PaymentRequest {
  orderId: number;
  offerId: number;
  successUrl: string;
  failUrl: string;
}

export interface PaymentCheckRequest {
  orderId: number;
  offerId: number;
}

export interface PaymentCheckResponse {
  status: string;
  message: string;
}

export type PaymentLoanRequest = PaymentRequest;

// ----- Policy (V3) -----

export interface PolicyCreateRequest {
  orderId: number;
  offerId: number;
  padOfferId?: number; // For House policies with integrated PAD
}

export interface PolicyResponse {
  id: number;
  policyNumber: string;
  status: string;
}

// ----- Product (shared) -----

export interface ProductResponse {
  id: string;
  productName: string;
  vendorName?: string;
  vendorDetails?: Record<string, unknown>;
}

// ============================================================
// RCA Specific Types
// ============================================================

export interface VehicleLookup {
  vin: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  year?: number;
  categoryId?: number;
  subcategoryId?: number;
  fuelTypeId?: number;
  engineCapacity?: number;
  totalWeight?: number;
  seats?: number;
  registrationTypeId?: number;
}

export interface VehicleCategory {
  id: number;
  name: string;
}

export interface VehicleSubcategory {
  id: number;
  name: string;
  categoryId: number;
}

export interface VehicleMake {
  id: number;
  name: string;
}

export interface VehicleRegistrationType {
  id: number;
  name: string;
}

export interface VehicleFuelType {
  id: number;
  name: string;
}

export interface RcaOfferRequest {
  orderId: number;
  productId: string;
  startDate: string;
  vehicleDetails: {
    vin: string;
    licensePlate: string;
    makeId: number;
    model: string;
    year: number;
    categoryId: number;
    subcategoryId: number;
    fuelTypeId: number;
    engineCapacity: number;
    totalWeight: number;
    seats: number;
    registrationTypeId: number;
    activityTypeId?: number;
  };
  ownerDetails: PersonRequest;
  userDetails?: PersonRequest;
  leasingDetails?: PersonRequest;
  additionalProducts?: string[];
}

export interface RcaOfferResponse {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  installments: InstallmentInfo[];
  error?: string;
  message?: string;
}

export interface InstallmentInfo {
  installmentNo: number;
  amount: number;
  dueDate: string;
}

export interface ReferenceTariffResponse {
  baarTariff: number;
  bonusMalus: string;
}

// ============================================================
// Travel Specific Types
// ============================================================

export interface TravelZone {
  code: string;
  name: string;
}

export interface TravelPurpose {
  code: string;
  name: string;
}

export interface TravelMethod {
  code: string;
  name: string;
}

export interface TravelUtils {
  travelZone: TravelZone[];
  travelPurpose: TravelPurpose[];
  travelMethod: TravelMethod[];
  vendorSpecificDetails: Record<string, unknown>[];
}

export interface TravelOfferDetailsRequest {
  travelZone: string;
  travelPurpose: string;
  travelMethod: string;
  destinationCountryId: number;
  residencyCountryId?: number;
  summerSports?: boolean;
  winterSports?: boolean;
  withStorno?: boolean;
  stornoInsuredValueEUR?: number;
  stornoStartDate?: string;
  bookingDate?: string;
  roadAssistance?: boolean;
  vehiclePlateNo?: string;
  vehicleVIN?: string;
  vehicleFirstRegistration?: string;
  isClientInRomania?: boolean;
}

export interface TravelEligibilityRequest {
  productIds: number[];
  policyStartDate: string;
  policyEndDate: string;
  insuredsNumber: number;
  offerDetails: TravelOfferDetailsRequest;
}

export interface TravelBodiesRequest {
  orderId: number;
  productIds: number[];
  policyStartDate: string;
  policyEndDate: string;
  offerDetails: TravelOfferDetailsRequest;
}

export interface TravelOfferResponse {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  coverages: TravelCoverage[];
  error?: string;
  message?: string;
}

export interface TravelCoverage {
  name: string;
  sumInsured: number;
  currency: string;
}

// ============================================================
// House Specific Types
// ============================================================

export interface HouseUtils {
  constructionTypes: { id: number; name: string }[];
  finishTypes: { id: number; name: string }[];
  annexTypes: { id: number; name: string }[];
  environmentTypes: { id: number; name: string }[];
  vendorSpecificDetails: Record<string, unknown>[];
}

export interface BuildingStructure {
  id: number;
  name: string;
}

export interface SeismicRiskType {
  id: number;
  name: string;
}

export interface InsuredSumType {
  id: number;
  name: string;
}

export interface HouseGoodDetails {
  constructionTypeId: number;
  constructionYear: number;
  surfaceArea: number;
  numberOfRooms: number;
  finishTypeId: number;
  environmentTypeId: number;
  address: AddressRequest;
  buildingStructureId?: number;
  seismicRiskTypeId?: number;
}

export interface HouseEligibilityRequest {
  clientId: number;
  productIds: string[];
  goodDetails: HouseGoodDetails;
}

export interface HouseBodiesRequest {
  orderId: number;
  productIds: string[];
  goodDetails: HouseGoodDetails;
  insuredSums: {
    buildingSum: number;
    contentSum: number;
    annexSum?: number;
  };
  withPad?: boolean;
  cessions?: HouseCession[];
  specificDetails?: Record<string, unknown>;
}

export interface HouseCession {
  bankId: number;
  contractNumber: string;
  amount: number;
}

export interface HouseOfferResponse {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  padOffer?: {
    id: number;
    premium: number;
  };
  coverages: HouseCoverage[];
  error?: string;
  message?: string;
}

export interface HouseCoverage {
  name: string;
  sumInsured: number;
  premium: number;
}

// ============================================================
// PAD Specific Types
// ============================================================

export interface PadUtils {
  buildingType: string[];      // ["A", "B"]
  environmentType: string[];   // ["Urban", "Rural"]
}

export interface PadCesionar {
  cif: string;
  name: string;
  legalType: string;
}

export interface PadGoodDetails {
  goodType: "HOME";
  padPropertyType: string;
  environmentType: string;
  buildingStructureTypeId: number;
  constructionType: string;
  constructionTypeId: number;
  constructionYear: number;
  area: number;
  noOfRooms: number;
  noOfFloors: number;
  usableArea: number;
  noOfConstructedBuildings: number;
  padBuildingIdentificationMention?: string;
  addressRequest: AddressRequest;
}

export interface PadOfferRequest {
  orderId: number;
  productId: number;
  policyStartDate: string;
  policyEndDate: string;
  offerDetails: {
    notesCesionari?: string;
    cesionari?: PadCesionar[];
  };
}

export interface PadOfferResponse {
  id: number;
  policyPremium: number;
  currency: string;
  installments?: InstallmentInfo[];
  productDetails?: {
    productName?: string;
    vendorDetails?: { linkLogo?: string };
  };
  error: boolean;
  message?: string;
}

// ============================================================
// Malpraxis Specific Types
// ============================================================

export interface MalpraxisUtils {
  operatingAuthorizationType: { id: number; name: string }[];
  moralDamagesLimit: { id: number; value: number; name: string }[];
  retroactivePeriod: { id: string; name: string }[];
  currency: { id: string; name: string }[];
  installmentsNo: number[];
  vendorSpecificDetails: Record<string, unknown>[];
  professions: MalpraxisProfession[];
}

export interface MalpraxisProfession {
  id: string;
  name: string;
  categories: MalpraxisCategory[];
}

export interface MalpraxisCategory {
  id: string;
  name: string;
  type: string;
  subcategories?: MalpraxisSubcategory[];
}

export interface MalpraxisSubcategory {
  id: string;
  name: string;
}

export interface MalpraxisEligibilityRequest {
  clientId: number;
  productIds: string[];
  policyStartDate: string;
  policyEndDate: string;
  offerDetails: {
    malpraxisProfessionId: string;
    category: string;
    categoryType: string;
    generalLimit: string;
    customMoralDamagesLimit: number;
    moralDamagesLimit: number;
    currency: string;
    operatingAuthorizationType: number;
    installmentsNo: number;
    retroactivePeriod: string;
  };
}

export interface MalpraxisBodiesRequest {
  orderId: number;
  productIds: string[];
  policyStartDate: string;
  policyEndDate: string;
  offerDetails: MalpraxisEligibilityRequest["offerDetails"];
  specificDetails?: Record<string, unknown>;
}

export interface MalpraxisOfferResponse {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  installments: InstallmentInfo[];
  productDetails?: Record<string, unknown>;
  error?: string;
  message?: string;
}

// ============================================================
// API Error Response
// ============================================================

export interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  timestamp?: string;
}
