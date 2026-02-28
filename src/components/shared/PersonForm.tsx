"use client";

import { useState, useEffect } from "react";
import type {
  PersonRequest,
  PersonRequestPF,
  PersonRequestPJ,
  LegalType,
} from "@/types/insuretech";
import AddressForm, { emptyAddress } from "./AddressForm";
import { api } from "@/lib/api/client";
import {
  validateCNP,
  validateCUI,
  validateEmail,
  validatePhoneRO,
} from "@/lib/utils/validation";

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputErrCls =
  "w-full rounded-xl border-2 border-red-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none";
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

interface PersonFormProps {
  value: PersonRequest;
  onChange: (person: PersonRequest) => void;
  title?: string;
  showDriverLicence?: boolean;
  /** Hide the ID document fields (type, series, number) */
  hideIdDocument?: boolean;
  /** When provided, shows a "Copy address" button in the address section */
  onCopyAddress?: () => void;
  /** Label for the copy address button */
  copyAddressLabel?: string;
}

export default function PersonForm({
  value,
  onChange,
  title,
  showDriverLicence = false,
  hideIdDocument = false,
  onCopyAddress,
  copyAddressLabel = "Copiaza adresa",
}: PersonFormProps) {
  const [companyTypes, setCompanyTypes] = useState<
    { id: number; type: string }[]
  >([]);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyTypesError, setCompanyTypesError] = useState<string | null>(null);
  const [cuiLookupError, setCuiLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (value.legalType === "PJ") {
      setCompanyTypesError(null);
      api
        .get<{ id: number; type: string }[]>("/online/companytypes")
        .then(setCompanyTypes)
        .catch(() => setCompanyTypesError("Nu am putut incarca tipurile de firma"));
    }
  }, [value.legalType]);

  const cifAsString = String(value.cif || "");
  const cnpInvalid =
    value.legalType === "PF" &&
    cifAsString.length > 0 &&
    !validateCNP(cifAsString);
  const cuiInvalid =
    value.legalType === "PJ" &&
    cifAsString.length > 0 &&
    !validateCUI(cifAsString);
  const emailInvalid = value.email.length > 0 && !validateEmail(value.email);
  const phoneInvalid =
    value.phoneNumber.length > 0 && !validatePhoneRO(value.phoneNumber);

  const toggleLegalType = (type: LegalType) => {
    if (type === "PF") {
      onChange(emptyPersonPF());
    } else {
      onChange(emptyPersonPJ());
    }
  };

  const updatePF = (partial: Partial<PersonRequestPF>) => {
    if (value.legalType === "PF") {
      onChange({ ...value, ...partial });
    }
  };

  const updatePJ = (partial: Partial<PersonRequestPJ>) => {
    if (value.legalType === "PJ") {
      onChange({ ...value, ...partial });
    }
  };

  // Lookup company by CUI
  const lookupCUI = async () => {
    if (value.legalType !== "PJ" || !value.cif) return;
    setLoadingCompany(true);
    setCuiLookupError(null);
    try {
      const data = await api.get<Record<string, unknown>>(
        `/online/companies/utils/${value.cif}`
      );

      // API returns `name`, not `companyName`
      const updates: Partial<PersonRequestPJ> = {
        companyName: (data.name as string) || value.companyName,
        registrationNumber: (data.registrationNumber as string) || value.registrationNumber,
        caenCode: (data.caenCode as string) || value.caenCode,
      };

      // Map phone if available and not already set
      if (data.phone && !value.phoneNumber) {
        updates.phoneNumber = data.phone as string;
      }

      // Map addressResponse (nested objects) → AddressRequest (flat IDs)
      const addrResp = data.addressResponse as Record<string, unknown> | null;
      if (addrResp) {
        const country = addrResp.countryResponse as Record<string, unknown> | null;
        const county = addrResp.countyResponse as Record<string, unknown> | null;
        const city = addrResp.cityResponse as Record<string, unknown> | null;
        const streetType = addrResp.streetTypeResponse as Record<string, unknown> | null;
        const floor = addrResp.floorResponse as Record<string, unknown> | null;
        updates.address = {
          addressType: (addrResp.addressType as "HOME" | "MAILING") || "HOME",
          countryId: country ? (country.id as number) : null,
          countyId: county ? (county.id as number) : null,
          cityId: city ? (city.id as number) : null,
          postalCode: (addrResp.postalCode as string) ?? "",
          streetTypeId: streetType ? (streetType.id as number) : null,
          floorId: floor ? (floor.id as number) : null,
          streetName: (addrResp.streetName as string) ?? "",
          streetNumber: (addrResp.streetNumber as string) ?? "",
          building: (addrResp.building as string) ?? "",
          entrance: (addrResp.entrance as string) ?? "",
          apartment: (addrResp.apartment as string) ?? "",
          foreignCountyName: (addrResp.foreignCountyName as string | null) ?? null,
          foreignCityName: (addrResp.foreignCityName as string | null) ?? null,
        };
      }

      updatePJ(updates);
    } catch {
      setCuiLookupError("CUI negasit sau date indisponibile. Completati manual.");
    } finally {
      setLoadingCompany(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header with icon */}
      {title && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <svg className="h-4.5 w-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}

      {/* Legal type toggle */}
      <div className="mb-4 flex gap-2">
        {(["PF", "PJ"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleLegalType(type)}
            className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all duration-200 ${
              value.legalType === type
                ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
            }`}
          >
            {value.legalType === type && (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {type === "PF" ? "Persoana Fizica" : "Persoana Juridica"}
          </button>
        ))}
      </div>

      {value.legalType === "PF" ? (
        <div className="space-y-3">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nume</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Ex: Popescu"
                value={value.lastName}
                onChange={(e) => updatePF({ lastName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Prenume</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Ex: Ion"
                value={value.firstName}
                onChange={(e) => updatePF({ firstName: e.target.value })}
              />
            </div>
          </div>

          {/* CNP */}
          <div>
            <label className={labelCls}>CNP</label>
            <input
              type="text"
              className={cnpInvalid ? inputErrCls : inputCls}
              placeholder="Cod numeric personal (13 cifre)"
              value={value.cif || ""}
              onChange={(e) =>
                updatePF({ cif: Number(e.target.value) || 0 })
              }
              maxLength={13}
            />
            {cnpInvalid && (
              <p className="mt-1 text-xs text-red-500">CNP invalid</p>
            )}
          </div>

          {/* ID document */}
          {!hideIdDocument && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tip document</label>
                <select
                  className={selectCls}
                  value={value.idType}
                  onChange={(e) =>
                    updatePF({
                      idType: e.target.value as PersonRequestPF["idType"],
                    })
                  }
                >
                  <option value="CI">Carte de Identitate</option>
                  <option value="PASSPORT">Pasaport</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Serie</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Ex: RD"
                  value={value.idSerial}
                  onChange={(e) => updatePF({ idSerial: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Numar</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Ex: 123456"
                  value={value.idNumber}
                  onChange={(e) => updatePF({ idNumber: e.target.value })}
                />
              </div>
            </div>
          )}

          {showDriverLicence && (
            <div>
              <label className={labelCls}>Data obtinere permis conducere</label>
              <input
                type="date"
                className={selectCls}
                value={value.driverLicenceDate ?? ""}
                onChange={(e) =>
                  updatePF({
                    driverLicenceDate: e.target.value || null,
                  })
                }
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* CUI + lookup */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>CUI</label>
              <input
                type="text"
                className={cuiInvalid ? inputErrCls : inputCls}
                placeholder="Cod unic de inregistrare"
                value={value.cif || ""}
                onChange={(e) => {
                  setCuiLookupError(null);
                  updatePJ({ cif: Number(e.target.value) || 0 });
                }}
              />
                  {cuiInvalid && (
                <p className="mt-1 text-xs text-red-500">CUI invalid</p>
              )}
            </div>
            <button
              type="button"
              onClick={lookupCUI}
              disabled={loadingCompany}
              className="mt-5 flex h-10 items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              {loadingCompany ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
              Cauta
            </button>
          </div>
          {cuiLookupError && (
            <p className="text-xs text-amber-600">{cuiLookupError}</p>
          )}

          <div>
            <label className={labelCls}>Denumire firma</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Denumirea companiei"
              value={value.companyName}
              onChange={(e) => updatePJ({ companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nr. Inregistrare (Reg. Com.)</label>
              <input
                type="text"
                className={inputCls}
                placeholder="J40/1234/2020"
                value={value.registrationNumber}
                onChange={(e) =>
                  updatePJ({ registrationNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Tip firma</label>
              <select
                className={selectCls}
                value={value.companyTypeId ?? ""}
                onChange={(e) =>
                  updatePJ({
                    companyTypeId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">Selecteaza</option>
                {companyTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {companyTypesError && (
            <p className="text-xs text-amber-600">{companyTypesError}</p>
          )}
        </div>
      )}

      {/* Contact info (shared) — separator line */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span className="text-xs font-medium text-gray-500">Date de contact</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              className={emailInvalid ? inputErrCls : inputCls}
              placeholder="exemplu@email.com"
              value={value.email}
              onChange={(e) => {
                if (value.legalType === "PF") updatePF({ email: e.target.value });
                else updatePJ({ email: e.target.value });
              }}
            />
            {emailInvalid && (
              <p className="mt-1 text-xs text-red-500">Email invalid</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Telefon</label>
            <input
              type="tel"
              className={phoneInvalid ? inputErrCls : inputCls}
              placeholder="07xx xxx xxx"
              value={value.phoneNumber}
              onChange={(e) => {
                if (value.legalType === "PF")
                  updatePF({ phoneNumber: e.target.value });
                else updatePJ({ phoneNumber: e.target.value });
              }}
            />
            {phoneInvalid && (
              <p className="mt-1 text-xs text-red-500">Numar de telefon invalid</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-xs font-medium text-gray-500">Adresa</span>
          </div>
          {onCopyAddress && (
            <button
              type="button"
              onClick={onCopyAddress}
              className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/40 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              {copyAddressLabel}
            </button>
          )}
        </div>
        <AddressForm
          value={value.address}
          onChange={(address) => {
            if (value.legalType === "PF") updatePF({ address });
            else updatePJ({ address });
          }}
        />
      </div>
    </div>
  );
}

export function emptyPersonPF(): PersonRequestPF {
  return {
    legalType: "PF",
    firstName: "",
    lastName: "",
    idType: "CI",
    idSerial: "",
    idNumber: "",
    idExpirationDate: null,
    driverLicenceDate: null,
    email: "",
    phoneNumber: "",
    address: emptyAddress(),
    cif: 0,
  };
}

export function emptyPersonPJ(): PersonRequestPJ {
  return {
    legalType: "PJ",
    companyName: "",
    registrationNumber: "",
    caenCode: null,
    companyTypeId: null,
    email: "",
    phoneNumber: "",
    address: emptyAddress(),
    cif: 0,
  };
}
