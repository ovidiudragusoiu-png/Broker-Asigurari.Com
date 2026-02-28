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

      {/* PF/PJ toggle */}
      <div className="mx-auto flex max-w-xs gap-2">
        {(["PF", "PJ"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onOwnerTypeChange(type)}
            className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              ownerType === type
                ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
            }`}
          >
            {type === "PF" ? "Persoană fizică" : "Persoană juridică"}
          </button>
        ))}
      </div>

      {/* CNP / CUI */}
      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          {ownerType === "PF" ? "CNP (Cod numeric personal)" : "CUI (Cod unic de identificare)"}
        </label>
        <input
          type="text"
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
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
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Adresă de email
        </label>
        <input
          type="email"
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
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
            className="font-semibold text-[#2563EB] underline hover:text-blue-700"
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
                className="rounded-lg bg-[#2563EB] px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors duration-200"
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
          className={`${btn.primary} px-8`}
        >
          <span className="flex items-center gap-2">
            Continuă
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
