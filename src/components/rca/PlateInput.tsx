"use client";

import { useState } from "react";
import { validateLicensePlate } from "@/lib/utils/validation";
import { btn } from "@/lib/ui/tokens";

interface PlateInputProps {
  value: string;
  onChange: (plate: string) => void;
  onContinue: () => void;
}

export default function PlateInput({ value, onChange, onContinue }: PlateInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = validateLicensePlate(value);
  const showError = touched && value.length > 0 && !isValid;

  const handleSubmit = () => {
    setTouched(true);
    if (isValid) {
      onContinue();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Introduceți numărul de înmatriculare
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Nu se emit polițe în vederea înmatriculării.
        </p>
      </div>

      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Număr înmatriculare
        </label>
        <input
          type="text"
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 py-3 text-center text-lg font-bold uppercase tracking-widest text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase().replace(/[\s\-]/g, ""));
            if (!touched) setTouched(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="B123ABC"
          maxLength={8}
          autoFocus
        />
        {showError && (
          <p className="mt-1 text-center text-xs text-red-600">
            Format invalid. Exemple: B11XXX, B111XXX, IS11XXX
          </p>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSubmit}
          className={`${btn.primary} px-8`}
          disabled={!isValid}
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
