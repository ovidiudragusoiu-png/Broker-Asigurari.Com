export interface PaymentVerificationResult {
  success: boolean;
  message: string;
}

type PaymentCheckEntry = {
  offerId?: unknown;
  success?: unknown;
  message?: unknown;
};

const DEFAULT_FAILURE_MESSAGE =
  "Plata nu a fost confirmata de procesatorul de plati.";

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") return response;

  const trimmed = response.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return response;
  }
}

function asPaymentEntries(parsed: unknown): PaymentCheckEntry[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (entry): entry is PaymentCheckEntry =>
        typeof entry === "object" && entry !== null
    );
  }

  if (typeof parsed !== "object" || parsed === null) return [];

  const objectResponse = parsed as Record<string, unknown>;
  for (const key of ["payments", "paymentResponses", "responses", "results", "offers"]) {
    const value = objectResponse[key];
    if (Array.isArray(value)) return asPaymentEntries(value);
  }

  return [objectResponse];
}

function entryMessage(entry: PaymentCheckEntry | undefined): string | null {
  return typeof entry?.message === "string" && entry.message.trim()
    ? entry.message
    : null;
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const uniqueExpectedOfferIds = Array.from(new Set(expectedOfferIds));
  if (uniqueExpectedOfferIds.length === 0) {
    return { success: false, message: DEFAULT_FAILURE_MESSAGE };
  }

  const parsed = parsePaymentCheckResponse(response);
  const entries = asPaymentEntries(parsed);
  if (entries.length === 0) {
    return { success: false, message: DEFAULT_FAILURE_MESSAGE };
  }

  for (const offerId of uniqueExpectedOfferIds) {
    const matchingEntry = entries.find((entry) => Number(entry.offerId) === offerId);
    if (!matchingEntry || matchingEntry.success !== true) {
      return {
        success: false,
        message: entryMessage(matchingEntry) || DEFAULT_FAILURE_MESSAGE,
      };
    }
  }

  return { success: true, message: "" };
}

export function paymentVerificationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `Nu am putut confirma plata: ${error.message}`;
  }
  return "Nu am putut confirma plata. Va rugam incercati din nou.";
}
