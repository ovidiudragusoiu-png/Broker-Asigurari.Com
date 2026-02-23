"use client";

import { useState } from "react";
import { validateCNP, validateCUI, validateEmail } from "@/lib/utils/validation";
import type { OwnerType } from "@/types/rcaFlow";
import { btn } from "@/lib/ui/tokens";

interface OwnerIdentificationProps {
  ownerType: OwnerType;
  cnpOrCui: string;
  email: string;
  onOwnerTypeChange: (type: OwnerType) => void;
  onCnpChange: (value: string) => void;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
}

export default function OwnerIdentification({
  ownerType,
  cnpOrCui,
  email,
  onOwnerTypeChange,
  onCnpChange,
  onEmailChange,
  onContinue,
}: OwnerIdentificationProps) {
  const [touched, setTouched] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const cnpValid = ownerType === "PF" ? validateCNP(cnpOrCui) : validateCUI(cnpOrCui);
  const emailValid = validateEmail(email);
  const isValid = cnpValid && emailValid;

  const handleSubmit = () => {
    setTouched(true);
    if (isValid) {
      onContinue();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Identificarea proprietarului</h2>
      </div>

      {/* PF/PJ segmented control */}
      <div className="mx-auto flex max-w-xs rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => onOwnerTypeChange("PF")}
          className={`flex-1 rounded-md px-6 py-2.5 text-sm font-semibold transition-all ${
            ownerType === "PF"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Persoană fizică
        </button>
        <button
          type="button"
          onClick={() => onOwnerTypeChange("PJ")}
          className={`flex-1 rounded-md px-6 py-2.5 text-sm font-semibold transition-all ${
            ownerType === "PJ"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Persoană juridică
        </button>
      </div>

      {/* CNP / CUI */}
      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {ownerType === "PF" ? "CNP (Cod numeric personal)" : "CUI (Cod unic de identificare)"}
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-colors duration-200"
          value={cnpOrCui}
          onChange={(e) => onCnpChange(e.target.value.replace(/\D/g, ""))}
          maxLength={ownerType === "PF" ? 13 : 10}
          placeholder={ownerType === "PF" ? "Introduceți CNP-ul" : "Introduceți CUI-ul"}
        />
        {touched && cnpOrCui.length > 0 && !cnpValid && (
          <p className="mt-1 text-xs text-red-600">
            {ownerType === "PF" ? "CNP invalid" : "CUI invalid"}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Adresă de email
        </label>
        <input
          type="email"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-colors duration-200"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="email@exemplu.ro"
        />
        {touched && email.length > 0 && !emailValid && (
          <p className="mt-1 text-xs text-red-600">Email invalid</p>
        )}
      </div>

      {/* GDPR notice */}
      <div className="mx-auto max-w-md rounded-lg bg-gray-50 p-4 text-center text-xs text-gray-600">
        <p>
          Apăsând <strong>Continuă</strong>, sunteți de acord cu prelucrarea datelor personale
          conform legislației europene GDPR și a legilor asigurărilor.{" "}
          <button
            type="button"
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="font-semibold text-sky-600 underline hover:text-sky-700"
          >
            Detalii
          </button>
        </p>
      </div>

      {/* Privacy policy modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-gray-900">
              Politica de prelucrare a datelor cu caracter personal
            </h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                În conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastră personale
                sunt prelucrate în scopul ofertării și emiterii polițelor de asigurare RCA.
              </p>
              <p>
                Datele colectate (CNP/CUI, email, date vehicul) sunt transmise către societățile
                de asigurare partenere exclusiv în scopul generării ofertelor și emiterii poliței selectate.
              </p>
              <p>
                Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor, precum și
                dreptul de a vă opune prelucrării. Pentru exercitarea acestor drepturi, ne puteți
                contacta la adresa de email indicată pe site.
              </p>
              <p>
                Datele sunt stocate pe durata necesară îndeplinirii scopului prelucrării și conform
                cerințelor legale aplicabile în domeniul asigurărilor.
              </p>
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowPrivacy(false)}
                className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors duration-200"
              >
                Am înțeles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid}
          className={btn.primary}
        >
          Continuă
        </button>
      </div>
    </div>
  );
}
