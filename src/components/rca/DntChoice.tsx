"use client";

import { useState } from "react";
import { btn } from "@/lib/ui/tokens";

interface DntChoiceProps {
  onContinueDirect: () => void;
  productLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  subtitle?: string;
  directTitle?: string;
  directDescription?: string;
  directButtonLabel?: string;
  waiverAccepted?: boolean;
  onWaiverAcceptedChange?: (accepted: boolean) => void;
}

const CONSULTATION_EMAIL = "office@sigur.ai";

/** Renunțare la consultanță — comercializare electronică (normă 22/2021). */
export const DNT_WAIVER_DECLARATION =
  "Declar ca optez pentru renunțarea la acordarea consultantei, conform prevederilor legale aplicabile comercializării electronice a produselor de asigurare";

export const DNT_WAIVER_NOTICE =
  "Atentie! Ca urmare a opțiunii tale de renunțare la consultanta, te informam ca nu vom evalua în ce măsură contractul de asigurare, pe care urmeaza sa-l inchei, corespunde cerintelor si necesitatilor tale. Te rugam sa completezi cu atentie datele si informatiile ce iti vor fi solicitate in vederea incheierii asigurării dorite.";

const checkboxClass =
  "mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-[#2563EB] focus:ring-[#2563EB]";
const checkboxStyle = { accentColor: "#2563EB" } as const;

export default function DntChoice({
  onContinueDirect,
  productLabel = "RCA",
  onBack,
  backLabel = "Inapoi",
  subtitle,
  directTitle,
  directDescription,
  directButtonLabel,
  waiverAccepted: waiverAcceptedProp,
  onWaiverAcceptedChange,
}: DntChoiceProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [internalWaiverAccepted, setInternalWaiverAccepted] = useState(false);
  const waiverAccepted = waiverAcceptedProp ?? internalWaiverAccepted;
  const setWaiverAccepted = (accepted: boolean) => {
    onWaiverAcceptedChange?.(accepted);
    if (waiverAcceptedProp === undefined) {
      setInternalWaiverAccepted(accepted);
    }
  };
  const [showWaiverHint, setShowWaiverHint] = useState(false);

  const handleContinueDirect = () => {
    if (!waiverAccepted) {
      setShowWaiverHint(true);
      return;
    }
    onContinueDirect();
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Aproape gata!</h2>
        <p className="mt-1 text-sm text-gray-500">
          {subtitle ?? `Mai ai puțin până la ofertele ${productLabel}`}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-5 px-1 sm:grid-cols-2 sm:items-stretch sm:gap-4 sm:px-0">
        {/* Card 1: Continue direct + renunțare consultanță */}
        <div className="flex flex-col gap-4 rounded-xl border-2 border-[#2563EB]/20 bg-[#2563EB]/[0.03] p-4 text-center sm:p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{directTitle ?? "Continuă direct"}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {directDescription ??
                  "Primești ofertele instant și alegi oferta care îți convine cel mai mult"}
              </p>
            </div>
          </div>

          <div className="w-full rounded-lg border border-gray-200 bg-white p-3.5 text-left shadow-sm sm:p-4">
            <label className="grid cursor-pointer grid-cols-[1.25rem_1fr] items-start gap-x-3 gap-y-3">
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={(e) => {
                  setWaiverAccepted(e.target.checked);
                  if (e.target.checked) setShowWaiverHint(false);
                }}
                className={`${checkboxClass} col-start-1 row-start-1`}
                style={checkboxStyle}
              />
              <span className="col-start-2 row-start-1 text-[13px] leading-relaxed text-gray-800 sm:text-sm">
                {DNT_WAIVER_DECLARATION}
              </span>
              <p className="col-span-2 col-start-1 row-start-2 text-[13px] leading-relaxed text-gray-500 sm:col-span-1 sm:col-start-2 sm:text-xs">
                {DNT_WAIVER_NOTICE}
              </p>
            </label>
          </div>

          {showWaiverHint && !waiverAccepted && (
            <p className="text-xs text-red-600">Bifați declarația pentru a continua.</p>
          )}

          <button
            type="button"
            onClick={handleContinueDirect}
            disabled={!waiverAccepted}
            className={`${btn.primary} mt-auto w-full`}
          >
            {directButtonLabel ?? "Vezi oferte"}
          </button>
        </div>

        {/* Card 2: DNT consultation */}
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-center transition-all hover:border-gray-300 hover:shadow-md sm:p-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover:bg-gray-200">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Vreau consultanță</h3>
            <p className="mt-1 text-sm text-gray-500">
              Un consultant te va contacta pentru o analiză personalizată
            </p>
          </div>
          <span className={`${btn.secondary} mt-auto`}>Solicită consultant</span>
        </button>
      </div>

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

      {showPopup && (
        <div className="z-layer-modal fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Consultanță specializată</h3>
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
            <p className="mt-3 text-xs text-gray-400">Un consultant te va contacta în cel mai scurt timp.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowPopup(false)} className={`flex-1 ${btn.secondary}`}>
                Închide
              </button>
              <a href={`mailto:${CONSULTATION_EMAIL}`} className={`flex-1 text-center ${btn.primary}`}>
                Trimite email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
