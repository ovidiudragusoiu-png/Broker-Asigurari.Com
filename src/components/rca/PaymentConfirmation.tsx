"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api/client";
import type { RcaFlowState } from "@/types/rcaFlow";
import { getLocalVendorLogo, periodText } from "@/lib/utils/rcaHelpers";
import TermsModal from "./TermsModal";

interface PaymentConfirmationProps {
  state: RcaFlowState;
  onConsentAndPay: () => Promise<void>;
}

export default function PaymentConfirmation({
  state,
  onConsentAndPay,
}: PaymentConfirmationProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = state.selectedOffer;
  const vendorLogo = offer?.offer.vendorLogoUrl || getLocalVendorLogo(offer?.offer.vendorName ?? "");

  const handlePayClick = () => {
    setShowTerms(true);
  };

  const handleTermsAgree = async () => {
    setShowTerms(false);
    setProcessing(true);
    setError(null);
    try {
      await onConsentAndPay();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la procesarea platii");
      setProcessing(false);
    }
  };

  if (!offer) {
    return <p className="text-center text-gray-500">Selectati mai intai o oferta.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Confirmare plata</h2>
      </div>

      {/* Summary card */}
      <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-center bg-gray-50 py-4">
          <span className="text-5xl">{"\uD83D\uDE97"}</span>
        </div>

        <div className="space-y-2 border-t border-gray-100 p-5 text-center text-sm">
          {state.ownerType === "PF" ? (
            <p className="font-semibold text-gray-900">
              {state.ownerLastName.toUpperCase()} {state.ownerFirstName.toUpperCase()}
            </p>
          ) : (
            <p className="font-semibold text-gray-900">
              {state.companyName.toUpperCase()}
            </p>
          )}
          <p className="text-gray-600">
            {state.ownerType === "PF" ? "CNP" : "CUI"}: {state.cnpOrCui}
          </p>
          <p className="text-gray-500">Sasiu: {state.vehicle.vin}</p>
          <p className="font-semibold text-rose-600">
            {state.vehicle.model} - {state.vehicle.licensePlate}
          </p>
          <p className="text-rose-600">
            Polita RCA {offer.offer.vendorName}
          </p>
          <p className="text-rose-600">
            {periodText(Number(offer.period))} / din {state.startDate}
          </p>
          <p className="text-xs text-gray-400">
            vezi excluderi carte verde: {"\u24D8"}
          </p>
        </div>

        {/* Price */}
        <div className="border-t border-gray-100 py-3 text-center">
          <span className="inline-block rounded-md bg-green-500 px-5 py-2 text-lg font-bold text-white">
            {new Intl.NumberFormat("ro-RO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(offer.premium)}{" "}
            lei
          </span>
        </div>

        {vendorLogo && (
          <div className="flex justify-center pb-3">
            <Image
              src={vendorLogo}
              alt={offer.offer.vendorName}
              width={100}
              height={30}
              className="h-6 w-auto object-contain"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Declaration */}
      <div className="mx-auto max-w-lg rounded-lg bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-blue-600">{"\u27A1\uFE0F"}</span>
          <p className="text-sm text-gray-700">
            DAND CLICK pe &quot;PLATESC&quot;, declar ca am peste 18 ani si ca datele
            furnizate pentru incheierea politei RCA sunt reale.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-auto max-w-lg rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pay button */}
      <div className="text-center">
        {processing ? (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm">Se proceseaza...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePayClick}
            className="rounded-xl bg-rose-500 px-10 py-4 text-base font-bold uppercase tracking-wide text-white shadow-md hover:bg-rose-600 hover:shadow-lg transition-all"
          >
            Date corecte, platesc
          </button>
        )}
      </div>

      {/* Terms modal */}
      <TermsModal
        isOpen={showTerms}
        onAgree={handleTermsAgree}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
}
