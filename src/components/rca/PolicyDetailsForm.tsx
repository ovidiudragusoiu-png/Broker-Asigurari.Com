"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api/client";
import type { AddressRequest } from "@/types/insuretech";
import type { OwnerType } from "@/types/rcaFlow";
import { btn, inputClass as inputToken } from "@/lib/ui/tokens";

// Bucharest sectors: each is a separate county + city in the InsureTech API
const BUCHAREST_SECTORS = [
  { label: "Sector 1", countyId: 14, cityId: 1598 },
  { label: "Sector 2", countyId: 5,  cityId: 1599 },
  { label: "Sector 3", countyId: 9,  cityId: 1600 },
  { label: "Sector 4", countyId: 22, cityId: 1601 },
  { label: "Sector 5", countyId: 39, cityId: 1602 },
  { label: "Sector 6", countyId: 8,  cityId: 1603 },
];

interface StreetResult {
  id: number;
  postalCode: string;
  streetTypeId: number;
  streetTypeName: string;
  streetName: string;
  streetNumberRange: string | null;
}

interface PolicyDetailsFormProps {
  ownerType: OwnerType;
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  registrationNumber: string;
  caenCode: string | null;
  companyFound: boolean;
  idSeries: string;
  idNumber: string;
  email: string;
  phoneNumber: string;
  address: AddressRequest;
  isBucharest: boolean;
  onFieldChange: (field: string, value: string) => void;
  onCaenChange: (code: string | null) => void;
  onAddressChange: (address: AddressRequest) => void;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
  onContinue: () => void;
  isValid: boolean;
}

