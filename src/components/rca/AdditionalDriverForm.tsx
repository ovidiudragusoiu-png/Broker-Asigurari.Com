"use client";

import { validateCNP } from "@/lib/utils/validation";
import { isAdditionalDriverValid } from "@/lib/utils/formGuards";
import type { AdditionalDriver } from "@/types/rcaFlow";
import { emptyAdditionalDriver } from "@/lib/utils/rcaHelpers";

interface AdditionalDriverFormProps {
  hasDriver: boolean;
  driver: AdditionalDriver | null;
  onToggle: (has: boolean) => void;
  onDriverChange: (driver: AdditionalDriver) => void;
  onContinue: () => void;
}

export default function AdditionalDriverForm({
  hasDriver,
  driver,
  onToggle,
  onDriverChange,
  onContinue,
}: AdditionalDriverFormProps) {
  const d = driver ?? emptyAdditionalDriver();
  const cnpInvalid = d.cnp.length > 0 && !validateCNP(d.cnp);
  const isValid = !hasDriver || isAdditionalDriverValid(d);

  const updateField = (field: keyof AdditionalDriver, value: string) => {
    onDriverChange({ ...d, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Sofer suplimentar</h2>
        <p className="mt-1 text-sm text-gray-500">
          Doriti sa adaugati un sofer suplimentar pe polita?
        </p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            !hasDriver
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Nu, multumesc
        </button>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            hasDriver
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Da, adaug sofer
        </button>
      </div>

      {/* Driver fields */}
      {hasDriver && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nume</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={d.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prenume</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={d.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">CNP</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={d.cnp}
              onChange={(e) => updateField("cnp", e.target.value.replace(/\D/g, ""))}
              maxLength={13}
            />
            {cnpInvalid && <p className="mt-1 text-xs text-red-600">CNP invalid</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip document</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={d.idType}
                onChange={(e) => updateField("idType", e.target.value)}
              >
                <option value="CI">Carte de Identitate</option>
                <option value="PASSPORT">Pasaport</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Serie</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                value={d.idSeries}
                onChange={(e) => updateField("idSeries", e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={d.idNumber}
                onChange={(e) => updateField("idNumber", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Data obtinere permis conducere
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={d.driverLicenceDate}
              onChange={(e) => updateField("driverLicenceDate", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Continue */}
      <div className="text-center">
        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continua
        </button>
      </div>
    </div>
  );
}
