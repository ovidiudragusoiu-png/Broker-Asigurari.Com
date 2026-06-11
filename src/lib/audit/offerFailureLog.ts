export const OFFER_FAILURE_AUDIT_ACTION = "OFFER_FAILED";

const COMPARATOR_OFFER_PATHS: RegExp[] = [
  /^online\/offers\/house\/comparator(\/v3)?($|\?)/,
  /^online\/offers\/travel\/comparator(\/v3)?($|\?)/,
  /^online\/offers\/malpraxis\/comparator(\/v3)?($|\?)/,
  /^online\/offers\/rca\/v3($|\?)/,
];

const SUCCESS_MESSAGE_MARKERS = [/prelucrat cu succes/i, /plata confirmata/i];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function isComparatorOfferPath(path: string): boolean {
  return COMPARATOR_OFFER_PATHS.some((pattern) => pattern.test(path));
}

export function inferProductTypeFromComparatorPath(path: string): string {
  if (path.includes("/house/")) return "HOUSE";
  if (path.includes("/travel/")) return "TRAVEL";
  if (path.includes("/malpraxis/")) return "MALPRAXIS";
  if (path.includes("/rca/")) return "RCA";
  return "UNKNOWN";
}

export function extractRawOfferErrorMessage(data: Record<string, unknown>): string | undefined {
  const candidates = [
    data.message,
    data.errorMessage,
    data.reason,
    data.saveError,
    data.errorDetail,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  return undefined;
}

export function isSuccessfulOfferMessage(message: string): boolean {
  return SUCCESS_MESSAGE_MARKERS.some((pattern) => pattern.test(message));
}

export function isFailedOfferResponse(
  httpStatus: number,
  data: Record<string, unknown>
): boolean {
  if (httpStatus >= 400) return true;
  if (data.error === true) return true;

  const premium = Number(data.policyPremium);
  const hasPremium = Number.isFinite(premium) && premium > 0;
  if (hasPremium) return false;

  const rawMessage = extractRawOfferErrorMessage(data);
  if (rawMessage && isSuccessfulOfferMessage(rawMessage)) return false;

  return Boolean(rawMessage);
}

export function buildOfferFailureAuditPayload(params: {
  path: string;
  httpStatus: number;
  requestBody?: Record<string, unknown>;
  responseBody: Record<string, unknown>;
}): Record<string, unknown> | null {
  if (!isFailedOfferResponse(params.httpStatus, params.responseBody)) {
    return null;
  }

  const requestBody = params.requestBody ?? {};
  const responseBody = params.responseBody;
  const productDetails = asRecord(responseBody.productDetails);
  const vendorDetails = asRecord(productDetails?.vendorDetails);
  const offerDetails =
    asRecord(requestBody.offerDetails) ?? asRecord(responseBody.offerDetails);

  const rawMessage =
    params.httpStatus >= 400
      ? extractRawOfferErrorMessage(responseBody) || `HTTP ${params.httpStatus}`
      : extractRawOfferErrorMessage(responseBody);

  if (!rawMessage) return null;

  return {
    path: params.path,
    httpStatus: params.httpStatus,
    productType: inferProductTypeFromComparatorPath(params.path),
    productId: requestBody.productId ?? responseBody.productId,
    productCode: requestBody.productCode ?? responseBody.productCode,
    productName:
      productDetails?.productName ?? requestBody.productName ?? responseBody.productName,
    vendorName:
      vendorDetails?.commercialName ??
      vendorDetails?.name ??
      responseBody.vendorName,
    rawMessage,
    policyPremium: responseBody.policyPremium,
    errorFlag: responseBody.error,
    context: {
      buildingStructureTypeId: offerDetails?.buildingStructureTypeId,
      paidConstructionType: offerDetails?.paidConstructionType,
      environmentType: offerDetails?.environmentType,
      noOfFloors: offerDetails?.noOfFloors,
    },
  };
}
