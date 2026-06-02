import { api } from "@/lib/api/client";
import {
  normalizeRcaAdditionalOffers,
  parseRcaAdditionalCatalogResponse,
  normalizeRcaAdditionalProduct,
} from "@/lib/utils/rcaAddons";
import type { RcaAdditionalOffer, RcaAdditionalProduct } from "@/types/rcaAddons";

const OFFER_POST_TIMEOUT_MS = 45_000;

export interface QuoteRcaAdditionalProductsParams {
  catalog: RcaAdditionalProduct[];
  orderId: number;
  orderHash: string;
  policyStartDate: string;
  periodMonths: string[];
  isLeasing?: boolean;
  concurrency?: number;
  onProductQuoted?: (result: {
    productId: number;
    offers: RcaAdditionalOffer[];
  }) => void;
}

/** POST one offer per catalog productId; returns all normalized offers by product id. */
export async function quoteRcaAdditionalCatalogProducts({
  catalog,
  orderId,
  orderHash,
  policyStartDate,
  periodMonths,
  isLeasing = false,
  concurrency = 5,
  onProductQuoted,
}: QuoteRcaAdditionalProductsParams): Promise<
  Map<number, RcaAdditionalOffer[]>
> {
  const concurrencyLimit = Math.max(1, Math.min(concurrency, 8));
  const offerResults = new Array<{
    productId: number;
    offers: RcaAdditionalOffer[];
  }>(catalog.length);
  let nextIndex = 0;

  const quoteSingleProduct = async (
    product: RcaAdditionalProduct
  ): Promise<{ productId: number; offers: RcaAdditionalOffer[] }> => {
    try {
      const response = await api.post<unknown>(
        `/online/offers/rca/additionals?orderHash=${encodeURIComponent(orderHash)}`,
        {
          orderId,
          policyStartDate,
          periodMonths,
          isLeasing,
          additionalProductRequest: { productId: product.id },
        },
        undefined,
        { timeoutMs: OFFER_POST_TIMEOUT_MS }
      );
      const offers = normalizeRcaAdditionalOffers(response, product);
      return { productId: product.id, offers };
    } catch {
      return { productId: product.id, offers: [] as RcaAdditionalOffer[] };
    }
  };

  const runWorker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= catalog.length) return;
      const result = await quoteSingleProduct(catalog[currentIndex]);
      offerResults[currentIndex] = result;
      try {
        onProductQuoted?.(result);
      } catch {
        // Never fail the full batch because of callback-side errors.
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrencyLimit, catalog.length) }, () =>
      runWorker()
    )
  );

  const nextMap = new Map<number, RcaAdditionalOffer[]>();
  for (const { productId, offers } of offerResults) {
    nextMap.set(productId, offers);
  }
  return nextMap;
}

export async function fetchRcaAdditionalCatalog(): Promise<RcaAdditionalProduct[]> {
  const catalogRaw = await api.get<unknown>(
    "/online/products/rca/additionals",
    { timeoutMs: 30_000 }
  );
  return parseRcaAdditionalCatalogResponse(catalogRaw)
    .map((row) => normalizeRcaAdditionalProduct(row))
    .filter((p): p is RcaAdditionalProduct => p != null);
}
