"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type {
  RcaOffer,
  RcaOfferLegalDisclosure,
  SelectedOfferState,
  OfferTab,
} from "@/types/rcaFlow";
import type { RcaAdditionalOffer } from "@/types/rcaAddons";
import {
  fetchRcaAdditionalCatalog,
  quoteRcaAdditionalCatalogProducts,
} from "@/lib/flows/rcaAdditionalOffers";
import {
  getOfferPrice,
  getLocalVendorLogo,
  pickOfferByVariant,
  getGreenCardExclusions,
  toRcaDate,
} from "@/lib/utils/rcaHelpers";
import {
  addonOfferMapsEqual,
  buildAddonOffersCacheKey,
  buildAddonSelectionKey,
  getAddonPrefetchVariantsForTab,
  RCA_ADDON_PREVIEW_PRODUCT_LIMIT,
  getAddonQuotePeriodMonths,
  hasQuotableAddonOffers,
  parseAddonSelectionKey,
  resolveSelectedAddons,
  sumSelectedAddonPremiums,
} from "@/lib/utils/rcaAddons";
import type { RcaAdditionalProduct } from "@/types/rcaAddons";
import OfferLegalInfo from "@/components/rca/OfferLegalInfo";
import OfferPidLink from "@/components/rca/OfferPidLink";
import RcaAddonsModal from "@/components/rca/RcaAddonsModal";
import ColoredDotsLoader from "@/components/shared/ColoredDotsLoader";

const ADDON_PREFETCH_TIMEOUT_MS = 30_000;
const ADDON_PREFETCH_CONCURRENCY = 5;

interface OfferTabsProps {
  offers: RcaOffer[];
  loading: boolean;
  offersReady: boolean;
  orderId: number | null;
  orderHash: string | null;
  policyStartDate: string;
  isLeasing?: boolean;
  onSelectOffer: (selected: SelectedOfferState) => void;
  disclosureCache: Map<number, RcaOfferLegalDisclosure>;
  onDisclosureCacheUpdate: (
    updater: (
      prev: Map<number, RcaOfferLegalDisclosure>
    ) => Map<number, RcaOfferLegalDisclosure>
  ) => void;
  orderReferenceTariff: number | null | undefined;
  onOrderReferenceTariff: (value: number | null | undefined) => void;
}

interface TabConfig {
  key: OfferTab;
  label: string;
  sublabel: string;
  columns: { period: string; label: string; withDirectSettlement: boolean }[];
}

const TABS: TabConfig[] = [
  {
    key: "short",
    label: "1 - 3 luni",
    sublabel: "standard",
    columns: [
      { period: "1", label: "1 luna", withDirectSettlement: false },
      { period: "2", label: "2 luni", withDirectSettlement: false },
      { period: "3", label: "3 luni", withDirectSettlement: false },
    ],
  },
  {
    key: "standard",
    label: "6 / 12 luni",
    sublabel: "standard",
    columns: [
      { period: "6", label: "6 luni", withDirectSettlement: false },
      { period: "12", label: "12 luni", withDirectSettlement: false },
    ],
  },
  {
    key: "direct",
    label: "6 / 12 luni",
    sublabel: "decontare directă",
    columns: [
      { period: "6", label: "6 luni + dd", withDirectSettlement: true },
      { period: "12", label: "12 luni + dd", withDirectSettlement: true },
    ],
  },
];

