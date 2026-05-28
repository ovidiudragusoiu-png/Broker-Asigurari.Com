type PaymentCheckRecord = Record<string, unknown>;

export interface PaymentVerificationResult {
  confirmed: boolean;
  message?: string;
}

const DEFAULT_UNCONFIRMED_MESSAGE =
  "Plata nu a putut fi confirmata de procesatorul de plati.";

function isRecord(value: unknown): value is PaymentCheckRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePaymentCheckResponse(response: unknown): unknown {
  if (typeof response !== "string") {
    return response;
  }

  const trimmed = response.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return response;
  }
}

function getMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const message = value.message ?? value.detail ?? value.title ?? value.error;
  return typeof message === "string" && message.trim() ? message : undefined;
}

function getOfferId(value: PaymentCheckRecord): number | null {
  const raw = value.offerId ?? value.OfferId ?? value.id;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    return Number(raw);
  }
  return null;
}

function isSuccessfulEntry(value: PaymentCheckRecord): boolean {
  if (value.success === true || value.paid === true || value.isPaid === true) {
    return true;
  }

  const status = value.status;
  if (typeof status !== "string") {
    return false;
  }

  return ["APPROVED", "PAID", "SUCCESS", "SUCCEEDED", "PROCESSED"].includes(
    status.toUpperCase()
  );
}

function getNestedEntries(value: PaymentCheckRecord): unknown[] | null {
  for (const key of ["offers", "results", "payments", "items", "data"]) {
    const nested = value[key];
    if (Array.isArray(nested)) {
      return nested;
    }
  }
  return null;
}

function getOfferIds(value: PaymentCheckRecord): number[] {
  const rawOfferIds = value.offerIds ?? value.OfferIds ?? value.additionalProductsOfferIds;
  if (!Array.isArray(rawOfferIds)) {
    return [];
  }

  return rawOfferIds
    .map((raw) => {
      if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
        return raw;
      }
      if (typeof raw === "string" && /^\d+$/.test(raw)) {
        return Number(raw);
      }
      return null;
    })
    .filter((id): id is number => id !== null);
}

function collectConfirmedOfferIds(response: unknown): {
  confirmedIds: Set<number>;
  message?: string;
  globalSuccess: boolean;
  explicitOfferIds: number[];
} {
  if (Array.isArray(response)) {
    const confirmedIds = new Set<number>();
    let message: string | undefined;

    for (const entry of response) {
      if (!isRecord(entry)) {
        continue;
      }
      message ||= getMessage(entry);
      const offerId = getOfferId(entry);
      if (offerId !== null && isSuccessfulEntry(entry)) {
        confirmedIds.add(offerId);
      }
    }

    return {
      confirmedIds,
      message,
      globalSuccess: false,
      explicitOfferIds: [],
    };
  }

  if (!isRecord(response)) {
    return {
      confirmedIds: new Set(),
      message: undefined,
      globalSuccess: false,
      explicitOfferIds: [],
    };
  }

  const nestedEntries = getNestedEntries(response);
  if (nestedEntries) {
    const nested = collectConfirmedOfferIds(nestedEntries);
    return {
      ...nested,
      message: nested.message || getMessage(response),
      globalSuccess: isSuccessfulEntry(response),
    };
  }

  const confirmedIds = new Set<number>();
  const offerId = getOfferId(response);
  if (offerId !== null && isSuccessfulEntry(response)) {
    confirmedIds.add(offerId);
  }

  for (const [key, value] of Object.entries(response)) {
    if (!/^\d+$/.test(key)) {
      continue;
    }

    const id = Number(key);
    if (value === true || (isRecord(value) && isSuccessfulEntry(value))) {
      confirmedIds.add(id);
    }
  }

  return {
    confirmedIds,
    message: getMessage(response),
    globalSuccess: isSuccessfulEntry(response),
    explicitOfferIds: getOfferIds(response),
  };
}

export function verifyPaymentCheckResponse(
  response: unknown,
  expectedOfferIds: number[]
): PaymentVerificationResult {
  const uniqueExpectedIds = [...new Set(expectedOfferIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (!uniqueExpectedIds.length) {
    return {
      confirmed: false,
      message: DEFAULT_UNCONFIRMED_MESSAGE,
    };
  }

  const parsedResponse = parsePaymentCheckResponse(response);
  const { confirmedIds, message, globalSuccess, explicitOfferIds } =
    collectConfirmedOfferIds(parsedResponse);

  const allConfirmedByEntries = uniqueExpectedIds.every((id) =>
    confirmedIds.has(id)
  );
  const allConfirmedByExplicitIds =
    globalSuccess &&
    explicitOfferIds.length > 0 &&
    uniqueExpectedIds.every((id) => explicitOfferIds.includes(id));
  const singleOfferGloballyConfirmed =
    uniqueExpectedIds.length === 1 &&
    globalSuccess &&
    (confirmedIds.size === 0 || confirmedIds.has(uniqueExpectedIds[0]));

  if (
    allConfirmedByEntries ||
    allConfirmedByExplicitIds ||
    singleOfferGloballyConfirmed
  ) {
    return { confirmed: true };
  }

  return {
    confirmed: false,
    message: message || DEFAULT_UNCONFIRMED_MESSAGE,
  };
}
