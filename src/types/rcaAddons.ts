export type RcaAdditionalVendorProductType = "ROAD_ASSIST" | "ACC_PERS";

export interface RcaAdditionalVendorDetails {
  id: number;
  name: string;
  commercialName: string;
  linkLogo: string;
}

export interface RcaAdditionalProduct {
  id: number;
  productName: string;
  productType: string;
  productSubType: string | null;
  vendorProductType: RcaAdditionalVendorProductType;
  insuranceClass: string;
  vat: number;
  vendorDetails: RcaAdditionalVendorDetails;
}

export interface RcaAdditionalOfferInstallment {
  number: number;
  year: number;
  amount: number;
  amountInRON: number | null;
  currency: string;
  dueDate: string;
}

export interface RcaAdditionalOffer {
  id: number;
  orderId: number;
  policyPremium: number;
  currency: string;
  periodMonths: number;
  policyStartDate?: string;
  policyEndDate?: string;
  error: boolean;
  message: string | null;
  productDetails: RcaAdditionalProduct;
  installments?: RcaAdditionalOfferInstallment[];
}

export interface RcaAdditionalOfferRequest {
  orderId: number;
  policyStartDate: string;
  periodMonths: string[];
  isLeasing: boolean;
  additionalProductRequest: { productId: number };
}

export interface RcaSelectedAddon {
  offerId: number;
  productId: number;
  label: string;
  premium: number;
  vendorProductType: RcaAdditionalVendorProductType;
}
