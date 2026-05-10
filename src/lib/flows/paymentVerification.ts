import { api } from "@/lib/api/client";

interface PaymentCheckEntry {
  offerId: number | string;
  success: boolean;
  message?: string | null;
}

interface PaymentCheckEnvelope {
  offerId?: number | string;
  success?: boolean;
  message?: string | null;
  data?: unknown;
  results?: unknown;
  offers?: unknown;
  payments?: unknown;
}

export interface PaymentVerificationResult {
  success: boolean;
  message?: string;
  confirmedOfferIds: number[];
  missingOfferIds: number[];
  failedOfferIds: number[];
}

function uniquePositiveOfferIds(offerIds: number[]): number[] {
  return Array.from(
    new Set(
      offerIds.filter((offerId) => Number.isInteger(offerId) && offerId > 0)
    )
  );
}

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") return response;

  const trimmed = response.trim();
  if (!trimmed) return response;

  try {
    return JSON.parse(trimmed);
  } catch {
    return response;
  }
}

function extractEntries(response: unknown): PaymentCheckEntry[] {
  const parsed = parsePaymentCheckResponse(response);

  if (Array.isArray(parsed)) {
    return parsed.filter(isPaymentCheckEntry);
  }

  if (isPaymentCheckEntry(parsed)) {
    return [parsed];
  }

  if (isPaymentCheckEnvelope(parsed)) {
    for (const value of [
      parsed.data,
      parsed.results,
      parsed.offers,
      parsed.payments,
    ]) {
      const nestedEntries = extractEntries(value);
      if (nestedEntries.length > 0) return nestedEntries;
    }
  }

  return [];
}

function isPaymentCheckEntry(value: unknown): value is PaymentCheckEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as PaymentCheckEnvelope;
  return (
    (typeof entry.offerId === "number" || typeof entry.offerId === "string") &&
    typeof entry.success === "boolean"
  );
}

function isPaymentCheckEnvelope(value: unknown): value is PaymentCheckEnvelope {
  return !!value && typeof value === "object";
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const expected = uniquePositiveOfferIds(expectedOfferIds);
  const entries = extractEntries(response);
  const confirmedOfferIds: number[] = [];
  const failedOfferIds: number[] = [];
  let failureMessage: string | undefined;

  for (const offerId of expected) {
    const entry = entries.find((item) => Number(item.offerId) === offerId);
    if (!entry) continue;

    if (entry.success === true) {
      confirmedOfferIds.push(offerId);
    } else {
      failedOfferIds.push(offerId);
      failureMessage ||= entry.message || undefined;
    }
  }

  const missingOfferIds = expected.filter(
    (offerId) =>
      !confirmedOfferIds.includes(offerId) && !failedOfferIds.includes(offerId)
  );

  if (failedOfferIds.length > 0) {
    return {
      success: false,
      message:
        failureMessage ||
        "Plata nu a fost confirmata de procesatorul de plati.",
      confirmedOfferIds,
      missingOfferIds,
      failedOfferIds,
    };
  }

  if (missingOfferIds.length > 0) {
    return {
      success: false,
      message:
        "Nu am putut confirma plata pentru toate ofertele din comanda.",
      confirmedOfferIds,
      missingOfferIds,
      failedOfferIds,
    };
  }

  return {
    success: expected.length > 0,
    confirmedOfferIds,
    missingOfferIds,
    failedOfferIds,
  };
}

export async function verifyPaymentForOffers(
  orderHash: string,
  offerIds: number[]
): Promise<PaymentVerificationResult> {
  const expectedOfferIds = uniquePositiveOfferIds(offerIds);
  if (expectedOfferIds.length === 0) {
    return {
      success: false,
      message: "Parametrii de plata sunt invalizi.",
      confirmedOfferIds: [],
      missingOfferIds: [],
      failedOfferIds: [],
    };
  }

  const response = await api.post<unknown>(
    `/online/offers/payment/check/v3?orderHash=${encodeURIComponent(orderHash)}`,
    { offerIds: expectedOfferIds },
    { Accept: "text/plain" }
  );

  return verifyPaymentCheckResponse(response, expectedOfferIds);
}
