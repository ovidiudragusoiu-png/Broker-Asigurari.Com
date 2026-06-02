"use client";

import { useEffect, useMemo } from "react";
import RcaAddonPanel from "@/components/rca/RcaAddonPanel";
import { btn } from "@/lib/ui/tokens";
import {
  formatAddonRoPrice,
  sumSelectedAddonPremiums,
} from "@/lib/utils/rcaAddons";
import type { RcaAdditionalOffer, RcaAdditionalProduct } from "@/types/rcaAddons";

export interface RcaAddonsModalProps {
  isOpen: boolean;
  /** RCA insurer card label (e.g. Generali). */
  vendorName: string;
  periodMonth: string;
  orderId: number | null;
  orderHash: string | null;
  policyStartDate: string;
  isLeasing?: boolean;
  offersCacheKey: string;
  draftProductIds: number[];
  onDraftChange: (productIds: number[]) => void;
  onConfirm: () => void;
  onClose: () => void;
  offersByProductId?: Map<number, RcaAdditionalOffer[]>;
  isLoadingMoreOffers?: boolean;
  onOffersCacheUpdate: (
    cacheKey: string,
    offersByProductId: Map<number, RcaAdditionalOffer[]>
  ) => void;
  onQuoted?: (hasOffers: boolean) => void;
  getAddonCatalog: () => Promise<RcaAdditionalProduct[]>;
}

function formatPeriodTitle(periodMonth: string): string {
  return periodMonth === "12" ? "12" : "6";
}

export default function RcaAddonsModal({
  isOpen,
  vendorName,
  periodMonth,
  orderId,
  orderHash,
  policyStartDate,
  isLeasing = false,
  offersCacheKey,
  draftProductIds,
  onDraftChange,
  onConfirm,
  onClose,
  offersByProductId,
  isLoadingMoreOffers = false,
  onOffersCacheUpdate,
  onQuoted,
  getAddonCatalog,
}: RcaAddonsModalProps) {
  const periodMonthsNumber = Number(periodMonth);

  const draftTotal = useMemo(() => {
    if (!offersByProductId) return 0;
    return sumSelectedAddonPremiums(
      offersByProductId,
      draftProductIds,
      periodMonthsNumber
    );
  }, [offersByProductId, draftProductIds, periodMonthsNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="z-layer-modal-elevated fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rca-addons-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="rca-addons-modal-title"
                className="text-lg font-bold text-gray-900"
              >
                Produse suplimentare — {vendorName},{" "}
                {formatPeriodTitle(periodMonth)} luni
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Opționale, la polița RCA ({vendorName})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Închide"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoadingMoreOffers && (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs font-medium text-blue-700">
                Încărcăm restul produselor...
              </p>
              <p className="mt-0.5 text-[11px] text-blue-600">
                Lista completă se actualizează automat pe măsură ce sosesc ofertele.
              </p>
              {(offersByProductId?.size ?? 0) > 0 ? (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100"
                  aria-hidden
                >
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-300" />
                </div>
              ) : (
                <div className="mt-2 space-y-1.5" aria-hidden>
                  <div className="h-3 w-full animate-pulse rounded bg-blue-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-blue-100" />
                </div>
              )}
            </div>
          )}
          <RcaAddonPanel
            embeddedInModal
            orderId={orderId}
            orderHash={orderHash}
            policyStartDate={policyStartDate}
            periodMonth={periodMonth}
            isLeasing={isLeasing}
            isExpanded
            selectedProductIds={draftProductIds}
            onSelectionChange={onDraftChange}
            onOffersCacheUpdate={onOffersCacheUpdate}
            onQuoted={onQuoted}
            offersCacheKey={offersCacheKey}
            initialOffersByProductId={offersByProductId}
            getAddonCatalog={getAddonCatalog}
          />
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Total suplimente selectate
            </span>
            <span className="font-bold text-[#2563EB]">
              + {formatAddonRoPrice(draftTotal)} lei
            </span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`${btn.secondary} w-full sm:w-auto`}
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`${btn.primary} w-full sm:w-auto`}
            >
              Confirmă
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