export default function PolicyDetailsForm({
  ownerType,
  ownerFirstName,
  ownerLastName,
  companyName,
  registrationNumber,
  caenCode,
  companyFound,
  idSeries,
  idNumber,
  email,
  phoneNumber,
  address,
  isBucharest,
  onFieldChange,
  onCaenChange,
  onAddressChange,
  onEmailChange,
  onPhoneChange,
  onContinue,
  isValid,
}: PolicyDetailsFormProps) {
  const updateAddress = (field: keyof AddressRequest, value: string | number | null) => {
    onAddressChange({ ...address, [field]: value });
  };

  // Street autocomplete
  const [streetQuery, setStreetQuery] = useState(address.streetName || "");
  const [streetResults, setStreetResults] = useState<StreetResult[]>([]);
  const [streetSelected, setStreetSelected] = useState(!!address.streetName && !!address.postalCode);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const streetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (streetContainerRef.current && !streetContainerRef.current.contains(e.target as Node)) {
        setShowStreetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchStreets = useCallback((query: string) => {
    if (!address.cityId || query.trim().length < 3) {
      setStreetResults([]);
      return;
    }
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current);
    streetDebounceRef.current = setTimeout(() => {
      api.get<StreetResult[]>(
        `/online/address/utils/postalCodes/find?cityId=${address.cityId}&streetName=${encodeURIComponent(query.trim())}`
      )
        .then((data) => {
          setStreetResults(data.slice(0, 20));
          setShowStreetDropdown(data.length > 0);
        })
        .catch(() => setStreetResults([]));
    }, 300);
  }, [address.cityId]);

  const handleStreetInputChange = (value: string) => {
    setStreetQuery(value);
    setStreetSelected(false);
    // Also update the raw streetName so it persists if user doesn't pick from dropdown
    onAddressChange({ ...address, streetName: value, postalCode: "", streetTypeId: null });
    searchStreets(value);
  };

  const handleStreetSelect = (result: StreetResult) => {
    const fullName = `${result.streetTypeName} ${result.streetName}`;
    setStreetQuery(fullName);
    setStreetSelected(true);
    setShowStreetDropdown(false);
    setStreetResults([]);
    onAddressChange({
      ...address,
      streetName: fullName,
      streetTypeId: result.streetTypeId,
      postalCode: result.postalCode,
    });
  };

  // CAEN codes for PJ
  const [caenCodes, setCaenCodes] = useState<string[]>([]);
  const [caenFilter, setCaenFilter] = useState("");

  useEffect(() => {
    if (ownerType === "PJ") {
      api.get<string[]>("/online/caencodes")
        .then((data) => setCaenCodes(data.filter((c) => typeof c === "string" && c.length > 0)))
        .catch(() => {});
    }
  }, [ownerType]);

  const filteredCaen = caenFilter.length >= 2
    ? caenCodes.filter((c) => c.startsWith(caenFilter)).slice(0, 20)
    : [];

  const inputClass = inputToken;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Title */}
      <div className="text-center">
        {ownerType === "PJ" && !companyFound ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">
              Firma nu a fost găsită în baza de date.
            </h2>
            <p className="mt-1 text-sm text-gray-500">Vă rugăm să completați datele manual.</p>
          </>
        ) : (
          <h2 className="text-2xl font-bold text-gray-900">
            Completați datele {ownerType === "PF" ? "personale" : "firmei"}
          </h2>
        )}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                className={inputClass}
                value={companyName}
                onChange={(e) => onFieldChange("companyName", e.target.value)}
                placeholder="NUME FIRMA"
              />
            </div>
          </div>
          <input
            type="text"
            className={inputClass}
            value={registrationNumber}
            onChange={(e) => onFieldChange("registrationNumber", e.target.value)}
            placeholder="NR. INREGISTRARE (REG. COM.)"
          />

          {/* CAEN dropdown with search */}
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              CAEN
            </label>
            {caenCode ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm">
                  {caenCode}
                </span>
                <button
                  type="button"
                  onClick={() => { onCaenChange(null); setCaenFilter(""); }}
                  className="rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Schimbă
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className={inputClass}
                  value={caenFilter}
                  onChange={(e) => setCaenFilter(e.target.value)}
                  placeholder="Introdu primele cifre (ex: 62, 6202)"
                />
                {filteredCaen.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredCaen.map((code) => (
                      <li key={code}>
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50"
                          onClick={() => { onCaenChange(code); setCaenFilter(""); }}
                        >
                          <span className="font-semibold">{code}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Email
          </label>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="email@exemplu.ro"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Telefon
          </label>
          <input
            type="tel"
            className={inputClass}
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="07XXXXXXXX"
          />
        </div>
      </div>

      {/* Bucharest sector dropdown */}
      {isBucharest && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sector
          </label>
          <select
            className={inputClass}
            value={address.countyId ?? ""}
            onChange={(e) => {
              const sector = BUCHAREST_SECTORS.find((s) => s.countyId === Number(e.target.value));
              if (sector) {
                onAddressChange({ ...address, countyId: sector.countyId, cityId: sector.cityId, postalCode: "", streetName: "", streetTypeId: null });
                setStreetQuery("");
                setStreetSelected(false);
              }
            }}
          >
            <option value="">— Selectează sectorul —</option>
            {BUCHAREST_SECTORS.map((s) => (
              <option key={s.countyId} value={s.countyId}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Address - street autocomplete + number fields */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3 relative" ref={streetContainerRef}>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nume stradă
          </label>
          <input
            type="text"
            className={inputClass}
            value={streetQuery}
            onChange={(e) => handleStreetInputChange(e.target.value)}
            onFocus={() => { if (streetResults.length > 0 && !streetSelected) setShowStreetDropdown(true); }}
            placeholder={address.cityId ? "Introduceți min. 3 litere..." : "Selectează sectorul mai întâi"}
            disabled={!address.cityId}
          />
          {streetSelected && address.postalCode && (
            <p className="mt-0.5 text-xs text-green-600">
              CP: {address.postalCode}
            </p>
          )}
          {showStreetDropdown && streetResults.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {streetResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                    onClick={() => handleStreetSelect(r)}
                  >
                    {r.streetTypeName} {r.streetName}
                    {r.streetNumberRange ? ` ${r.streetNumberRange}` : ""}
                    <span className="ml-1 text-gray-400">| CP: {r.postalCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            &nbsp;
          </label>
          <input
            type="text"
            className={inputClass}
            value={address.streetNumber}
            onChange={(e) => updateAddress("streetNumber", e.target.value)}
            placeholder="NR."
          />
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            &nbsp;
          </label>
          <input
            type="text"
            className={inputClass}
            value={address.building}
            onChange={(e) => updateAddress("building", e.target.value)}
            placeholder="BLOC"
          />
        </div>
        <div className="col-span-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            &nbsp;
          </label>
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
          className={btn.primary}
        >
          Înainte
        </button>
      </div>
    </div>
  );
}
