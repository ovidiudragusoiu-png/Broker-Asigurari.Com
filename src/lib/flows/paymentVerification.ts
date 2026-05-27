export interface PaymentVerificationResult {
  success: boolean;
  message: string;
}

interface PaymentCheckEntry {
  offerId?: number | string;
  success?: boolean;
  message?: string;
}

const DEFAULT_FAILURE_MESSAGE =
  "Plata nu a fost confirmata de procesatorul de plati.";

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") return response;

  const trimmed = response.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function isEntry(value: unknown): value is PaymentCheckEntry {
  return typeof value === "object" && value !== null;
}

function normalizeOfferId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const expectedIds = Array.from(
    new Set(expectedOfferIds.filter((id) => Number.isInteger(id) && id > 0))
  );

  if (expectedIds.length === 0) {
    return {
      success: false,
      message: "Nu exista oferte valide pentru verificarea platii.",
    };
  }

  const parsed = parsePaymentCheckResponse(response);
  const entries = Array.isArray(parsed) ? parsed : [parsed];

  if (!entries.every(isEntry)) {
    return {
      success: false,
      message: "Raspuns invalid la verificarea platii.",
    };
  }

  for (const expectedId of expectedIds) {
    const singleEntryWithoutOfferId =
      expectedIds.length === 1 &&
      entries.length === 1 &&
      normalizeOfferId(entries[0].offerId) === null;
    const matchedEntry =
      entries.find((entry) => normalizeOfferId(entry.offerId) === expectedId) ||
      (singleEntryWithoutOfferId ? entries[0] : null);

    if (!matchedEntry) {
      return {
        success: false,
        message: "Nu am primit confirmarea platii pentru toate produsele.",
      };
    }

    if (matchedEntry.success !== true) {
      return {
        success: false,
        message: matchedEntry.message || DEFAULT_FAILURE_MESSAGE,
      };
    }
  }

  return { success: true, message: "" };
}
