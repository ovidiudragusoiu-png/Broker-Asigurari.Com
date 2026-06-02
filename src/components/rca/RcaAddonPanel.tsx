"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddonOfferDownloadLink from "@/components/rca/AddonOfferDownloadLink";
import { quoteRcaAdditionalCatalogProducts } from "@/lib/flows/rcaAdditionalOffers";
import {
  applyVendorDisplayNameOverrides,
  getAddonDisplayLabel,
  getVendorCommercialKey,
  sortVendorGroupProducts,
} from "@/lib/config/rcaAddonDisplayNames";
import {
  addonOfferMapsEqual,
  filterAddonOffersForRequestedPeriods,
  formatAddonOfferSubtext,
  formatAddonRoPrice,
  getQuotableProductsForPeriod,
  groupAdditionalProductsByVendor,
  hasQuotableAddonOffers,
  pickAdditionalOfferForPeriod,
} from "@/lib/utils/rcaAddons";
import type { RcaAdditionalOffer, RcaAdditionalProduct } from "@/types/rcaAddons";

const ADDON_LOAD_TIMEOUT_MS = 30_000;

interface RcaAddonPanelProps {
  orderId: number | null;
  orderHash: string | null;
  policyStartDate: string;
  periodMonth: string;
  isLeasing?: boolean;
  /** When true, panel is rendered inside RcaAddonsModal (no card chrome). */
  embeddedInModal?: boolean;
  isExpanded: boolean;
  selectedProductIds: number[];
  onSelectionChange: (productIds: number[]) => void;
  onOffersCacheUpdate: (
    cacheKey: string,
    offersByProductId: Map<number, RcaAdditionalOffer[]>
  ) => void;
  onQuoted?: (hasOffers: boolean) => void;
  offersCacheKey: string;
  initialOffersByProductId?: Map<number, RcaAdditionalOffer[]>;
  getAddonCatalog: () => Promise<RcaAdditionalProduct[]>;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function RcaAddonPanel({
  orderId,
  orderHash,
  policyStartDate,
  periodMonth,
  isLeasing = false,
  embeddedInModal = false,
  isExpanded,
  selectedProductIds,
  onSelectionChange,
  onOffersCacheUpdate,
  onQuoted,
  offersCacheKey,
  initialOffersByProductId,
  getAddonCatalog,
}: RcaAddonPanelProps) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<RcaAdditionalProduct[]>([]);
  const [offersByProductId, setOffersByProductId] = useState<
    Map<number, RcaAdditionalOffer[]>
  >(() => initialOffersByProductId ?? new Map());
  const [retryKey, setRetryKey] = useState(0);
  const loadGenerationRef = useRef(0);
  const onOffersCacheUpdateRef = useRef(onOffersCacheUpdate);
  const onQuotedRef = useRef(onQuoted);
  const initialOffersRef = useRef(initialOffersByProductId);
  const reportedQuotedRef = useRef<boolean | null>(null);
  const lastPushedOffersRef = useRef<Map<number, RcaAdditionalOffer[]> | null>(
    null
  );

  const pushOffersCache = useCallback(
    (nextMap: Map<number, RcaAdditionalOffer[]>) => {
      if (
        lastPushedOffersRef.current &&
        addonOfferMapsEqual(lastPushedOffersRef.current, nextMap)
      ) {
        return;
      }
      lastPushedOffersRef.current = nextMap;
      onOffersCacheUpdateRef.current(offersCacheKey, nextMap);
    },
    [offersCacheKey]
  );

  useEffect(() => {
    onOffersCacheUpdateRef.current = onOffersCacheUpdate;
  }, [onOffersCacheUpdate]);

  useEffect(() => {
    onQuotedRef.current = onQuoted;
  }, [onQuoted]);

  useEffect(() => {
    initialOffersRef.current = initialOffersByProductId;
  }, [initialOffersByProductId]);

  useEffect(() => {
    reportedQuotedRef.current = null;
    lastPushedOffersRef.current = null;
  }, [offersCacheKey, retryKey]);

  useEffect(() => {
    if (!initialOffersByProductId?.size) return;
    setOffersByProductId(initialOffersByProductId);
    lastPushedOffersRef.current = initialOffersByProductId;
  }, [initialOffersByProductId]);

  const periodMonthsForRequest = useMemo(() => [periodMonth], [periodMonth]);
  const periodMonthsNumber = Number(periodMonth);

  const displayNameOverrides = useMemo(
    () =>
      applyVendorDisplayNameOverrides(offersByProductId, periodMonthsNumber),
    [offersByProductId, periodMonthsNumber]
  );

  const reportQuoted = useCallback((hasOffers: boolean) => {
    if (reportedQuotedRef.current === hasOffers) return;
    reportedQuotedRef.current = hasOffers;
    onQuotedRef.current?.(hasOffers);
  }, []);

