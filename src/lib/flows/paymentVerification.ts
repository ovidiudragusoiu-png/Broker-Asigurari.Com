import { api } from "@/lib/api/client";

type PaymentCheckPayload = Record<string, unknown> | unknown[] | string | null;

interface PaymentConfirmation {
  offerId: number | null;
  success: boolean;
}

export interface PaymentVerificationResult {
  confirmed: boolean;
  message: string;
  missingOfferIds: number[];
}

function parsePayload(payload: PaymentCheckPayload): unknown {
  if (typeof payload !== "string") return payload;

  const trimmed = payload.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readOfferId(record: Record<string, unknown>): number | null {
  const value = record.offerId ?? record.offerID;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function readSuccess(record: Record<string, unknown>): boolean {
  if (record.success === true || record.paid === true || record.isPaid === true) {
    return true;
  }

  const status = String(record.status ?? record.paymentStatus ?? "").toUpperCase();
  return ["APPROVED", "PAID", "SUCCESS", "SUCCEEDED", "CONFIRMED"].includes(status);
}

function readMessage(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  for (const child of Object.values(record)) {
    const nested = readMessage(child);
    if (nested) return nested;
  }

  return null;
}

function collectConfirmations(value: unknown): PaymentConfirmation[] {
  const parsed = parsePayload(value as PaymentCheckPayload);

  if (Array.isArray(parsed)) {
    return parsed.flatMap(collectConfirmations);
  }

  const record = asRecord(parsed);
  if (!record) return [];

  const confirmations: PaymentConfirmation[] = [];
  const offerId = readOfferId(record);
  if (offerId) {
    confirmations.push({ offerId, success: readSuccess(record) });
  }

  for (const key of ["data", "items", "offers", "payments", "results", "result"]) {
    if (key in record) {
      confirmations.push(...collectConfirmations(record[key]));
    }
  }

  return confirmations;
}

export async function verifyPaidOffers(
  orderHash: string,
  offerIds: number[]
): Promise<PaymentVerificationResult> {
  const expectedOfferIds = [...new Set(offerIds)].filter(
    (offerId) => Number.isInteger(offerId) && offerId > 0
  );

  if (!orderHash || expectedOfferIds.length === 0) {
    return {
      confirmed: false,
      message: "Parametrii de plata sunt invalizi.",
      missingOfferIds: expectedOfferIds,
    };
  }

  const payload = await api.post<PaymentCheckPayload>(
    `/online/offers/payment/check/v3?orderHash=${encodeURIComponent(orderHash)}`,
    { offerIds: expectedOfferIds },
    { Accept: "text/plain" }
  );

  const parsed = parsePayload(payload);
  const confirmedIds = new Set(
    collectConfirmations(parsed)
      .filter((confirmation) => confirmation.success && confirmation.offerId)
      .map((confirmation) => confirmation.offerId as number)
  );
  const missingOfferIds = expectedOfferIds.filter((offerId) => !confirmedIds.has(offerId));

  return {
    confirmed: missingOfferIds.length === 0,
    message:
      readMessage(parsed) ||
      (missingOfferIds.length
        ? `Plata nu a fost confirmata pentru oferta ${missingOfferIds.join(", ")}.`
        : "Plata a fost confirmata."),
    missingOfferIds,
  };
}
