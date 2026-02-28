"use client";

import { validateCNP } from "@/lib/utils/validation";
import { isAdditionalDriverValid } from "@/lib/utils/formGuards";
import type { AdditionalDriver } from "@/types/rcaFlow";
import { emptyAdditionalDriver } from "@/lib/utils/rcaHelpers";
import { btn } from "@/lib/ui/tokens";
import DateInput from "@/components/shared/DateInput";

interface AdditionalDriverFormProps {
  hasDriver: boolean;
  driver: AdditionalDriver | null;
  onToggle: (has: boolean) => void;
  onDriverChange: (driver: AdditionalDriver) => void;
  onContinue: () => void;
}

export default function AdditionalDriverForm({
  hasDriver,
  driver,
  onToggle,
  onDriverChange,
  onContinue,
}: AdditionalDriverFormProps) {
  const d = driver ?? emptyAdditionalDriver();
  const cnpInvalid = d.cnp.length > 0 && !validateCNP(d.cnp);
  const isValid = !hasDriver || isAdditionalDriverValid(d);

  const updateField = (field: keyof AdditionalDriver, value: string) => {
    onDriverChange({ ...d, [field]: value });
  };

  const inputCls = "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Adăugați un șofer adițional?
        </h2>
      </div>

      {/* NU / DA toggle cards */}
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`flex items-center gap-3 rounded-lg border-2 px-5 py-4 text-left text-base font-bold transition-all ${
            !hasDriver
              ? "border-[#2563EB] bg-white shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
              !hasDriver ? "bg-[#2563EB] text-white" : "border-2 border-gray-300"
            }`}
          >
            {!hasDriver && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          NU
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`flex items-center gap-3 rounded-lg border-2 px-5 py-4 text-left text-base font-bold transition-all ${
            hasDriver
              ? "border-[#2563EB] bg-white shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
              hasDriver ? "bg-[#2563EB] text-white" : "border-2 border-gray-300"
            }`}
          >
            {hasDriver && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          DA
        </button>
      </div>

      {/* Driver fields (shown when DA selected) */}
      {hasDriver && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className={inputCls}
              value={d.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="NUME SOFER"
            />
            <input
              type="text"
              className={inputCls}
              value={d.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="PRENUME SOFER"
            />
          </div>

          <input
            type="text"
            className={inputCls}
            value={d.cnp}
            onChange={(e) => updateField("cnp", e.target.value.replace(/\D/g, ""))}
            maxLength={13}
            placeholder="CNP SOFER"
          />
          {cnpInvalid && <p className="mt-1 text-xs text-red-600">CNP-ul introdus nu este valid</p>}

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className={`${inputCls} uppercase`}
              value={d.idSeries}
              onChange={(e) => updateField("idSeries", e.target.value.toUpperCase())}
              placeholder="SERIE CI"
            />
            <input
              type="text"
              className={inputCls}
              value={d.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              placeholder="NUMAR CI"
            />
          </div>

          <div className="text-left">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Data obținere permis de conducere
            </label>
            <DateInput
              value={d.driverLicenceDate}
              onChange={(v) => updateField("driverLicenceDate", v)}
            />
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onContinue}
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