  const loadAddons = useCallback(async () => {
    const generation = ++loadGenerationRef.current;

    if (!isExpanded || !orderId || !orderHash) {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
      return;
    }

    if ((initialOffersRef.current?.size ?? 0) > 0 && retryKey === 0) {
      const cached = initialOffersRef.current!;
      setOffersByProductId(cached);
      const productById = new Map<number, RcaAdditionalProduct>();
      for (const offers of cached.values()) {
        for (const offer of offers) {
          productById.set(offer.productDetails.id, offer.productDetails);
        }
      }
      setCatalog(Array.from(productById.values()));
      setLoading(false);
      setLoadError(null);
      reportQuoted(hasQuotableAddonOffers(cached, periodMonthsNumber));
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      await withTimeout(
        (async () => {
          const catalogProducts = await getAddonCatalog();
          if (generation !== loadGenerationRef.current) return;

          if (catalogProducts.length === 0) {
            setCatalog([]);
            const empty = new Map<number, RcaAdditionalOffer[]>();
            setOffersByProductId(empty);
            pushOffersCache(empty);
            reportQuoted(false);
            return;
          }

          setCatalog(catalogProducts);

          const nextMap = await quoteRcaAdditionalCatalogProducts({
            catalog: catalogProducts,
            orderId,
            orderHash,
            policyStartDate,
            periodMonths: periodMonthsForRequest,
            isLeasing,
          });

          if (generation !== loadGenerationRef.current) return;

          setOffersByProductId(nextMap);
          pushOffersCache(nextMap);
          reportQuoted(hasQuotableAddonOffers(nextMap, periodMonthsNumber));
        })(),
        ADDON_LOAD_TIMEOUT_MS,
        "ADDON_LOAD_TIMEOUT"
      );
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;

      const timedOut =
        err instanceof Error && err.message === "ADDON_LOAD_TIMEOUT";
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[RcaAddonPanel] Failed to load additional products",
          {
            orderId,
            orderHash: orderHash?.slice(0, 8),
            periodMonth,
            timedOut,
          },
          err
        );
      }
      setLoadError(
        timedOut
          ? "Încărcarea produselor suplimentare a durat prea mult. Încearcă din nou."
          : "Produsele suplimentare nu sunt disponibile momentan."
      );
      setCatalog([]);
      setOffersByProductId(new Map());
      reportQuoted(false);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [
    isExpanded,
    orderId,
    orderHash,
    policyStartDate,
    periodMonth,
    periodMonthsForRequest,
    periodMonthsNumber,
    isLeasing,
    getAddonCatalog,
    retryKey,
    reportQuoted,
    pushOffersCache,
  ]);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  const toggleProduct = (productId: number) => {
    if (selectedProductIds.includes(productId)) {
      onSelectionChange(selectedProductIds.filter((id) => id !== productId));
    } else {
      onSelectionChange([...selectedProductIds, productId]);
    }
  };

  if (!isExpanded) {
    return null;
  }

  if (!orderId || !orderHash) {
    return null;
  }

  const quotableProducts = getQuotableProductsForPeriod(
    catalog,
    offersByProductId,
    periodMonthsNumber
  );
  const vendorGroups = groupAdditionalProductsByVendor(quotableProducts).map(
    (group) => {
      const filtered = group.products.filter((product) =>
        quotableProducts.some((p) => p.id === product.id)
      );
      const vendorKey = filtered[0]
        ? getVendorCommercialKey(filtered[0])
        : group.vendorLabel.trim().toLowerCase();
      return {
        ...group,
        products: sortVendorGroupProducts(
          filtered,
          offersByProductId,
          vendorKey,
          periodMonthsNumber,
          displayNameOverrides
        ),
      };
    }
  );

  if (!loading && !loadError && quotableProducts.length === 0) {
    return null;
  }

  const loadingWrap = embeddedInModal ? "" : "mt-2";
  const errorWrap = embeddedInModal ? "" : "mt-2";

  if (loading) {
    return (
      <div className={`${loadingWrap} flex items-center gap-2 text-xs text-gray-500`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        Se încarcă produsele suplimentare...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${errorWrap} space-y-2`}>
        <p className="text-xs text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="text-xs font-medium text-[#2563EB] hover:underline"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        embeddedInModal
          ? "w-full space-y-4"
          : "mt-3 w-full space-y-4 border-t border-gray-100 pt-3"
      }
    >
      {vendorGroups.map((group) => (
        <div key={group.vendorId || group.vendorLabel}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#F97316]">
            Produse {group.vendorLabel}
          </p>
          <div className="space-y-2">
            {group.products.map((product) => {
              const offers = offersByProductId.get(product.id) ?? [];
              const periodOffer = pickAdditionalOfferForPeriod(
                filterAddonOffersForRequestedPeriods(
                  offers,
                  periodMonthsForRequest
                ),
                periodMonthsNumber
              );
              if (!periodOffer) return null;

              const label = getAddonDisplayLabel(product, displayNameOverrides);
              const priceHint = `+ ${formatAddonRoPrice(periodOffer.policyPremium)} lei`;
              const subtext = formatAddonOfferSubtext(periodOffer);

              return (
                <label
                  key={product.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    selectedProductIds.includes(product.id)
                      ? "border-[#2563EB]/40 bg-blue-50/50"
                      : "border-gray-100 bg-gray-50/40 hover:border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/30"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    {subtext ? (
                      <p className="mt-0.5 text-[11px] text-gray-500">{subtext}</p>
                    ) : null}
                    <p className="text-xs font-semibold text-[#2563EB]">
                      {priceHint}
                    </p>
                    <AddonOfferDownloadLink
                      offerId={periodOffer.id}
                      orderHash={orderHash}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
