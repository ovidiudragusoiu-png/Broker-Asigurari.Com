import { ApiError } from "@/lib/api/client";
import { parseDocumentUrl } from "@/lib/documents/documentUrl";

async function documentGet<T>(path: string, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        (errorData as { error?: string }).error || "Request failed",
        errorData
      );
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchOfferDocument(
  offerId: number,
  orderHash: string,
  sessionToken?: string | null
): Promise<{ url?: string } | string> {
  const qs = new URLSearchParams({
    offerId: String(offerId),
    orderHash,
  });
  if (sessionToken) qs.set("sessionToken", sessionToken);
  return documentGet<{ url?: string } | string>(`/api/documents/offer?${qs}`);
}

export async function fetchPolicyDocument(
  policyId: number,
  orderHash: string,
  options?: { offerId?: number; sessionToken?: string | null }
): Promise<{ url?: string } | string> {
  const qs = new URLSearchParams({
    policyId: String(policyId),
    orderHash,
  });
  if (options?.offerId) qs.set("offerId", String(options.offerId));
  if (options?.sessionToken) qs.set("sessionToken", options.sessionToken);
  return documentGet<{ url?: string } | string>(`/api/documents/policy?${qs}`);
}

export function openDocumentInNewTab(data: { url?: string } | string): void {
  const docUrl = parseDocumentUrl(data);
  if (!docUrl) {
    throw new Error("Documentul nu este disponibil momentan.");
  }
  const safeUrl = new URL(docUrl, window.location.origin);
  if (!["http:", "https:"].includes(safeUrl.protocol)) {
    throw new Error("Link invalid");
  }
  window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
}
