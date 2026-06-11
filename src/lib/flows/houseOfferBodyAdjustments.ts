/**
 * Per-insurer tweaks for house comparator bodies.
 * UI keeps user-facing values (e.g. 0 floors = parter); API payloads are adjusted per vendor rules.
 */

export interface HouseOfferBodyContext {
  noOfFloors: number;
  buildingSum: number;
  contentSum: number;
}

const GARANTA_CONTENT_RATIO = 0.1;

function bodyHaystack(body: Record<string, unknown>): string {
  const pd = body.productDetails as
    | { vendorDetails?: { name?: string; commercialName?: string }; productName?: string }
    | undefined;
  return [
    body.productCode,
    body.productName,
    body.vendorName,
    pd?.productName,
    pd?.vendorDetails?.name,
    pd?.vendorDetails?.commercialName,
  ]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");
}

export function isOmniasigHouseBody(body: Record<string, unknown>): boolean {
  return bodyHaystack(body).includes("omniasig");
}

export function isGarantaHouseBody(body: Record<string, unknown>): boolean {
  return bodyHaystack(body).includes("garanta");
}

/** Omniasig rejects 0 floors; parter-only houses stay 0 in the UI but send 1 to Omniasig only. */
export function omniasigFloorsForApi(noOfFloors: number): number {
  return noOfFloors === 0 ? 1 : noOfFloors;
}

/** Garanta quotes require content at exactly 10% of building sum. */
export function garantaContentSumForApi(buildingSum: number): number {
  if (buildingSum <= 0) return 0;
  return Math.round(buildingSum * GARANTA_CONTENT_RATIO * 100) / 100;
}

function patchRecordFloors(record: Record<string, unknown>, floors: number) {
  if ("noOfFloors" in record) {
    record.noOfFloors = floors;
  }
}

function patchRecordContent(record: Record<string, unknown>, contentSum: number) {
  if ("contentInsuredSum" in record) {
    record.contentInsuredSum = contentSum;
  }
}

export function adjustHouseComparatorBody(
  body: Record<string, unknown>,
  context: HouseOfferBodyContext
): Record<string, unknown> {
  const adjusted: Record<string, unknown> = {
    ...body,
    offerDetails:
      body.offerDetails && typeof body.offerDetails === "object"
        ? { ...(body.offerDetails as Record<string, unknown>) }
        : body.offerDetails,
    goodDetails:
      body.goodDetails && typeof body.goodDetails === "object"
        ? { ...(body.goodDetails as Record<string, unknown>) }
        : body.goodDetails,
  };

  if (isOmniasigHouseBody(body) && context.noOfFloors === 0) {
    const floors = omniasigFloorsForApi(context.noOfFloors);
    patchRecordFloors(adjusted, floors);
    if (adjusted.goodDetails && typeof adjusted.goodDetails === "object") {
      patchRecordFloors(adjusted.goodDetails as Record<string, unknown>, floors);
    }
    if (adjusted.offerDetails && typeof adjusted.offerDetails === "object") {
      patchRecordFloors(adjusted.offerDetails as Record<string, unknown>, floors);
    }
  }

  if (isGarantaHouseBody(body) && context.buildingSum > 0) {
    const content = garantaContentSumForApi(context.buildingSum);
    if (adjusted.offerDetails && typeof adjusted.offerDetails === "object") {
      patchRecordContent(adjusted.offerDetails as Record<string, unknown>, content);
    }
  }

  return adjusted;
}
