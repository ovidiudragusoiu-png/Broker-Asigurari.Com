export interface PaymentCheckEntry {
  offerId?: unknown;
  success?: unknown;
  message?: unknown;
}

export interface PaymentVerificationResult {
  success: boolean;
  message?: string;
}

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") {
    return response;
  }

  try {
    return JSON.parse(response);
  } catch {
    return response;
  }
}

function normalizeEntries(response: unknown): PaymentCheckEntry[] | null {
  const parsed = parsePaymentCheckResponse(response);

  if (Array.isArray(parsed)) {
    return parsed as PaymentCheckEntry[];
  }

  if (parsed && typeof parsed === "object") {
    return [parsed as PaymentCheckEntry];
  }

  return null;
}

function entryMessage(entry: PaymentCheckEntry | undefined): string | undefined {
  return typeof entry?.message === "string" ? entry.message : undefined;
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const expectedIds = [...new Set(expectedOfferIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (!expectedIds.length) {
    return {
      success: false,
      message: "Nu exista oferte valide pentru verificarea platii.",
    };
  }

  const entries = normalizeEntries(response);
  if (!entries) {
    return {
      success: false,
      message: "Raspuns invalid la verificarea platii.",
    };
  }

  for (const expectedId of expectedIds) {
    const entry = entries.find((item) => Number(item.offerId) === expectedId);

    if (!entry) {
      return {
        success: false,
        message: `Plata nu a fost confirmata pentru oferta ${expectedId}.`,
      };
    }

    if (entry.success !== true) {
      return {
        success: false,
        message:
          entryMessage(entry) ||
          `Plata nu a fost confirmata pentru oferta ${expectedId}.`,
      };
    }
  }

  return { success: true };
}
