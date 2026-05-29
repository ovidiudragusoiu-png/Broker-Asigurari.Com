export interface PaymentVerificationResult {
  success: boolean;
  message: string;
}

interface PaymentCheckEntry {
  offerId?: unknown;
  success?: unknown;
  message?: unknown;
}

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") return response;

  const trimmed = response.trim();
  if (!trimmed) return response;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return response;
  }
}

function toOfferId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function normalizeEntries(response: unknown): PaymentCheckEntry[] | null {
  const parsed = parsePaymentCheckResponse(response);
  if (Array.isArray(parsed)) return parsed as PaymentCheckEntry[];
  if (parsed && typeof parsed === "object") return [parsed as PaymentCheckEntry];
  return null;
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

  const confirmedIds = new Set<number>();
  const failureMessages: string[] = [];

  for (const entry of entries) {
    const id = toOfferId(entry.offerId);
    if (!id || !expectedIds.includes(id)) continue;

    if (entry.success === true) {
      confirmedIds.add(id);
    } else if (typeof entry.message === "string" && entry.message.trim()) {
      failureMessages.push(entry.message.trim());
    }
  }

  const missingIds = expectedIds.filter((id) => !confirmedIds.has(id));
  if (missingIds.length) {
    return {
      success: false,
      message:
        failureMessages[0] ||
        `Plata nu a fost confirmata pentru ofertele: ${missingIds.join(", ")}.`,
    };
  }

  return {
    success: true,
    message: "Plata confirmata.",
  };
}
