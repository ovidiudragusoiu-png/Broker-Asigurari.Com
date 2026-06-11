"use client";

import { useMemo, useState } from "react";
import { btn } from "@/lib/ui/tokens";
import {
  HOUSE_AGREEMENTS_INITIAL,
  HOUSE_AGREEMENTS_SECTIONS,
  HOUSE_AGREEMENTS_TITLE,
  type HouseAgreementAnswers,
} from "@/lib/flows/houseAgreementsCopy";
import {
  agreementItemClass,
  getHouseMissingIds,
  getHouseOfferBlockers,
  STANDARD_OFFER_CONSENT_BLOCKER_MESSAGE,
} from "@/lib/flows/agreementFormUtils";
import { ConsentMappingError } from "@/lib/flows/consentSubmit";
import { submitHouseAgreements } from "@/lib/flows/houseConsentSubmit";
import type { PersonRequest } from "@/types/insuretech";
import AgreementChoiceGroup, {
  agreementCheckboxClass,
} from "@/components/shared/AgreementChoiceGroup";

interface HouseAgreementsFormProps {
  personData: PersonRequest;
  answers: HouseAgreementAnswers;
  onAnswersChange: (answers: HouseAgreementAnswers) => void;
  onComplete: () => void;
  onBack?: () => void;
  backLabel?: string;
  onError?: (message: string) => void;
}

export default function HouseAgreementsForm({
  personData,
  answers,
  onAnswersChange,
  onComplete,
  onBack,
  backLabel = "Inapoi",
  onError,
}: HouseAgreementsFormProps) {
  const setAnswers = (
    value: HouseAgreementAnswers | ((prev: HouseAgreementAnswers) => HouseAgreementAnswers)
  ) => {
    onAnswersChange(typeof value === "function" ? value(answers) : value);
  };
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const missingIds = useMemo(() => new Set(getHouseMissingIds(answers)), [answers]);
  const blockerIds = useMemo(() => new Set(getHouseOfferBlockers(answers)), [answers]);
  const errorIds = useMemo(
    () => new Set([...missingIds, ...blockerIds]),
    [missingIds, blockerIds]
  );

  const resetAnswers = () => {
    setAnswers(HOUSE_AGREEMENTS_INITIAL);
    setSubmitError(null);
    setValidationError(null);
    setShowValidation(false);
  };

  const handleSubmit = async () => {
    if (missingIds.size > 0) {
      setShowValidation(true);
      setValidationError("Completați toate câmpurile obligatorii.");
      return;
    }
    if (blockerIds.size > 0) {
      setShowValidation(true);
      setValidationError(STANDARD_OFFER_CONSENT_BLOCKER_MESSAGE);
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitHouseAgreements(personData, answers);
      onComplete();
    } catch (err) {
      const message =
        err instanceof ConsentMappingError
          ? `${err.message}\n${err.details.join("\n")}`
          : err instanceof Error
            ? err.message
            : "Nu am putut trimite acordurile. Încercați din nou.";
      setSubmitError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldHasError = (itemId: string) => showValidation && errorIds.has(itemId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h3 className="text-xl font-bold text-gray-900">{HOUSE_AGREEMENTS_TITLE}</h3>

      {HOUSE_AGREEMENTS_SECTIONS.map((section) => (
        <div key={section.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-gray-900">{section.title}</h4>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div
                key={item.id}
                className={agreementItemClass(fieldHasError(item.id))}
              >
                <p className="mb-1 text-sm leading-relaxed text-gray-800">
                  {item.label}
                  {item.required ? <span className="text-red-500"> *</span> : null}
                </p>
                {"hint" in item && typeof item.hint === "string" ? (
                  <p className="mb-3 text-xs leading-relaxed text-gray-500">{item.hint}</p>
                ) : null}

                {item.kind === "checkbox" ? (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={answers.comm_1_1}
                      onChange={(e) => {
                        setShowValidation(false);
                        setAnswers((prev) => ({ ...prev, comm_1_1: e.target.checked }));
                      }}
                      className={agreementCheckboxClass}
                    />
                    <span className="text-sm text-gray-700">{item.checkboxLabel}</span>
                  </label>
                ) : (
                  <AgreementChoiceGroup
                    value={answers[item.id as keyof HouseAgreementAnswers] as string}
                    options={item.options}
                    onChange={(value) => {
                      setShowValidation(false);
                      setAnswers(
                        (prev) =>
                          ({
                            ...prev,
                            [item.id]: value,
                          }) as HouseAgreementAnswers
                      );
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {validationError && <p className="text-sm text-red-600">{validationError}</p>}
      {submitError && (
        <div className="whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={resetAnswers}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
        >
          <span aria-hidden="true">⟲</span>
          Resetează răspunsurile
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`${btn.primary} disabled:opacity-50 sm:min-w-[12rem]`}
        >
          {submitting ? "Se trimite..." : "Confirmă acordurile"}
        </button>
      </div>

      {onBack && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}
