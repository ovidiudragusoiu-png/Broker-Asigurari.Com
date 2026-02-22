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

interface PersonFormProps {
  value: PersonRequest;
  onChange: (person: PersonRequest) => void;
  title?: string;
  showDriverLicence?: boolean;
}

export default function PersonForm({
  value,
  onChange,
  title,
  showDriverLicence = false,
}: PersonFormProps) {
  const [companyTypes, setCompanyTypes] = useState<
    { id: number; type: string }[]
  >([]);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyTypesError, setCompanyTypesError] = useState<string | null>(null);

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
    try {
      const data = await api.get<Record<string, unknown>>(
        `/online/companies/utils/${value.cif}`
      );
      updatePJ({
        companyName: (data.companyName as string) || value.companyName,
        registrationNumber:
          (data.registrationNumber as string) || value.registrationNumber,
        caenCode: (data.caenCode as string) || value.caenCode,
        companyTypeId: (data.companyTypeId as number) || value.companyTypeId,
      });
    } catch {
      // CUI not found - user fills manually
    } finally {
      setLoadingCompany(false);
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}

      {/* Legal type toggle */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => toggleLegalType("PF")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            value.legalType === "PF"
              ? "bg-blue-700 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Persoana Fizica
        </button>
        <button
          type="button"
          onClick={() => toggleLegalType("PJ")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            value.legalType === "PJ"
              ? "bg-blue-700 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Persoana Juridica
        </button>
      </div>

      {value.legalType === "PF" ? (
        <>
          {/* PF fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nume
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.lastName}
                onChange={(e) => updatePF({ lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Prenume
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.firstName}
                onChange={(e) => updatePF({ firstName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              CNP
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.cif || ""}
              onChange={(e) =>
                updatePF({ cif: Number(e.target.value) || 0 })
              }
              maxLength={13}
            />
            {cnpInvalid && (
              <p className="mt-1 text-xs text-red-600">CNP invalid</p>
            )}
          </div>

          {/* ID document */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tip document
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Serie
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.idSerial}
                onChange={(e) => updatePF({ idSerial: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Numar
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.idNumber}
                onChange={(e) => updatePF({ idNumber: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Data expirare document
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.idExpirationDate ?? ""}
              onChange={(e) =>
                updatePF({
                  idExpirationDate: e.target.value || null,
                })
              }
            />
          </div>

          {showDriverLicence && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data obtinere permis conducere
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.driverLicenceDate ?? ""}
                onChange={(e) =>
                  updatePF({
                    driverLicenceDate: e.target.value || null,
                  })
                }
              />
            </div>
          )}
        </>
      ) : (
        <>
          {/* PJ fields */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CUI
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.cif || ""}
                onChange={(e) =>
                  updatePJ({ cif: Number(e.target.value) || 0 })
                }
              />
              {cuiInvalid && (
                <p className="mt-1 text-xs text-red-600">CUI invalid</p>
              )}
            </div>
            <button
              type="button"
              onClick={lookupCUI}
              disabled={loadingCompany}
              className="mt-6 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {loadingCompany ? "..." : "Cauta"}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Denumire firma
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.companyName}
              onChange={(e) => updatePJ({ companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nr. Inregistrare (Reg. Com.)
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={value.registrationNumber}
                onChange={(e) =>
                  updatePJ({ registrationNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tip firma
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
            <p className="text-xs text-yellow-700">{companyTypesError}</p>
          )}
        </>
      )}

      {/* Contact info (shared) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.email}
            onChange={(e) => {
              if (value.legalType === "PF") updatePF({ email: e.target.value });
              else updatePJ({ email: e.target.value });
            }}
          />
          {emailInvalid && (
            <p className="mt-1 text-xs text-red-600">Email invalid</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Telefon
          </label>
          <input
            type="tel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.phoneNumber}
            onChange={(e) => {
              if (value.legalType === "PF")
                updatePF({ phoneNumber: e.target.value });
              else updatePJ({ phoneNumber: e.target.value });
            }}
          />
          {phoneInvalid && (
            <p className="mt-1 text-xs text-red-600">Numar de telefon invalid</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="rounded-md border border-gray-200 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">Adresa</h4>
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
