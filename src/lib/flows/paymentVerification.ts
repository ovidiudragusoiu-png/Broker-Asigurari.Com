export interface PaymentCheckEntry {
  offerId: number;
  success: boolean;
  message?: string | null;
}

export interface PaymentVerificationResult {
  success: boolean;
  message: string;
}

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

function normalizePaymentCheckEntries(response: unknown): PaymentCheckEntry[] {
  const parsed = parsePaymentCheckResponse(response);
  const values = Array.isArray(parsed) ? parsed : [parsed];

  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];

    const item = value as Record<string, unknown>;
    const offerId = Number(item.offerId);
    if (!Number.isFinite(offerId) || offerId <= 0) return [];

    return [{
      offerId,
      success: item.success === true,
      message: typeof item.message === "string" ? item.message : null,
    }];
  });
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const expectedIds = [...new Set(
    expectedOfferIds.filter((id) => Number.isFinite(id) && id > 0)
  )];

  if (expectedIds.length === 0) {
    return {
      success: false,
      message: "Parametrii de plata sunt invalizi.",
    };
  }

  const entries = normalizePaymentCheckEntries(response);
  if (entries.length === 0) {
    return {
      success: false,
      message: "Raspuns invalid la verificarea platii.",
    };
  }

  const entriesByOfferId = new Map(entries.map((entry) => [entry.offerId, entry]));
  const failedEntry = expectedIds
    .map((id) => entriesByOfferId.get(id))
    .find((entry) => entry && !entry.success);

  if (failedEntry) {
    return {
      success: false,
      message: failedEntry.message || "Plata nu a fost confirmata de procesatorul de plati.",
    };
  }

  const missingIds = expectedIds.filter((id) => !entriesByOfferId.has(id));
  if (missingIds.length > 0) {
    return {
      success: false,
      message: "Verificarea platii nu a confirmat toate produsele din comanda.",
    };
  }

  return {
    success: true,
    message: "Plata a fost efectuata cu succes!",
  };
}
