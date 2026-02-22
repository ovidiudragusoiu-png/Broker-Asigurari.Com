"use client";

import { useState } from "react";
import { validateCNP, validateCUI, validateEmail } from "@/lib/utils/validation";
import type { OwnerType } from "@/types/rcaFlow";

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
        <h2 className="text-2xl font-bold text-gray-900">Identificare proprietar</h2>
      </div>

      {/* PF/PJ toggle */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => onOwnerTypeChange("PF")}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            ownerType === "PF"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Persoana Fizica
        </button>
        <button
          type="button"
          onClick={() => onOwnerTypeChange("PJ")}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            ownerType === "PJ"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Persoana Juridica
        </button>
      </div>

      {/* CNP / CUI */}
      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {ownerType === "PF" ? "CNP (Cod Numeric Personal)" : "CUI (Cod Unic de Identificare)"}
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          value={cnpOrCui}
          onChange={(e) => onCnpChange(e.target.value.replace(/\D/g, ""))}
          maxLength={ownerType === "PF" ? 13 : 10}
          placeholder={ownerType === "PF" ? "Introdu CNP-ul" : "Introdu CUI-ul"}
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
          Adresa de email
        </label>
        <input
          type="email"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
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
          Apasand <strong>Continua</strong>, sunteti de acord cu prelucrarea datelor personale
          conform legislatiei europene GDPR si a legilor asigurarilor.{" "}
          <button
            type="button"
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="font-semibold text-blue-600 underline hover:text-blue-800"
          >
            detalii aici
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
                In conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastra personale
                sunt prelucrate in scopul ofertarii si emiterii politelor de asigurare RCA.
              </p>
              <p>
                Datele colectate (CNP/CUI, email, date vehicul) sunt transmise catre societatile
                de asigurare partenere exclusiv in scopul generarii ofertelor si emiterii politei selectate.
              </p>
              <p>
                Aveti dreptul de acces, rectificare, stergere si portabilitate a datelor, precum si
                dreptul de a va opune prelucrarii. Pentru exercitarea acestor drepturi, ne puteti
                contacta la adresa de email indicata pe site.
              </p>
              <p>
                Datele sunt stocate pe durata necesara indeplinirii scopului prelucrarii si conform
                cerintelor legale aplicabile in domeniul asigurarilor.
              </p>
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowPrivacy(false)}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Am inteles
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
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continua
        </button>
      </div>
    </div>
  );
}
