"use client";

import type { AddressRequest } from "@/types/insuretech";
import type { OwnerType } from "@/types/rcaFlow";

interface PolicyDetailsFormProps {
  ownerType: OwnerType;
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  registrationNumber: string;
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
  ownerFirstName,
  ownerLastName,
  companyName,
  registrationNumber,
  idSeries,
  idNumber,
  address,
  onFieldChange,
  onAddressChange,
  onContinue,
  isValid,
}: PolicyDetailsFormProps) {
  const updateAddress = (field: keyof AddressRequest, value: string | number | null) => {
    onAddressChange({ ...address, [field]: value });
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-rose-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          <span className="text-rose-500">Si...</span>datele personale te rog!
        </h2>
      </div>

      {ownerType === "PF" ? (
        <>
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className={inputClass}
              value={ownerLastName}
              onChange={(e) => onFieldChange("ownerLastName", e.target.value)}
              placeholder="NUME PROPRIETAR"
            />
            <input
              type="text"
              className={inputClass}
              value={ownerFirstName}
              onChange={(e) => onFieldChange("ownerFirstName", e.target.value)}
              placeholder="PRENUME PROPRIETAR"
            />
          </div>

          {/* ID document */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className={`${inputClass} uppercase`}
              value={idSeries}
              onChange={(e) => onFieldChange("idSeries", e.target.value.toUpperCase())}
              placeholder="SERIE CI"
            />
            <input
              type="text"
              className={inputClass}
              value={idNumber}
              onChange={(e) => onFieldChange("idNumber", e.target.value)}
              placeholder="NUMAR CI"
            />
          </div>
        </>
      ) : (
        <>
          {/* Company fields */}
          <input
            type="text"
            className={inputClass}
            value={companyName}
            onChange={(e) => onFieldChange("companyName", e.target.value)}
            placeholder="DENUMIRE FIRMA"
          />
          <input
            type="text"
            className={inputClass}
            value={registrationNumber}
            onChange={(e) => onFieldChange("registrationNumber", e.target.value)}
            placeholder="NR. INREGISTRARE (REG. COM.)"
          />
        </>
      )}

      {/* Address - flat fields matching rca.ro */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <input
            type="text"
            className={inputClass}
            value={address.streetName}
            onChange={(e) => updateAddress("streetName", e.target.value)}
            placeholder="STRADA (DIN TALON)"
          />
        </div>
        <div className="col-span-1">
          <input
            type="text"
            className={inputClass}
            value={address.streetNumber}
            onChange={(e) => updateAddress("streetNumber", e.target.value)}
            placeholder="NR."
          />
        </div>
        <div className="col-span-1">
          <input
            type="text"
            className={inputClass}
            value={address.building}
            onChange={(e) => updateAddress("building", e.target.value)}
            placeholder="BLOC"
          />
        </div>
        <div className="col-span-1">
          <input
            type="text"
            className={inputClass}
            value={address.entrance}
            onChange={(e) => updateAddress("entrance", e.target.value)}
            placeholder="SCARA"
          />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3" />
        <div className="col-span-1">
          {/* Etaj as free text — floorId will be resolved later if needed */}
          <input
            type="text"
            className={inputClass}
            value={address.floorId != null ? String(address.floorId) : ""}
            onChange={(e) => updateAddress("floorId", e.target.value ? Number(e.target.value) || null : null)}
            placeholder="ETAJ"
          />
        </div>
        <div className="col-span-2">
          <input
            type="text"
            className={inputClass}
            value={address.apartment}
            onChange={(e) => updateAddress("apartment", e.target.value)}
            placeholder="AP."
          />
        </div>
      </div>

      {/* Continue */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className="w-full max-w-xs rounded-full bg-gray-400 px-8 py-3.5 text-base font-bold uppercase tracking-wide text-white transition-colors hover:bg-rose-500 disabled:opacity-50 sm:w-auto"
          style={isValid ? { backgroundColor: "#f43f5e" } : undefined}
        >
          Inainte
        </button>
      </div>
    </div>
  );
}
