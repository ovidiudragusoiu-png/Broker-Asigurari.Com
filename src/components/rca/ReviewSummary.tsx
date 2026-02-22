"use client";

import Image from "next/image";
import type { RcaFlowState } from "@/types/rcaFlow";
import { validateEmail, validatePhoneRO } from "@/lib/utils/validation";
import { getLocalVendorLogo, periodText } from "@/lib/utils/rcaHelpers";

interface ReviewSummaryProps {
  state: RcaFlowState;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
  onConfirm: () => void;
}

export default function ReviewSummary({
  state,
  onEmailChange,
  onPhoneChange,
  onConfirm,
}: ReviewSummaryProps) {
  const offer = state.selectedOffer;
  const emailValid = validateEmail(state.email);
  const phoneValid = validatePhoneRO(state.phoneNumber);
  const isValid = emailValid && phoneValid;

  const vendorLogo = offer?.offer.vendorLogoUrl || getLocalVendorLogo(offer?.offer.vendorName ?? "");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Sumar comanda</h2>
        <p className="mt-1 text-sm text-gray-500">
          Verifica datele inainte de plata
        </p>
      </div>

      {/* Summary card */}
      <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Vehicle illustration */}
        <div className="flex justify-center bg-gray-50 py-4">
          <span className="text-5xl">{"\uD83D\uDE97"}</span>
        </div>

        {/* Details */}
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

          {state.address.countyId && (
            <p className="text-gray-600 uppercase">
              {state.address.streetName && `${state.address.streetName}, `}
              {state.address.streetNumber && `Nr. ${state.address.streetNumber}`}
            </p>
          )}

          <p className="text-gray-500">
            Sasiu: {state.vehicle.vin}
          </p>

          <p className="font-semibold text-rose-600">
            {state.vehicle.model ? `${state.vehicle.model}` : "Vehicul"} - {state.vehicle.licensePlate}
          </p>

          {offer && (
            <>
              <p className="text-rose-600">
                Polita RCA {offer.offer.vendorName}
              </p>
              <p className="text-rose-600">
                {periodText(Number(offer.period))} / din {state.startDate}
              </p>
              <p className="text-xs text-gray-400">
                vezi excluderi carte verde:{" "}
                <span className="cursor-help">{"\u24D8"}</span>
              </p>
            </>
          )}
        </div>

        {/* Price */}
        {offer && (
          <div className="border-t border-gray-100 py-3 text-center">
            <span className="inline-block rounded-md bg-green-500 px-5 py-2 text-lg font-bold text-white">
              {new Intl.NumberFormat("ro-RO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(offer.premium)}{" "}
              lei
            </span>
          </div>
        )}

        {/* Vendor logo */}
        {vendorLogo && (
          <div className="flex justify-center pb-3">
            <Image
              src={vendorLogo}
              alt={offer?.offer.vendorName ?? ""}
              width={100}
              height={30}
              className="h-6 w-auto object-contain"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Contact details */}
      <div className="mx-auto max-w-lg space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Date de contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={state.email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
            {state.email.length > 0 && !emailValid && (
              <p className="mt-1 text-xs text-red-600">Email invalid</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={state.phoneNumber}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="07XXXXXXXX"
            />
            {state.phoneNumber.length > 0 && !phoneValid && (
              <p className="mt-1 text-xs text-red-600">Numar de telefon invalid</p>
            )}
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="text-center">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continua spre plata
        </button>
      </div>
    </div>
  );
}
