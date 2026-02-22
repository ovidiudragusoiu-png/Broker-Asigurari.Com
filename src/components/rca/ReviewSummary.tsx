"use client";

import { useState } from "react";
import Image from "next/image";
import type { RcaFlowState } from "@/types/rcaFlow";
import { getLocalVendorLogo, periodText, getGreenCardExclusions } from "@/lib/utils/rcaHelpers";
import TermsModal from "./TermsModal";
import { btn } from "@/lib/ui/tokens";

/** Mask a CNP/CUI: show first 2 and last 3 chars, rest as stars */
function maskId(value: string): string {
  if (value.length <= 5) return value;
  return value.slice(0, 2) + "*".repeat(value.length - 5) + value.slice(-3);
}

/** Mask a VIN: show only last 6 chars */
function maskVin(vin: string): string {
  if (vin.length <= 6) return vin;
  return "*".repeat(vin.length - 6) + vin.slice(-6);
}

interface ReviewSummaryProps {
  state: RcaFlowState;
  onConsentAndPay: () => Promise<void>;
}

export default function ReviewSummary({
  state,
  onConsentAndPay,
}: ReviewSummaryProps) {
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
      setError(err instanceof Error ? err.message : "Eroare la procesarea plății");
      setProcessing(false);
    }
  };

  if (!offer) {
    return <p className="text-center text-gray-500">Selectați mai întâi o ofertă.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Verificați datele poliței:
        </h2>
      </div>

      {/* Summary card */}
      <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Vehicle illustration */}
        <div className="flex justify-center bg-gray-50 py-4">
          <span className="text-5xl">{"\uD83D\uDE97"}</span>
        </div>

        {/* Details */}
        <div className="space-y-1 border-t border-gray-100 p-5 text-center text-sm">
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
            {state.ownerType === "PF" ? "CNP" : "CUI"}: {maskId(state.cnpOrCui)}
          </p>

          {state.address.streetName && (
            <p className="text-gray-600 uppercase">
              {state.address.streetName}
              {state.address.streetNumber ? `, Nr. ${state.address.streetNumber}` : ""}
            </p>
          )}

          <p className="text-gray-500">
            Sasiu: {state.vehicle.vin}
          </p>

          <p className="font-semibold text-emerald-700">
            {state.vehicle.model ? `${state.vehicle.model}` : "Vehicul"} - {state.vehicle.licensePlate}
          </p>

          <p className="text-emerald-700">
            Poliță RCA {offer.offer.vendorName}
          </p>
          <p className="text-emerald-700">
            {periodText(Number(offer.period))} / din {state.startDate}
          </p>
          {(() => {
            const exclusions = getGreenCardExclusions(offer.offer.vendorName);
            if (exclusions.length === 0) return null;
            return (
              <p className="text-xs text-gray-400">
                Excluderi C.V.: {exclusions.join(", ")}
              </p>
            );
          })()}
        </div>

        {/* Price badge */}
        <div className="border-t border-gray-100 py-3 text-center">
          <span className="inline-block text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat("ro-RO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(offer.premium)}{" "}
            lei
          </span>
        </div>

        {/* Vendor logo */}
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
      <div className="mx-auto flex max-w-lg items-start gap-3 rounded-lg bg-emerald-50 p-4">
        <span className="mt-0.5 text-emerald-600">&#10132;</span>
        <p className="text-sm text-gray-700">
          Prin apăsarea butonului „PLĂTESC", declar că am peste 18 ani și că datele
          furnizate pentru încheierea poliței RCA sunt corecte și reale.
        </p>
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
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-sm">Se procesează...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePayClick}
            className={`${btn.primary} px-10 py-4 text-base uppercase tracking-wide shadow-md hover:shadow-lg`}
          >
            Datele sunt corecte, plătesc
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
