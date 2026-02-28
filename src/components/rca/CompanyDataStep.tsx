"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { btn } from "@/lib/ui/tokens";

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

  const inputCls = "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-gray-500";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Title */}
      <div className="text-center">
        {companyFound ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900">Firma a fost identificată</h2>
            <p className="mt-1 text-sm text-gray-500">Verificați datele de mai jos.</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900">Firma nu a fost găsită</h2>
            <p className="mt-1 text-sm text-gray-500">Vă rugăm să completați datele manual.</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        {/* Company name */}
        <div>
          <label className={labelCls}>Nume firmă</label>
          <input
            type="text"
            className={inputCls}
            value={companyName}
            onChange={(e) => onFieldChange("companyName", e.target.value)}
            placeholder="Denumirea firmei"
          />
        </div>

        {/* Registration number */}
        <div>
          <label className={labelCls}>Nr. înregistrare (Reg. Com.)</label>
          <input
            type="text"
            className={inputCls}
            value={registrationNumber}
            onChange={(e) => onFieldChange("registrationNumber", e.target.value)}
            placeholder="Nr. înregistrare"
          />
        </div>

        {/* CAEN dropdown with search */}
        <div className="relative">
          <label className={labelCls}>Cod CAEN</label>
          {caenCode ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                {caenCode}
              </span>
              <button
                type="button"
                onClick={() => { onCaenChange(null); setCaenFilter(""); }}
                className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Schimbă
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                className={inputCls}
                value={caenFilter}
                onChange={(e) => setCaenFilter(e.target.value)}
                placeholder="Introdu primele cifre (ex: 62, 6202)"
              />
              {filteredCaen.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {filteredCaen.map((code) => (
                    <li key={code}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-[#2563EB]/5 transition-colors"
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
      </div>

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
