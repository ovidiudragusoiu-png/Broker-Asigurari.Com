"use client";

import { useState } from "react";
import { validateLicensePlate } from "@/lib/utils/validation";

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
          Introdu numarul de inmatriculare
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Nu se fac polite in vederea inmatricularii.
        </p>
      </div>

      <div className="mx-auto max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Numar inmatriculare
        </label>
        <input
          type="text"
          className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-lg font-bold uppercase tracking-widest focus:border-blue-500 focus:outline-none"
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
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={!isValid}
        >
          Continua
        </button>
      </div>
    </div>
  );
}
