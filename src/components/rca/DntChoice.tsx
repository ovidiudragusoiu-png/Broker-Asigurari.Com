"use client";

import { useState } from "react";
import { btn } from "@/lib/ui/tokens";

interface DntChoiceProps {
  onContinueDirect: () => void;
  productLabel?: string;
  onBack?: () => void;
  backLabel?: string;
}

const CONSULTATION_EMAIL = "bucuresti@broker-asigurari.com";

export default function DntChoice({ onContinueDirect, productLabel = "RCA", onBack, backLabel = "Inapoi la datele calatorilor" }: DntChoiceProps) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Aproape gata!</h2>
        <p className="mt-1 text-sm text-gray-500">
          Mai ai puțin până la ofertele {productLabel}
        </p>
      </div>

      {/* Two cards side by side */}
      <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
        {/* Card 1: Continue direct */}
        <button
          type="button"
          onClick={onContinueDirect}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-[#2563EB]/20 bg-[#2563EB]/5/50 p-6 text-center transition-all hover:border-[#2563EB]/60 hover:shadow-md"
        >
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] transition-colors group-hover:bg-[#2563EB]/20">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Continuă direct</h3>
            <p className="mt-1 text-sm text-gray-500">
              Primești ofertele instant și alegi cea mai bună variantă
            </p>
          </div>
          <span className={`${btn.primary} mt-auto`}>
            Vezi oferte
          </span>
        </button>

        {/* Card 2: DNT consultation */}
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-gray-300 hover:shadow-md"
        >
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover:bg-gray-200">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Vreau consultanță</h3>
            <p className="mt-1 text-sm text-gray-500">
              Un consultant te va contacta pentru o analiză personalizată
            </p>
          </div>
          <span className={`${btn.secondary} mt-auto`}>
            Solicită consultant
          </span>
        </button>
      </div>

      {/* Back button */}
      {onBack && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors duration-200 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {backLabel}
          </button>
        </div>
      )}

      {/* DNT consultation popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Consultanță specializată
              </h3>
            </div>
            <p className="text-sm text-gray-700">
              Pentru consultanță personalizată în domeniul asigurărilor, contactează-ne la:
            </p>
            <a
              href={`mailto:${CONSULTATION_EMAIL}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#2563EB]/5 px-4 py-3 text-base font-semibold text-blue-700 transition-colors hover:bg-[#2563EB]/10"
            >
              {CONSULTATION_EMAIL}
            </a>
            <p className="mt-3 text-xs text-gray-400">
              Un consultant te va contacta în cel mai scurt timp.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className={`flex-1 ${btn.secondary}`}
              >
                Închide
              </button>
              <a
                href={`mailto:${CONSULTATION_EMAIL}`}
                className={`flex-1 text-center ${btn.primary}`}
              >
                Trimite email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
