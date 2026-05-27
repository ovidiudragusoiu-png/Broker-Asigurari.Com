"use client";

import { useState } from "react";
import ConsultancyModal from "@/components/rca/ConsultancyModal";
import { btn } from "@/lib/ui/tokens";

interface RcaPreOffersDntStepProps {
  onComplete: () => void;
}

const CHECKBOX_ITEMS = [
  "Sunt proprietarul vehiculului",
  "Doresc oferte de la toți asiguratorii",
  "Utilizez auto doar în scop personal",
  "Nu doresc altă poliță decât RCA",
] as const;

const checkboxClass =
  "h-5 w-5 rounded border-gray-300 accent-[#2563EB] focus:ring-[#2563EB]";
const checkboxStyle = { accentColor: "#2563EB" } as const;

export default function RcaPreOffersDntStep({ onComplete }: RcaPreOffersDntStepProps) {
  const [showConsultancy, setShowConsultancy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKBOX_ITEMS.map(() => true));
  const [nonUeChoice, setNonUeChoice] = useState<"DA" | "NU" | null>(null);

  const allRequiredChecked = checked.every(Boolean);
  const canContinue = allRequiredChecked && nonUeChoice !== null;

  const toggleCheckbox = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleContinue = () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    onComplete();
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-[26px]">
            Ofertele sunt GATA!
          </h2>
          <p className="mt-2 text-3xl leading-none" aria-hidden="true">
            🚗
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Informații necesare DNT și consultanță norma 22/2021
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {CHECKBOX_ITEMS.map((label, index) => (
            <label
              key={label}
              className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-gray-800"
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => toggleCheckbox(index)}
                className={checkboxClass}
                style={checkboxStyle}
              />
              <span>{label}</span>
            </label>
          ))}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-800">
            <span className="font-normal">
              Mergeți cu auto în țări NON-UE
            </span>
            <div className="flex flex-wrap items-center gap-4">
              {(["DA", "NU"] as const).map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={nonUeChoice === option}
                    onChange={() => setNonUeChoice(option)}
                    className={checkboxClass}
                    style={checkboxStyle}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="pt-2 text-center text-xs text-gray-500">
            Apăsând pe ÎNAINTE confirmați opțiunile selectate mai sus.
          </p>
          <p className="text-center text-sm text-gray-700">
            Dacă doriți consultanță suplimentară{" "}
            <button
              type="button"
              onClick={() => setShowConsultancy(true)}
              className="font-medium text-[#2563EB] underline hover:text-[#1d4ed8]"
            >
              click aici
            </button>
          </p>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || submitting}
              className={`${btn.primary} w-full max-w-sm uppercase tracking-wide`}
            >
              {submitting ? "Se continuă..." : "ÎNAINTE"}
            </button>
          </div>
        </div>
      </div>

      <ConsultancyModal
        isOpen={showConsultancy}
        onClose={() => setShowConsultancy(false)}
      />
    </div>
  );
}
