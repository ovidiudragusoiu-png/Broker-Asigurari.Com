"use client";

import { formatPrice } from "@/lib/utils/formatters";

interface OfferCardProps {
  productName: string;
  vendorName: string;
  vendorLogo?: string;
  premium: number;
  currency?: string;
  insuredAmount?: number;
  insuredAmountCurrency?: string;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  coverages?: { name: string; sumInsured?: number; premium?: number }[];
  badges?: string[];
  /** Small note shown below the price (e.g. "total pentru 2 calatori") */
  priceNote?: string;
  error?: string | null;
  selected?: boolean;
  onSelect?: () => void;
  /** Download offer document callback */
  onDownload?: () => void;
  /** Whether a download is currently in progress */
  downloading?: boolean;
  /** Per-card download error */
  downloadError?: string;
}

export default function OfferCard({
  productName,
  vendorName,
  vendorLogo,
  premium,
  currency = "RON",
  insuredAmount,
  insuredAmountCurrency,
  installments,
  coverages,
  badges,
  priceNote,
  error,
  selected = false,
  onSelect,
  onDownload,
  downloading = false,
  downloadError,
}: OfferCardProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 opacity-60 sm:p-4">
        <div className="flex items-center gap-3">
          {vendorLogo && (
            <img src={vendorLogo} alt={vendorName} className="h-9 w-9 rounded object-contain sm:h-8 sm:w-8" />
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-gray-900 sm:text-sm">{productName}</h4>
            <p className="text-xs text-gray-500">{vendorName}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all duration-200 sm:p-4 ${
        selected
          ? "border-[#2563EB] bg-blue-50/50 shadow-md shadow-blue-500/10"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Header: logo + name + price — stacked on narrow screens */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {vendorLogo ? (
            <img
              src={vendorLogo}
              alt={vendorName}
              className="h-11 w-11 shrink-0 rounded-lg object-contain sm:h-10 sm:w-10"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-400 sm:h-10 sm:w-10 sm:text-xs">
              {(vendorName || "?").charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-semibold leading-snug text-gray-900 sm:truncate sm:text-sm">
              {productName}
            </h4>
            <p className="mt-0.5 text-xs text-gray-500">{vendorName}</p>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-gray-100 pt-2 sm:block sm:shrink-0 sm:border-0 sm:pt-0 sm:text-right">
          <span className="text-xs font-medium text-gray-400 sm:hidden">Prima</span>
          <div>
            <p className="text-xl font-bold leading-tight text-[#2563EB] sm:text-lg">
              {formatPrice(premium, currency)}
            </p>
            {priceNote && (
              <p className="text-xs font-medium text-gray-400 sm:text-[10px]">{priceNote}</p>
            )}
          </div>
        </div>
      </div>

      {/* Insured Amount */}
      {insuredAmount != null && insuredAmount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:py-1.5">
          <svg className="h-4 w-4 shrink-0 text-gray-400 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>
            Suma asigurata:{" "}
            <span className="font-semibold text-gray-900">
              {formatPrice(insuredAmount, insuredAmountCurrency || currency)}
            </span>
          </span>
        </div>
      )}

      {/* Badges (storno, road assistance, etc.) */}
      {badges && badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Installments */}
      {installments && installments.length > 1 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500">Rate:</p>
          <div className="mt-1 space-y-1">
            {installments.map((inst) => (
              <div
                key={inst.installmentNo}
                className="flex justify-between text-xs text-gray-600"
              >
                <span>Rata {inst.installmentNo}</span>
                <span className="font-medium">{formatPrice(inst.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverages */}
      {coverages && coverages.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500">Acoperiri:</p>
          <div className="mt-1 space-y-1.5">
            {coverages.map((cov, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-2 text-xs text-gray-600"
              >
                <span className="min-w-0 leading-snug">{cov.name}</span>
                {cov.sumInsured != null && (
                  <span className="shrink-0 font-medium">{formatPrice(cov.sumInsured, currency)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(onSelect || onDownload) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {onDownload && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                disabled={downloading}
                className="flex min-h-11 w-full flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs sm:py-2"
              >
                {downloading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
                Descarca oferta
              </button>
            )}
            {onSelect && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className={`flex min-h-11 w-full flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all sm:text-xs sm:py-2 ${
                  selected ? "bg-blue-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {selected ? (
                  <>
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Selectata
                  </>
                ) : (
                  <>
                    Alege aceasta oferta
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </>
                )}
              </button>
            )}
          </div>
          {downloadError && (
            <p className="mt-1.5 text-xs text-amber-600">{downloadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
