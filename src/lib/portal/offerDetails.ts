export function buildOfferDetailsPath(
  productType: string,
  offerId: number,
  orderHash: string
): string {
  const q = `orderHash=${encodeURIComponent(orderHash)}`;
  switch (productType.toUpperCase()) {
    case "MALPRAXIS":
      return `/online/offers/malpraxis/${offerId}/details/v3?${q}`;
    case "TRAVEL":
      return `/online/offers/travel/${offerId}/details/v3?${q}`;
    case "RCA":
      return `/online/offers/rca/${offerId}/details/v3?${q}`;
    case "HOUSE":
      return `/online/offers/house/${offerId}/details/v3?${q}`;
    default:
      return `/online/offers/${offerId}/details/v3?${q}`;
  }
}

export interface OfferPortalFields {
  orderId: number | null;
  vendorName: string | null;
  premium: number | null;
  currency: "RON" | "EUR" | "USD";
  startDate: string | null;
  endDate: string | null;
}

function parsePremium(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractOfferPortalFields(
  details: Record<string, unknown>
): OfferPortalFields {
  const productDetails = details.productDetails as Record<string, unknown> | undefined;
  const vendorDetails = productDetails?.vendorDetails as
    | Record<string, unknown>
    | undefined;

  const vendorName =
    (typeof vendorDetails?.commercialName === "string"
      ? vendorDetails.commercialName
      : null) ||
    (typeof vendorDetails?.name === "string" ? vendorDetails.name : null);

  const premium =
    parsePremium(details.price) ??
    parsePremium(details.policyPremium) ??
    parsePremium(productDetails?.policyPremium) ??
    parsePremium(productDetails?.premium);

  const currencyRaw =
    (typeof details.currency === "string" && details.currency) ||
    (typeof productDetails?.currency === "string" && productDetails.currency) ||
    "RON";
  const currency =
    currencyRaw === "EUR" || currencyRaw === "USD" ? currencyRaw : "RON";

  return {
    orderId: typeof details.orderId === "number" ? details.orderId : null,
    vendorName,
    premium,
    currency,
    startDate:
      typeof details.policyStartDate === "string" ? details.policyStartDate : null,
    endDate:
      typeof details.policyEndDate === "string" ? details.policyEndDate : null,
  };
}
