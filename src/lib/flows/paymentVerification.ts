const DEFAULT_UNCONFIRMED_MESSAGE =
  "Plata nu a fost confirmata de procesatorul de plati.";

type PaymentCheckEntry = {
  offerId: number;
  success: boolean;
  message?: string | null;
};

function parsePaymentCheckResponse(response: unknown): PaymentCheckEntry[] {
  let parsed = response;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error("Raspuns invalid la verificarea platii.");
    }
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  if (entries.length === 0) {
    throw new Error("Raspuns invalid la verificarea platii.");
  }

  return entries.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as PaymentCheckEntry).offerId !== "number" ||
      typeof (entry as PaymentCheckEntry).success !== "boolean"
    ) {
      throw new Error("Raspuns invalid la verificarea platii.");
    }

    return entry as PaymentCheckEntry;
  });
}

export function getPaymentCheckFailureMessage(
  response: unknown,
  expectedOfferIds: number[]
): string | null {
  const expectedIds = [...new Set(expectedOfferIds)];
  const results = parsePaymentCheckResponse(response);
  const byOfferId = new Map(results.map((result) => [result.offerId, result]));

  for (const offerId of expectedIds) {
    const result = byOfferId.get(offerId);
    if (!result) {
      return DEFAULT_UNCONFIRMED_MESSAGE;
    }
    if (!result.success) {
      return result.message || DEFAULT_UNCONFIRMED_MESSAGE;
    }
  }

  return null;
}