function formatRoPrice(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAddonTeaserLine(
  selectedCount: number,
  addonTotal: number
): string {
  if (selectedCount > 0) {
    return `${selectedCount} selectate · +${formatRoPrice(addonTotal)} lei`;
  }
  return "Produse suplimentare disponibile";
}

type AddonPeriod = "6" | "12";
type AddonTeaserState = "loading" | "ready" | "unavailable";

const ADDON_PERIODS: AddonPeriod[] = ["6", "12"];

function priceColumnGridClass(columnCount: number): string {
  const desktopCols = columnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return `grid-cols-1 ${desktopCols}`;
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

// ---- Skeleton loading ----
function SkeletonCard({ columns }: { columns: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col gap-2 md:w-40">
          <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-3 md:justify-end">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OfferTabs({
  offers,
  loading,
  offersReady,
  orderId,
  orderHash,
  policyStartDate,
  isLeasing = false,
  onSelectOffer,
  disclosureCache,
  onDisclosureCacheUpdate,
  orderReferenceTariff,
  onOrderReferenceTariff,
}: OfferTabsProps) {
  const [activeTab, setActiveTab] = useState<OfferTab>("standard");
  const [showUnavailableOffers, setShowUnavailableOffers] = useState(false);
  /** Modal targets one RCA card: `generali|12|std`, … */
  const [openAddonModalSelectionKey, setOpenAddonModalSelectionKey] = useState<
    string | null
  >(null);
  const [addonModalDraftIds, setAddonModalDraftIds] = useState<number[]>([]);
  /** Selection per RCA vendor + period + settlement tab. */
  const [selectedAddonProductIds, setSelectedAddonProductIds] = useState<
    Record<string, number[]>
  >({});
  const [addonOffersByCacheKey, setAddonOffersByCacheKey] = useState<
    Map<string, Map<number, RcaAdditionalOffer[]>>
  >(() => new Map());
  const [addonCacheKeyAvailable, setAddonCacheKeyAvailable] = useState<
    Record<string, boolean>
  >({});
  const [addonCacheKeyLoading, setAddonCacheKeyLoading] = useState<
    Record<string, boolean>
  >({});
  const addonInFlightByCacheKeyRef = useRef<
    Map<string, Promise<Map<number, RcaAdditionalOffer[]>>>
  >(new Map());
  const addonOffersByCacheKeyRef = useRef(addonOffersByCacheKey);
  const addonAvailabilityRef = useRef(addonCacheKeyAvailable);
  const openAddonModalSelectionKeyRef = useRef<string | null>(null);
  openAddonModalSelectionKeyRef.current = openAddonModalSelectionKey;
  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;
  const tabPeriodMonths = useMemo(
    () => currentTabConfig.columns.map((c) => c.period),
    [currentTabConfig]
  );
  const addonQuotePeriodMonths = useMemo(
    () => getAddonQuotePeriodMonths(tabPeriodMonths),
    [tabPeriodMonths]
  );

  const addonCatalogRef = useRef<RcaAdditionalProduct[] | null>(null);
  const addonCatalogPromiseRef = useRef<Promise<RcaAdditionalProduct[]> | null>(
    null
  );

  const getAddonCatalog = useCallback(async (): Promise<RcaAdditionalProduct[]> => {
    if (addonCatalogRef.current) {
      return addonCatalogRef.current;
    }
    if (addonCatalogPromiseRef.current) {
      return addonCatalogPromiseRef.current;
    }

    const promise = (async () => {
      const catalog = await fetchRcaAdditionalCatalog();
      addonCatalogRef.current = catalog;
      return catalog;
    })();

    addonCatalogPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      addonCatalogPromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    addonOffersByCacheKeyRef.current = addonOffersByCacheKey;
  }, [addonOffersByCacheKey]);

  useEffect(() => {
    addonAvailabilityRef.current = addonCacheKeyAvailable;
  }, [addonCacheKeyAvailable]);

  const resetAddonState = useCallback(() => {
    setOpenAddonModalSelectionKey(null);
    setAddonModalDraftIds([]);
    setSelectedAddonProductIds({});
    setAddonOffersByCacheKey(new Map());
    setAddonCacheKeyAvailable({});
    setAddonCacheKeyLoading({});
    addonInFlightByCacheKeyRef.current = new Map();
  }, []);

  const addonOrderIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const orderIdentity =
      orderId != null && orderHash ? `${orderId}|${orderHash}` : null;
    if (addonOrderIdentityRef.current === orderIdentity) return;
    addonOrderIdentityRef.current = orderIdentity;
    resetAddonState();
  }, [orderHash, orderId, resetAddonState]);

  const getSelectedAddonIds = (selectionKey: string): number[] =>
    selectedAddonProductIds[selectionKey] ?? [];

  const getAddonTotalForVendorColumn = (
    vendorName: string,
    period: string,
    withDirectSettlement: boolean
  ): number => {
    const offersCacheKey = buildAddonOffersCacheKey(
      period,
      withDirectSettlement
    );
    const selectionKey = buildAddonSelectionKey(
      vendorName,
      period,
      withDirectSettlement
    );
    const cache = addonOffersByCacheKey.get(offersCacheKey);
    if (!cache) return 0;
    return sumSelectedAddonPremiums(
      cache,
      getSelectedAddonIds(selectionKey),
      Number(period)
    );
  };

  const openAddonModal = (
    vendorName: string,
    period: string,
    withDirectSettlement: boolean
  ) => {
    const selectionKey = buildAddonSelectionKey(
      vendorName,
      period,
      withDirectSettlement
    );
    setAddonModalDraftIds([...(selectedAddonProductIds[selectionKey] ?? [])]);
    setOpenAddonModalSelectionKey(selectionKey);
  };

  const closeAddonModal = useCallback(() => {
    setOpenAddonModalSelectionKey(null);
  }, []);

  const confirmAddonModal = () => {
    if (!openAddonModalSelectionKey) return;
    setSelectedAddonProductIds((prev) => ({
      ...prev,
      [openAddonModalSelectionKey]: addonModalDraftIds,
    }));
    setOpenAddonModalSelectionKey(null);
  };

  const handleOffersCacheUpdate = useCallback(
    (
      cacheKey: string,
      offersByProductId: Map<number, RcaAdditionalOffer[]>
    ) => {
      setAddonOffersByCacheKey((prev) => {
        const existing = prev.get(cacheKey);
        if (
          existing &&
          addonOfferMapsEqual(existing, offersByProductId)
        ) {
          return prev;
        }
        const next = new Map(prev);
        next.set(cacheKey, offersByProductId);
        return next;
      });
    },
    []
  );

  const handleAddonQuoted = useCallback(
    (cacheKey: string, hasOffers: boolean) => {
      setAddonCacheKeyAvailable((prev) => {
        if (prev[cacheKey] === hasOffers) return prev;
        return { ...prev, [cacheKey]: hasOffers };
      });
      if (!hasOffers) {
        setOpenAddonModalSelectionKey((open) => {
          if (!open) return open;
          const parsed = parseAddonSelectionKey(open);
          const openOffersKey = buildAddonOffersCacheKey(
            parsed.period,
            parsed.withDirectSettlement
          );
          return openOffersKey === cacheKey ? null : open;
        });
      }
    },
    []
  );

  const handleAddonLoading = useCallback((cacheKey: string, isLoading: boolean) => {
    setAddonCacheKeyLoading((prev) => {
      if (prev[cacheKey] === isLoading) return prev;
      return { ...prev, [cacheKey]: isLoading };
    });
  }, []);

  const handleAddonPositiveReadiness = useCallback((cacheKey: string) => {
    setAddonCacheKeyAvailable((prev) => {
      if (prev[cacheKey] === true) return prev;
      return { ...prev, [cacheKey]: true };
    });
  }, []);

  const handleOpenModalAddonQuoted = useCallback((hasOffers: boolean) => {
    const selectionKey = openAddonModalSelectionKeyRef.current;
    if (!selectionKey) return;
    const { period, withDirectSettlement } =
      parseAddonSelectionKey(selectionKey);
    handleAddonQuoted(
      buildAddonOffersCacheKey(period, withDirectSettlement),
      hasOffers
    );
  }, [handleAddonQuoted]);

  const ensureAddonOffersForCacheKey = useCallback(
    async (
      period: AddonPeriod,
      withDirectSettlement: boolean,
      options?: { force?: boolean }
    ): Promise<boolean> => {
      const cacheKey = buildAddonOffersCacheKey(period, withDirectSettlement);
      const force = options?.force === true;
      if (!orderId || !orderHash) {
        handleAddonQuoted(cacheKey, false);
        return false;
      }
      const knownAvailability = addonAvailabilityRef.current[cacheKey];
      const cachedOffers = addonOffersByCacheKeyRef.current.get(cacheKey);

      if (!force && knownAvailability !== undefined) {
        return knownAvailability;
      }
      if (!force && cachedOffers) {
        const available = hasQuotableAddonOffers(cachedOffers, Number(period));
        handleAddonQuoted(cacheKey, available);
        return available;
      }

      const existingInFlight = addonInFlightByCacheKeyRef.current.get(cacheKey);
      if (existingInFlight) {
        const offers = await existingInFlight;
        const available = hasQuotableAddonOffers(offers, Number(period));
        handleAddonQuoted(cacheKey, available);
        return available;
      }

      const requestPromise = (async () => {
        const catalog = await getAddonCatalog();
        if (catalog.length === 0) {
          return new Map<number, RcaAdditionalOffer[]>();
        }
        let markedAvailable = false;
        let streamedOffers = new Map<number, RcaAdditionalOffer[]>();
        const quoteProductCount = Math.max(
          1,
          Math.min(RCA_ADDON_PREVIEW_PRODUCT_LIMIT, catalog.length)
        );
        const previewCatalog = catalog.slice(0, quoteProductCount);
        const remainingCatalog = catalog.slice(quoteProductCount);
        const onProductQuoted = ({
          productId,
          offers,
        }: {
          productId: number;
          offers: RcaAdditionalOffer[];
        }) => {
          streamedOffers.set(productId, offers);
          handleOffersCacheUpdate(cacheKey, new Map(streamedOffers));
          if (markedAvailable) return;
          const hasMatchForPeriod = offers.some(
            (offer) =>
              !offer.error &&
              offer.policyPremium > 0 &&
              offer.periodMonths === Number(period)
          );
          if (!hasMatchForPeriod) return;
          markedAvailable = true;
          handleAddonPositiveReadiness(cacheKey);
        };
        return withTimeout(
          (async () => {
            const previewMap = await quoteRcaAdditionalCatalogProducts({
              catalog: previewCatalog,
              orderId,
              orderHash,
              policyStartDate: toRcaDate(policyStartDate),
              periodMonths: [period],
              isLeasing,
              concurrency: ADDON_PREFETCH_CONCURRENCY,
              onProductQuoted,
            });
            for (const [productId, offers] of previewMap) {
              streamedOffers.set(productId, offers);
            }
            handleOffersCacheUpdate(cacheKey, new Map(streamedOffers));

            if (remainingCatalog.length === 0) {
              return streamedOffers;
            }

            const remainingMap = await quoteRcaAdditionalCatalogProducts({
              catalog: remainingCatalog,
              orderId,
              orderHash,
              policyStartDate: toRcaDate(policyStartDate),
              periodMonths: [period],
              isLeasing,
              concurrency: ADDON_PREFETCH_CONCURRENCY,
              onProductQuoted,
            });
            for (const [productId, offers] of remainingMap) {
              streamedOffers.set(productId, offers);
            }
            handleOffersCacheUpdate(cacheKey, new Map(streamedOffers));
            return streamedOffers;
          })(),
          ADDON_PREFETCH_TIMEOUT_MS,
          "ADDON_PREFETCH_TIMEOUT"
        );
      })();

      handleAddonLoading(cacheKey, true);
      addonInFlightByCacheKeyRef.current.set(cacheKey, requestPromise);
      try {
        const offersMap = await requestPromise;
        handleOffersCacheUpdate(cacheKey, offersMap);
        const available = hasQuotableAddonOffers(offersMap, Number(period));
        handleAddonQuoted(cacheKey, available);
        return available;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[OfferTabs] Addon prefetch key failed", {
            cacheKey,
            err,
          });
        }
        handleOffersCacheUpdate(cacheKey, new Map());
        handleAddonQuoted(cacheKey, false);
        return false;
      } finally {
        handleAddonLoading(cacheKey, false);
        addonInFlightByCacheKeyRef.current.delete(cacheKey);
      }
    },
    [
      getAddonCatalog,
      handleAddonLoading,
      handleAddonPositiveReadiness,
      handleAddonQuoted,
      handleOffersCacheUpdate,
      isLeasing,
      orderHash,
      orderId,
      policyStartDate,
    ]
  );

  // Prefetch only keys for the currently visible 6/12 tab.
  useEffect(() => {
    if (!orderId || !orderHash) return;

    let cancelled = false;
    const visibleVariants = getAddonPrefetchVariantsForTab(activeTab);
    if (visibleVariants.length === 0) return;

    void (async () => {
      try {
        await Promise.all(
          visibleVariants.map(async ({ period, withDirectSettlement }) => {
            if (cancelled) return;
            await ensureAddonOffersForCacheKey(period, withDirectSettlement);
          })
        );
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[OfferTabs] Addon prefetch failed", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    orderId,
    orderHash,
    ensureAddonOffersForCacheKey,
  ]);

  const isOffersLoading = loading || !offersReady;
  const showSkeletonOnly = isOffersLoading && offers.length === 0;

  // ---- Loading state: skeleton cards (only before first offers arrive) ----
  if (showSkeletonOnly) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Alege cel mai bun preț RCA!
          </h2>
        </div>
        {/* Tabs (disabled during loading) */}
        <div className="flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <div
              key={tab.key}
              className="rounded-full bg-gray-100 px-5 py-2.5 text-center"
            >
              <span className="block text-sm font-semibold text-gray-400">
                {tab.label}
              </span>
              <span className="block text-[10px] text-gray-300">
                {tab.sublabel}
              </span>
            </div>
          ))}
        </div>
        {/* Skeleton rows */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} columns={2} />
          ))}
        </div>
        <ColoredDotsLoader
          subtitle="Se generează ofertele... Poate dura câteva momente."
          className="py-2"
        />
      </div>
    );
  }

  // ---- Empty state (only after generation finished) ----
  if (offersReady && offers.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">
          Nu există oferte disponibile.
        </p>
      </div>
    );
  }

  // ---- Group offers by vendor ----
  const vendors = Array.from(
    new Set(offers.map((o) => o.vendorName || "Asigurător necunoscut"))
  );

  // ---- Cheapest display price per column (RCA + selected addons) ----
  const cheapestByColumn: Record<string, number> = {};
  for (const col of currentTabConfig.columns) {
    let min = Infinity;
    for (const vendor of vendors) {
      const vendorOffers = offers.filter(
        (o) => (o.vendorName || "Asigurător necunoscut") === vendor
      );
      const match = pickOfferByVariant(
        vendorOffers,
        col.period,
        col.withDirectSettlement
      );
      const basePrice = match
        ? getOfferPrice(match, col.withDirectSettlement)
        : null;
      if (basePrice == null || basePrice <= 0) continue;
      const addonTotal =
        addonQuotePeriodMonths?.includes(col.period) === true
          ? getAddonTotalForVendorColumn(
              vendor,
              col.period,
              col.withDirectSettlement
            )
          : 0;
      const displayPrice = basePrice + addonTotal;
      if (displayPrice < min) {
        min = displayPrice;
      }
    }
    if (min < Infinity) {
      cheapestByColumn[`${col.period}-${col.withDirectSettlement}`] = min;
    }
  }

  // ---- Sort vendors by cheapest price in the last column ----
  const vendorsSorted = [...vendors].sort((a, b) => {
    const aOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === a
    );
    const bOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === b
    );
    const col =
      currentTabConfig.columns[currentTabConfig.columns.length - 1];
    const aMatch = pickOfferByVariant(
      aOffers,
      col.period,
      col.withDirectSettlement
    );
    const bMatch = pickOfferByVariant(
      bOffers,
      col.period,
      col.withDirectSettlement
    );
    const aPrice = aMatch
      ? (getOfferPrice(aMatch, col.withDirectSettlement) ?? Infinity)
      : Infinity;
    const bPrice = bMatch
      ? (getOfferPrice(bMatch, col.withDirectSettlement) ?? Infinity)
      : Infinity;
    return aPrice - bPrice;
  });

  const vendorSummaries = vendorsSorted.map((vendor) => {
    const vendorOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === vendor
    );
    const vendorHasOffers = currentTabConfig.columns.some((col) => {
      const match = pickOfferByVariant(
        vendorOffers,
        col.period,
        col.withDirectSettlement
      );
      const price = match
        ? getOfferPrice(match, col.withDirectSettlement)
        : null;
      return price != null && price > 0;
    });

    const vendorError =
      vendorOffers.find((o) => typeof o.error === "string" && o.error.trim())
        ?.error ??
      "Nu există o primă selectabilă pentru perioada curentă.";

    return {
      vendor,
      vendorOffers,
      vendorHasOffers,
      vendorError,
    };
  });
  const availableVendorSummaries = vendorSummaries.filter(
    (summary) => summary.vendorHasOffers
  );
  const unavailableVendorSummaries = vendorSummaries.filter(
    (summary) => !summary.vendorHasOffers
  );
  const hasAnyOffer = availableVendorSummaries.length > 0;

  const handleSelect = (
    offer: RcaOffer,
    vendor: string,
    period: string,
    withDirectSettlement: boolean
  ) => {
    if (offer.error) return;
    const basePremium = getOfferPrice(offer, withDirectSettlement);
    if (basePremium == null) return;

    const offersCacheKey = buildAddonOffersCacheKey(
      period,
      withDirectSettlement
    );
    const selectionKey = buildAddonSelectionKey(
      vendor,
      period,
      withDirectSettlement
    );
    const selectedProductIds = getSelectedAddonIds(selectionKey);
    const offersCache = addonOffersByCacheKey.get(offersCacheKey) ?? new Map();
    const addons = resolveSelectedAddons(
      offersCache,
      selectedProductIds,
      Number(period)
    );
    const addonTotal = addons.reduce((sum, a) => sum + a.premium, 0);

    onSelectOffer({
      offer,
      period,
      withDirectSettlement,
      premium: basePremium + addonTotal,
      addons: addons.length > 0 ? addons : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Alege cel mai mic pret RCA!
        </h2>
        {isOffersLoading && offers.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Se încarcă ofertele rămase...
          </p>
        )}
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let classes =
            "relative rounded-full px-6 py-3 text-sm font-semibold transition-all cursor-pointer select-none ";
          if (isActive) {
            classes += "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20 scale-105";
          } else {
            classes +=
              "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700";
          }
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
              }}
              className={classes}
            >
              <span className="block leading-tight">{tab.label}</span>
              <span
                className={`block text-[10px] font-normal ${
                  isActive ? "opacity-80" : "opacity-60"
                }`}
              >
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-end md:gap-4">
        <div />
        <div
          className={`grid ${priceColumnGridClass(currentTabConfig.columns.length)} w-full gap-3 md:max-w-[19.5rem] md:justify-self-end`}
        >
          {currentTabConfig.columns.map((col) => (
            <div
              key={`${col.period}-${col.withDirectSettlement}`}
              className="w-full text-center text-sm font-bold text-blue-700"
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Offer cards */}
      {!hasAnyOffer ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 py-10 text-center">
          <p className="text-gray-500">
            Nu există oferte disponibile pentru această perioadă.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === "short" && (
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
              Produse suplimentare disponibile doar pentru 6 și 12 luni.
            </p>
          )}
          {availableVendorSummaries.map(({ vendor, vendorOffers }) => {
            const logoUrl =
              vendorOffers.find((o) => o.vendorLogoUrl)?.vendorLogoUrl ||
              getLocalVendorLogo(vendor);

            return (
              <div
                key={vendor}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-end md:gap-4">
                  {/* Logo + info */}
                  <div className="flex shrink-0 items-center gap-3 md:flex-col md:items-start md:gap-1">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={vendor}
                        width={140}
                        height={42}
                        className="h-9 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-base font-bold text-gray-900">
                        {vendor}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                        clasa BM: B8
                        <OfferLegalInfo
                          vendorName={vendor}
                          vendorOffers={vendorOffers}
                          orderId={orderId}
                          orderHash={orderHash}
                          disclosureCache={disclosureCache}
                          onCacheUpdate={onDisclosureCacheUpdate}
                          orderReferenceTariff={orderReferenceTariff}
                          onOrderReferenceTariff={onOrderReferenceTariff}
                          inline
                        />
                        <OfferPidLink vendorName={vendor} />
                      </span>
                      {(() => {
                        const exclusions = getGreenCardExclusions(vendor);
                        if (exclusions.length === 0) return null;
                        return (
                          <span
                            className="text-[10px] text-gray-400 cursor-help"
                            title={`Țări excluse Carte Verde: ${exclusions.join(", ")}`}
                          >
                            Excluderi C.V.: {exclusions.join(", ")}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Price buttons */}
                  <div
                    className={`grid ${priceColumnGridClass(currentTabConfig.columns.length)} w-full gap-3 md:max-w-[19.5rem] md:justify-self-end`}
                  >
                    {currentTabConfig.columns.map((col) => {
                      const colKey = `${col.period}-${col.withDirectSettlement}`;
                      const match = pickOfferByVariant(
                        vendorOffers,
                        col.period,
                        col.withDirectSettlement
                      );
                      const basePrice = match
                        ? getOfferPrice(match, col.withDirectSettlement)
                        : null;
                      const addonTotal =
                        addonQuotePeriodMonths?.includes(col.period) === true
                          ? getAddonTotalForVendorColumn(
                              vendor,
                              col.period,
                              col.withDirectSettlement
                            )
                          : 0;
                      const price =
                        basePrice != null ? basePrice + addonTotal : null;
                      const isAddonPeriod = (ADDON_PERIODS as readonly string[]).includes(
                        col.period
                      );
                      const offersCacheKey = buildAddonOffersCacheKey(
                        col.period,
                        col.withDirectSettlement
                      );
                      const selectionKey = buildAddonSelectionKey(
                        vendor,
                        col.period,
                        col.withDirectSettlement
                      );
                      const addonAvailability =
                        addonCacheKeyAvailable[offersCacheKey];
                      const addonLoading =
                        addonCacheKeyLoading[offersCacheKey] === true;
                      const addonTeaserState: AddonTeaserState | null = isAddonPeriod
                        ? addonAvailability === true
                          ? "ready"
                          : addonLoading || addonAvailability === undefined
                            ? "loading"
                            : "unavailable"
                        : null;
                      const showAddonTeaser =
                        isAddonPeriod && addonTeaserState !== "unavailable";
                      const addonTeaserLoading = addonTeaserState === "loading";
                      const addonKnownAvailable = addonTeaserState === "ready";
                      const selectedAddonIds =
                        getSelectedAddonIds(selectionKey);
                      const columnAddonTotal =
                        isAddonPeriod && addonKnownAvailable
                          ? getAddonTotalForVendorColumn(
                              vendor,
                              col.period,
                              col.withDirectSettlement
                            )
                          : 0;
                      const addonTeaserLine = addonTeaserLoading
                        ? "Se încarcă..."
                        : selectedAddonIds.length > 0
                          ? formatAddonTeaserLine(
                              selectedAddonIds.length,
                              columnAddonTotal
                            )
                          : "Produse suplimentare disponibile";

                      if (!match || price == null || price <= 0) {
                        return (
                          <div
                            key={colKey}
                            className="flex w-full flex-col items-stretch rounded-xl border border-gray-100 bg-gray-50/80 p-3 md:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0"
                          >
                            <span className="mb-2 text-sm font-semibold text-blue-700 md:hidden">
                              {col.label}
                            </span>
                            <div
                              className="mb-1 flex min-h-[18px] w-full items-center justify-center"
                              aria-hidden
                            />
                            <span className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm text-gray-300">
                              -
                            </span>
                            {isAddonPeriod ? (
                              <div
                                className="mt-1.5 flex min-h-[2.75rem] w-full flex-col items-center justify-start"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                        );
                      }

                      const isCheapest =
                        cheapestByColumn[colKey] === price;

                      return (
                        <div
                          key={colKey}
                          className="flex w-full flex-col items-stretch rounded-xl border border-gray-100 bg-gray-50/80 p-3 md:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0"
                        >
                          <span className="mb-2 text-sm font-semibold text-blue-700 md:hidden">
                            {col.label}
                          </span>
                          <div className="mb-1 flex min-h-[18px] w-full items-center justify-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isCheapest ? "bg-amber-100 text-amber-700" : "invisible"}`}
                            >
                              Cel mai bun preț
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelect(
                                match,
                                vendor,
                                col.period,
                                col.withDirectSettlement
                              )
                            }
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
                          >
                            <svg
                              className="h-3.5 w-3.5 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                              />
                            </svg>
                            {formatRoPrice(price)} lei
                          </button>
                          {isAddonPeriod ? (
                            <div className="mt-1.5 flex min-h-[2.75rem] w-full flex-col items-center justify-start">
                              {showAddonTeaser ? (
                                addonTeaserState === "loading" ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="flex w-full cursor-not-allowed flex-col items-center gap-0.5 px-0.5 text-center text-gray-400"
                                    aria-live="polite"
                                    aria-busy="true"
                                    aria-disabled="true"
                                  >
                                    <svg
                                      className="h-3.5 w-3.5 shrink-0 animate-spin"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                      />
                                    </svg>
                                    <span className="w-full text-center text-[10px] leading-tight line-clamp-2">
                                      {addonTeaserLine}
                                    </span>
                                  </button>
                                ) : addonTeaserState === "ready" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAddonModal(
                                        vendor,
                                        col.period,
                                        col.withDirectSettlement
                                      )
                                    }
                                    className="flex w-full flex-col items-center gap-0.5 px-0.5 text-center text-[#2563EB] transition-colors hover:text-blue-700"
                                    aria-label={`Produse suplimentare ${col.period} luni`}
                                  >
                                    <svg
                                      className="h-3.5 w-3.5 shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                      />
                                    </svg>
                                    <span className="w-full text-center text-[10px] leading-tight line-clamp-2">
                                      {addonTeaserLine}
                                    </span>
                                  </button>
                                ) : null
                              ) : isAddonPeriod ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (col.period !== "6" && col.period !== "12") return;
                                    void ensureAddonOffersForCacheKey(
                                      col.period,
                                      col.withDirectSettlement,
                                      { force: true }
                                    );
                                  }}
                                  className="w-full text-center text-[10px] text-[#2563EB] hover:underline"
                                >
                                  Produse indisponibile. Reîncearcă
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unavailableVendorSummaries.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowUnavailableOffers((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
            aria-expanded={showUnavailableOffers}
            aria-controls="rca-unavailable-offers"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                Oferte indisponibile
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {unavailableVendorSummaries.length}
              </span>
            </span>
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform ${
                showUnavailableOffers ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
          {showUnavailableOffers && (
            <div
              id="rca-unavailable-offers"
              className="space-y-3 border-t border-gray-100 px-4 py-3"
            >
              {unavailableVendorSummaries.map(
                ({ vendor, vendorOffers, vendorError }) => {
                  const logoUrl =
                    vendorOffers.find((o) => o.vendorLogoUrl)?.vendorLogoUrl ||
                    getLocalVendorLogo(vendor);
                  return (
                    <div
                      key={`unavailable-${vendor}`}
                      className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm opacity-60"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="flex shrink-0 items-center gap-3 md:w-44 md:flex-col md:items-start md:gap-1">
                          {logoUrl ? (
                            <Image
                              src={logoUrl}
                              alt={vendor}
                              width={140}
                              height={42}
                              className="h-9 w-auto object-contain grayscale"
                              unoptimized
                            />
                          ) : (
                            <span className="text-base font-bold text-gray-400">
                              {vendor}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-sm text-red-600">
                          {vendorError}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}

      {isOffersLoading && offers.length > 0 && (
        <ColoredDotsLoader
          subtitle="Se generează ofertele rămase..."
          className="py-2"
        />
      )}

      {openAddonModalSelectionKey && (() => {
        const { period, withDirectSettlement } = parseAddonSelectionKey(
          openAddonModalSelectionKey
        );
        const modalVendorLabel =
          vendors.find(
            (v) =>
              buildAddonSelectionKey(v, period, withDirectSettlement) ===
              openAddonModalSelectionKey
          ) ?? parseAddonSelectionKey(openAddonModalSelectionKey).vendorName;
        const offersCacheKey = buildAddonOffersCacheKey(
          period,
          withDirectSettlement
        );
        const cachedOffers = addonOffersByCacheKey.get(offersCacheKey);
        return (
          <RcaAddonsModal
            isOpen
            vendorName={modalVendorLabel}
            periodMonth={period}
            orderId={orderId}
            orderHash={orderHash}
            policyStartDate={toRcaDate(policyStartDate)}
            isLeasing={isLeasing}
            offersCacheKey={offersCacheKey}
            draftProductIds={addonModalDraftIds}
            onDraftChange={setAddonModalDraftIds}
            onConfirm={confirmAddonModal}
            onClose={closeAddonModal}
            offersByProductId={cachedOffers}
            isLoadingMoreOffers={addonCacheKeyLoading[offersCacheKey] === true}
            onOffersCacheUpdate={handleOffersCacheUpdate}
            onQuoted={handleOpenModalAddonQuoted}
            getAddonCatalog={getAddonCatalog}
          />
        );
      })()}

      {/* Footer message */}
      <div className="rounded-lg bg-[#2563EB]/5 px-4 py-3 text-center">
        <p className="text-sm text-blue-800">
          Plătești cu cardul și{" "}
          <span className="font-semibold">
            primești instant polița RCA pe email
          </span>
          !
        </p>
      </div>
    </div>
  );
}
