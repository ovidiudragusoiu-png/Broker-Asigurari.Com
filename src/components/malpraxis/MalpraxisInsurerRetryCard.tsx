"use client";

import type { MalpraxisInsurerAdjustableField, MalpraxisInsurerOverride } from "@/lib/flows/malpraxisInsurerRetry";
import { btn } from "@/lib/ui/tokens";

interface CodeName {
  code: string;
  name: string;
}

interface MalpraxisInsurerRetryCardProps {
  productName: string;
  vendorName: string;
  vendorLogo?: string;
  hintMessage: string;
  adjustableFields: MalpraxisInsurerAdjustableField[];
  override: MalpraxisInsurerOverride;
  moralOptions: CodeName[];
  retroactiveOptions: CodeName[];
  retrying?: boolean;
  onOverrideChange: (next: MalpraxisInsurerOverride) => void;
  onRetry: () => void;
}

const selectCls =
  "w-full appearance-none rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30";

export default function MalpraxisInsurerRetryCard({
  productName,
  vendorName,
  vendorLogo,
  hintMessage,
  adjustableFields,
  override,
  moralOptions,
  retroactiveOptions,
  retrying = false,
  onOverrideChange,
  onRetry,
}: MalpraxisInsurerRetryCardProps) {
  const showRetro = adjustableFields.includes("retroactive");
  const showPercent = adjustableFields.includes("moralPercent");
  const showCustom = adjustableFields.includes("moralCustom");

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
      <div className="flex items-center gap-3">
        {vendorLogo ? (
          <img src={vendorLogo} alt={vendorName} className="h-9 w-9 rounded object-contain" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-400">
            {(vendorName || "?").charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-gray-900">{productName}</h4>
          <p className="text-xs text-gray-500">{vendorName}</p>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-amber-900">{hintMessage}</p>

      <p className="mt-3 text-xs font-medium text-gray-700">
        Setări doar pentru acest asigurător (nu modifică celelalte oferte)
      </p>

      <div className="mt-2 space-y-2">
        {showRetro && (
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">Perioada retroactivă</label>
            <select
              className={selectCls}
              value={override.retroactivePeriod}
              onChange={(e) =>
                onOverrideChange({ ...override, retroactivePeriod: e.target.value })
              }
            >
              {retroactiveOptions.map((option, index) => (
                <option key={option.code || `retro-${index}`} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPercent && (
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">Limita daune morale (%)</label>
            <select
              className={selectCls}
              value={override.moralDamagesLimit}
              onChange={(e) => {
                const moralDamagesLimit = e.target.value;
                onOverrideChange({
                  ...override,
                  moralDamagesLimit,
                  customMoralDamagesLimit:
                    moralDamagesLimit && moralDamagesLimit !== "0"
                      ? ""
                      : override.customMoralDamagesLimit,
                });
              }}
            >
              {moralOptions.map((option, index) => (
                <option key={option.code || `moral-${index}`} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showCustom && (
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">
              Limita personalizată (sumă fixă EUR)
            </label>
            <input
              type="text"
              className={inputCls}
              value={override.customMoralDamagesLimit}
              onChange={(e) => {
                const customMoralDamagesLimit = e.target.value;
                onOverrideChange({
                  ...override,
                  customMoralDamagesLimit,
                  moralDamagesLimit: customMoralDamagesLimit.trim() ? "0" : override.moralDamagesLimit,
                });
              }}
              placeholder="ex. 5000"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className={`${btn.primary} mt-3 w-full py-2 text-sm disabled:opacity-60`}
      >
        {retrying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Se generează oferta…
          </span>
        ) : (
          `Obține ofertă ${vendorName || ""}`.trim()
        )}
      </button>
    </div>
  );
}
