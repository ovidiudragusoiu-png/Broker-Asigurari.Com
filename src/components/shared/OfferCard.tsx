"use client";

import { formatPrice } from "@/lib/utils/formatters";

interface OfferCardProps {
  productName: string;
  vendorName: string;
  premium: number;
  currency?: string;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  coverages?: { name: string; sumInsured?: number; premium?: number }[];
  error?: string | null;
  selected?: boolean;
  onSelect?: () => void;
}

export default function OfferCard({
  productName,
  vendorName,
  premium,
  currency = "RON",
  installments,
  coverages,
  error,
  selected = false,
  onSelect,
}: OfferCardProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h4 className="font-medium text-gray-900">{productName}</h4>
        <p className="text-xs text-gray-500">{vendorName}</p>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
        selected
          ? "border-blue-700 bg-blue-50"
          : "border-gray-200 bg-white hover:border-blue-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{productName}</h4>
          <p className="text-xs text-gray-500">{vendorName}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-blue-700">
            {formatPrice(premium, currency)}
          </p>
        </div>
      </div>

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

      {selected && (
        <div className="mt-3 text-center text-xs font-medium text-blue-700">
          Oferta selectata
        </div>
      )}
    </div>
  );
}
