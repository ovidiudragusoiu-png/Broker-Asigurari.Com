"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { btn, inputClass as inputToken } from "@/lib/ui/tokens";

interface CompanyDataStepProps {
  companyName: string;
  registrationNumber: string;
  caenCode: string | null;
  companyFound: boolean;
  onFieldChange: (field: string, value: string) => void;
  onCaenChange: (code: string | null) => void;
  onContinue: () => void;
}

export default function CompanyDataStep({
  companyName,
  registrationNumber,
  caenCode,
  companyFound,
  onFieldChange,
  onCaenChange,
  onContinue,
}: CompanyDataStepProps) {
  const [caenCodes, setCaenCodes] = useState<string[]>([]);
  const [caenFilter, setCaenFilter] = useState("");

  useEffect(() => {
    api.get<string[]>("/online/caencodes")
      .then((data) => setCaenCodes(data.filter((c) => typeof c === "string" && c.length > 0)))
      .catch(() => {});
  }, []);

  const filteredCaen = caenFilter.length >= 2
    ? caenCodes.filter((c) => c.startsWith(caenFilter)).slice(0, 20)
    : [];

  const isValid = companyName.trim().length > 0 && registrationNumber.trim().length > 0;

  const inputClass = inputToken;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Title */}
      <div className="text-center">
        {companyFound ? (
          <h2 className="text-2xl font-bold text-gray-900">
            Firma a fost identificată. Verificați datele:
          </h2>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900">
              Firma nu a fost găsită în baza de date.
            </h2>
            <p className="mt-1 text-sm text-gray-500">Vă rugăm să completați datele manual.</p>
          </>
        )}
      </div>

      {/* Company name */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Nume firmă
        </label>
        <input
          type="text"
          className={inputClass}
          value={companyName}
          onChange={(e) => onFieldChange("companyName", e.target.value)}
          placeholder="NUME FIRMA"
        />
      </div>

      {/* Registration number */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Nr. înregistrare (Reg. Com.)
        </label>
        <input
          type="text"
          className={inputClass}
          value={registrationNumber}
          onChange={(e) => onFieldChange("registrationNumber", e.target.value)}
          placeholder="NR. INREGISTRARE (REG. COM.)"
        />
      </div>

      {/* CAEN dropdown with search */}
      <div className="relative">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cod CAEN
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
                      className="w-full px-4 py-2 text-left text-sm hover:bg-sky-50"
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

      {/* Continue button */}
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
