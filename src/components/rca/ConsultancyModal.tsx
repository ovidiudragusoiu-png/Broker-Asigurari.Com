"use client";

import { btn } from "@/lib/ui/tokens";

export const CONSULTATION_EMAIL = "office@sigur.ai";

interface ConsultancyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsultancyModal({ isOpen, onClose }: ConsultancyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="z-layer-modal-elevated fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultancy-modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="px-6 py-8 text-center">
          <p
            id="consultancy-modal-title"
            className="text-base leading-relaxed text-gray-700"
          >
            Dacă doriți consultanță
            <br />
            vă rugăm să trimiteți
            <br />
            un e-mail la{" "}
            <a
              href={`mailto:${CONSULTATION_EMAIL}`}
              className="font-bold text-gray-900 hover:underline"
            >
              {CONSULTATION_EMAIL}
            </a>
            .
          </p>
          <p className="mt-4 text-sm text-gray-500">Mulțumim pentru încredere.</p>
        </div>
        <div className="px-6 pb-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className={`${btn.primary} px-10 uppercase tracking-wide`}
          >
            OK.
          </button>
        </div>
      </div>
    </div>
  );
}
