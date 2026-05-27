"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { api } from "@/lib/api/client";
import type { RcaOffer, RcaOfferLegalDisclosure } from "@/types/rcaFlow";
import {
  buildRcaDisclosurePopoverLines,
  mergeLegalDisclosure,
  normalizeRcaOfferLegalDisclosure,
  parseOrderReferenceTariff,
  pickOfferByVariant,
} from "@/lib/utils/rcaHelpers";

interface OfferLegalInfoProps {
  vendorName: string;
  vendorOffers: RcaOffer[];
  orderId: number | null;
  orderHash: string | null;
  disclosureCache: Map<number, RcaOfferLegalDisclosure>;
  onCacheUpdate: (
    updater: (
      prev: Map<number, RcaOfferLegalDisclosure>
    ) => Map<number, RcaOfferLegalDisclosure>
  ) => void;
  orderReferenceTariff: number | null | undefined;
  onOrderReferenceTariff: (value: number | null | undefined) => void;
  /** Smaller trigger for inline placement (e.g. next to clasa BM). */
  inline?: boolean;
}

/** Periods we may show commission / net premium for (standard + DD). */
const DISCLOSURE_VARIANTS: {
  period: string;
  withDirectSettlement: boolean;
}[] = [
  { period: "6", withDirectSettlement: false },
  { period: "12", withDirectSettlement: false },
  { period: "6", withDirectSettlement: true },
  { period: "12", withDirectSettlement: true },
];

function collectVariantOffers(vendorOffers: RcaOffer[]): RcaOffer[] {
  const seen = new Set<number>();
  const result: RcaOffer[] = [];
  for (const variant of DISCLOSURE_VARIANTS) {
    const match = pickOfferByVariant(
      vendorOffers,
      variant.period,
      variant.withDirectSettlement
    );
    if (!match?.id || match.id <= 0 || seen.has(match.id)) continue;
    seen.add(match.id);
    result.push(match);
  }
  return result;
}

function disclosureNeedsFetch(
  offer: RcaOffer,
  cache: Map<number, RcaOfferLegalDisclosure>
): boolean {
  const merged = mergeLegalDisclosure(offer.legalDisclosure, cache.get(offer.id));
  return (
    merged?.referenceTariff == null &&
    merged?.brokerCommission?.amount == null &&
    merged?.directSettlementBrokerCommission?.amount == null
  );
}

export default function OfferLegalInfo({
  vendorName,
  vendorOffers,
  orderId,
  orderHash,
  disclosureCache,
  onCacheUpdate,
  orderReferenceTariff,
  onOrderReferenceTariff,
  inline = false,
}: OfferLegalInfoProps) {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const variantOffers = collectVariantOffers(vendorOffers);

  const disclosuresFromCache = variantOffers
    .map((o) => {
      const merged = mergeLegalDisclosure(
        o.legalDisclosure,
        disclosureCache.get(o.id)
      );
      if (!merged) return null;
      return {
        ...merged,
        periodMonths: merged.periodMonths ?? o.periodMonths,
        withDirectSettlement:
          merged.withDirectSettlement ?? o.withDirectSettlement,
      };
    })
    .filter((d): d is RcaOfferLegalDisclosure => d != null);

  const popoverLines = buildRcaDisclosurePopoverLines({
    vendorName,
    disclosures: disclosuresFromCache,
    orderReferenceTariff,
  });

  const hasCachedData =
    disclosuresFromCache.length > 0 || orderReferenceTariff != null;

  const loadDisclosures = useCallback(async () => {
    if (!orderHash) return;

    const missingOffers = variantOffers.filter((o) =>
      disclosureNeedsFetch(o, disclosureCache)
    );
    const needsOrderTariff =
      orderReferenceTariff === undefined &&
      orderId != null &&
      missingOffers.length > 0;

    if (missingOffers.length === 0 && !needsOrderTariff) return;

    setLoading(true);
    setFetchError(null);

    try {
      const fetches: Promise<void>[] = missingOffers.map(async (offer) => {
        try {
          const raw = await api.get<Record<string, unknown>>(
            `/online/offers/rca/${offer.id}/details/v3?orderHash=${encodeURIComponent(orderHash)}`,
            { timeoutMs: 20000 }
          );
          const parsed = normalizeRcaOfferLegalDisclosure(raw, {
            periodMonths: offer.periodMonths,
            withDirectSettlement: offer.withDirectSettlement,
          });
          if (!parsed) return;
          onCacheUpdate((prev) => {
            const next = new Map(prev);
            next.set(
              offer.id,
              mergeLegalDisclosure(prev.get(offer.id), parsed)!
            );
            return next;
          });
        } catch {
          // Per-offer failure: other insurers still work
        }
      });

      if (needsOrderTariff) {
        fetches.push(
          (async () => {
            try {
              const raw = await api.get<unknown>(
                `/online/offers/rca/order/${orderId}/referenceTariff/v3?orderHash=${encodeURIComponent(orderHash)}`,
                { timeoutMs: 15000 }
              );
              onOrderReferenceTariff(parseOrderReferenceTariff(raw));
            } catch {
              onOrderReferenceTariff(null);
            }
          })()
        );
      }

      await Promise.all(fetches);
    } catch {
      setFetchError("Nu am putut încărca informațiile tarifare.");
    } finally {
      setLoading(false);
    }
  }, [
    disclosureCache,
    onCacheUpdate,
    onOrderReferenceTariff,
    orderHash,
    orderId,
    orderReferenceTariff,
    variantOffers,
  ]);

  useEffect(() => {
    if (!open) return;
    void loadDisclosures();
  }, [open, loadDisclosures]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variantOffers.length === 0) return null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          inline ? "h-3.5 w-3.5" : "h-5 w-5"
        }`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`Informații tarif și comision ${vendorName}`}
        title="Tarif referință și comision broker"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Info
          className={inline ? "h-3 w-3" : "h-3.5 w-3.5"}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left shadow-lg"
        >
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Informații legale
          </p>
          {loading && !hasCachedData && (
            <p className="text-xs text-gray-500">Se încarcă...</p>
          )}
          {fetchError && (
            <p className="mb-1 text-xs text-amber-700">{fetchError}</p>
          )}
          <ul className="space-y-1">
            {popoverLines.map((line, index) => (
              <li
                key={`${line.text}-${index}`}
                className={`text-xs leading-snug ${
                  line.muted ? "font-medium text-gray-500" : "text-gray-700"
                }`}
              >
                {line.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
