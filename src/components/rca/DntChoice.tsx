"use client";

import { useState } from "react";

interface DntChoiceProps {
  onContinueDirect: () => void;
}

const CONSULTATION_EMAIL = "contact@broker-asigurari.com";

export default function DntChoice({ onContinueDirect }: DntChoiceProps) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Utilizare polita</h2>
      </div>

      {/* Usage notice */}
      <div className="mx-auto max-w-lg rounded-lg border-2 border-amber-200 bg-amber-50 p-5">
        <p className="text-center text-sm font-semibold text-amber-800">
          Ofertele si contractele RCA sunt valabile doar pentru{" "}
          <span className="uppercase">utilizarea in interes personal</span>.
        </p>
      </div>

      {/* DNT option */}
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-sm text-gray-700">
          Daca doriti consultanta suplimentara de asigurari - DNT{" "}
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="font-semibold text-blue-600 underline hover:text-blue-800"
          >
            click aici
          </button>
          .
        </p>
        <p className="text-sm text-gray-700">
          Sau <strong>CONTINUATI DIRECT</strong> si veti primi oferte fara consultanta DNT.
        </p>

        <button
          type="button"
          onClick={onContinueDirect}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continua direct
        </button>
      </div>

      {/* DNT consultation popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-gray-900">
              Consultanta DNT
            </h3>
            <p className="text-sm text-gray-700">
              Pentru consultanta suplimentara in domeniul asigurarilor, va rugam sa ne trimiteti
              un email la adresa:
            </p>
            <p className="my-3 text-center">
              <a
                href={`mailto:${CONSULTATION_EMAIL}`}
                className="text-lg font-semibold text-blue-600 underline"
              >
                {CONSULTATION_EMAIL}
              </a>
            </p>
            <p className="text-sm text-gray-500">
              Un consultant va va contacta in cel mai scurt timp posibil.
            </p>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="rounded-lg bg-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
              >
                Inchide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
