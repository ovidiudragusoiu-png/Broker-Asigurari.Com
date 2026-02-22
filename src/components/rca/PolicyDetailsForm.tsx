"use client";

import type { AddressRequest } from "@/types/insuretech";
import type { OwnerType } from "@/types/rcaFlow";
import AddressForm from "@/components/shared/AddressForm";

interface PolicyDetailsFormProps {
  ownerType: OwnerType;
  registrationCertSeries: string;
  startDate: string;
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  registrationNumber: string;
  idType: "CI" | "PASSPORT";
  idSeries: string;
  idNumber: string;
  address: AddressRequest;
  onFieldChange: (field: string, value: string) => void;
  onAddressChange: (address: AddressRequest) => void;
  onContinue: () => void;
  isValid: boolean;
}

export default function PolicyDetailsForm({
  ownerType,
  registrationCertSeries,
  startDate,
  ownerFirstName,
  ownerLastName,
  companyName,
  registrationNumber,
  idType,
  idSeries,
  idNumber,
  address,
  onFieldChange,
  onAddressChange,
  onContinue,
  isValid,
}: PolicyDetailsFormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Detalii polita</h2>
        <p className="mt-1 text-sm text-gray-500">
          Completeaza datele necesare pentru emiterea politei
        </p>
      </div>

      {/* Registration certificate series */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Serie carte de identitate vehicul (CIV/talon)
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          value={registrationCertSeries}
          onChange={(e) => onFieldChange("registrationCertSeries", e.target.value.toUpperCase())}
          placeholder="Serie CIV"
        />
      </div>

      {/* Start date */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Data inceput polita
        </label>
        <input
          type="date"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={startDate}
          onChange={(e) => onFieldChange("startDate", e.target.value)}
        />
      </div>

      {ownerType === "PF" ? (
        <>
          {/* Name fields for PF */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nume</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={ownerLastName}
                onChange={(e) => onFieldChange("ownerLastName", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prenume</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={ownerFirstName}
                onChange={(e) => onFieldChange("ownerFirstName", e.target.value)}
              />
            </div>
          </div>

          {/* ID document */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip document</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={idType}
                onChange={(e) => onFieldChange("idType", e.target.value)}
              >
                <option value="CI">Carte de Identitate</option>
                <option value="PASSPORT">Pasaport</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Serie</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                value={idSeries}
                onChange={(e) => onFieldChange("idSeries", e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={idNumber}
                onChange={(e) => onFieldChange("idNumber", e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Company fields for PJ */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Denumire firma</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={companyName}
              onChange={(e) => onFieldChange("companyName", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nr. Inregistrare (Reg. Com.)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={registrationNumber}
              onChange={(e) => onFieldChange("registrationNumber", e.target.value)}
            />
          </div>
        </>
      )}

      {/* Address */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Adresa din talon (CIV)
        </h3>
        <AddressForm value={address} onChange={onAddressChange} />
      </div>

      {/* Continue */}
      <div className="text-center">
        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continua
        </button>
        {!isValid && (
          <p className="mt-1 text-xs text-amber-600">Completeaza toate campurile obligatorii</p>
        )}
      </div>
    </div>
  );
}
