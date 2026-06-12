export interface PaymentCheckEntry {
  offerId?: number | string;
  success?: boolean;
  message?: string;
}

export type PaymentCheckResponse =
  | PaymentCheckEntry
  | PaymentCheckEntry[]
  | string;

type ApiPost = <T = unknown>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
  options?: { timeoutMs?: number }
) => Promise<T>;

export class PaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

function parsePaymentCheckResponse(response: PaymentCheckResponse): PaymentCheckEntry[] {
  let parsed: unknown = response;

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) {
      throw new PaymentVerificationError("Raspuns invalid la verificarea platii.");
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new PaymentVerificationError("Raspuns invalid la verificarea platii.");
    }
  }

  if (Array.isArray(parsed)) {
    return parsed as PaymentCheckEntry[];
  }

  if (parsed && typeof parsed === "object") {
    return [parsed as PaymentCheckEntry];
  }

  throw new PaymentVerificationError("Raspuns invalid la verificarea platii.");
}

export function assertPaymentConfirmed(
  response: PaymentCheckResponse,
  expectedOfferIds: number[]
) {
  const uniqueExpectedOfferIds = [...new Set(expectedOfferIds)];
  if (uniqueExpectedOfferIds.length === 0) {
    throw new PaymentVerificationError("Parametrii de plata sunt invalizi.");
  }

  const checks = parsePaymentCheckResponse(response);
  for (const expectedOfferId of uniqueExpectedOfferIds) {
    const check = checks.find(
      (entry) => Number(entry.offerId) === expectedOfferId
    );

    if (!check) {
      throw new PaymentVerificationError(
        "Plata nu a fost confirmata pentru toate ofertele."
      );
    }

    if (check.success !== true) {
      throw new PaymentVerificationError(
        check.message || "Plata nu a fost confirmata de procesatorul de plati."
      );
    }
  }
}

export async function verifyPaymentBeforePolicyCreation({
  post,
  orderHash,
  offerIds,
}: {
  post: ApiPost;
  orderHash: string;
  offerIds: number[];
}) {
  let response: PaymentCheckResponse;

  try {
    response = await post<PaymentCheckResponse>(
      `/online/offers/payment/check/v3?orderHash=${encodeURIComponent(orderHash)}`,
      { offerIds },
      { Accept: "text/plain" }
    );
  } catch {
    throw new PaymentVerificationError(
      "Nu am putut confirma plata. Polita nu poate fi emisa pana la confirmarea platii."
    );
  }

  assertPaymentConfirmed(response, offerIds);
}
