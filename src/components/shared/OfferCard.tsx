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
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 opacity-60">
        <div className="flex items-center gap-3">
          {vendorLogo && (
            <img src={vendorLogo} alt={vendorName} className="h-8 w-8 rounded object-contain" />
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-900">{productName}</h4>
            <p className="text-xs text-gray-500">{vendorName}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all duration-200 ${
        selected
          ? "border-[#2563EB] bg-blue-50/50 shadow-md shadow-blue-500/10"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Header: logo + name + price */}
      <div className="flex items-center gap-3">
        {vendorLogo ? (
          <img src={vendorLogo} alt={vendorName} className="h-10 w-10 shrink-0 rounded-lg object-contain" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-400">
            {(vendorName || "?").charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900">{productName}</h4>
          <p className="text-xs text-gray-500">{vendorName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-[#2563EB]">
            {formatPrice(premium, currency)}
          </p>
          {priceNote && (
            <p className="text-[10px] font-medium text-gray-400">{priceNote}</p>
          )}
        </div>
      </div>

      {/* Insured Amount */}
      {insuredAmount != null && insuredAmount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Suma asigurata: <span className="font-semibold text-gray-900">{formatPrice(insuredAmount, insuredAmountCurrency || currency)}</span>
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
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <span>{formatPrice(inst.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverages */}
      {coverages && coverages.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-500">Acoperiri:</p>
          <div className="mt-1 space-y-1">
            {coverages.map((cov, i) => (
              <div
                key={i}
                className="flex justify-between text-xs text-gray-600"
              >
                <span>{cov.name}</span>
                {cov.sumInsured != null && (
                  <span>{formatPrice(cov.sumInsured, currency)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(onSelect || onDownload) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                disabled={downloading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {downloading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  selected ? "bg-blue-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {selected ? (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Selectata
                  </>
                ) : (
                  <>
                    Alege aceasta oferta
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </>
                )}
              </button>
            )}
          </div>
          {downloadError && (
            <p className="mt-1.5 text-[10px] text-amber-600">{downloadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
