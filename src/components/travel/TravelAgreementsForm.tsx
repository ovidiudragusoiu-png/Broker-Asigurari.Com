"use client";

import { useMemo, useState } from "react";
import { btn } from "@/lib/ui/tokens";
import {
  TRAVEL_AGREEMENTS_INITIAL,
  TRAVEL_AGREEMENTS_SECTIONS,
  TRAVEL_AGREEMENTS_TITLE,
  type TravelAgreementAnswers,
} from "@/lib/flows/travelAgreementsCopy";
import {
  agreementItemClass,
  getTravelMissingIds,
  getTravelOfferBlockers,
  STANDARD_OFFER_CONSENT_BLOCKER_MESSAGE,
} from "@/lib/flows/agreementFormUtils";
import { ConsentMappingError } from "@/lib/flows/consentSubmit";
import { submitTravelAgreements } from "@/lib/flows/travelConsentSubmit";
import type { PersonRequest } from "@/types/insuretech";
import AgreementChoiceGroup, {
  agreementCheckboxClass,
} from "@/components/shared/AgreementChoiceGroup";

interface TravelAgreementsFormProps {
  personData: PersonRequest;
  answers: TravelAgreementAnswers;
  onAnswersChange: (answers: TravelAgreementAnswers) => void;
  onComplete: () => void;
  onBack?: () => void;
  backLabel?: string;
  onError?: (message: string) => void;
}

export default function TravelAgreementsForm({
  personData,
  answers,
  onAnswersChange,
  onComplete,
  onBack,
  backLabel = "Inapoi",
  onError,
}: TravelAgreementsFormProps) {
  const setAnswers = (
    value: TravelAgreementAnswers | ((prev: TravelAgreementAnswers) => TravelAgreementAnswers)
  ) => {
    onAnswersChange(typeof value === "function" ? value(answers) : value);
  };
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const missingIds = useMemo(() => new Set(getTravelMissingIds(answers)), [answers]);
  const blockerIds = useMemo(() => new Set(getTravelOfferBlockers(answers)), [answers]);
  const errorIds = useMemo(
    () => new Set([...missingIds, ...blockerIds]),
    [missingIds, blockerIds]
  );

  const resetAnswers = () => {
    setAnswers(TRAVEL_AGREEMENTS_INITIAL);
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
      await submitTravelAgreements(personData, answers);
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

  const toggleTravelCheckbox = (
    itemId: "dnt_0_7" | "dnt_0_8",
    optionValue: string,
    checked: boolean
  ) => {
    setShowValidation(false);
    setAnswers((prev) => {
      if (itemId === "dnt_0_7") {
        if (optionValue === "none") {
          return {
            ...prev,
            dnt_0_7_baggage: false,
            dnt_0_7_sports: false,
            dnt_0_7_none: checked,
          };
        }
        return {
          ...prev,
          dnt_0_7_none: false,
          dnt_0_7_baggage:
            optionValue === "baggage" ? checked : prev.dnt_0_7_baggage,
          dnt_0_7_sports:
            optionValue === "sports" ? checked : prev.dnt_0_7_sports,
        };
      }

      return {
        ...prev,
        dnt_0_8_plane: optionValue === "plane" ? checked : prev.dnt_0_8_plane,
        dnt_0_8_car: optionValue === "car" ? checked : prev.dnt_0_8_car,
        dnt_0_8_other: optionValue === "other" ? checked : prev.dnt_0_8_other,
      };
    });
  };

  const isTravelCheckboxSelected = (
    itemId: "dnt_0_7" | "dnt_0_8",
    optionValue: string
  ): boolean => {
    if (itemId === "dnt_0_7") {
      if (optionValue === "baggage") return answers.dnt_0_7_baggage;
      if (optionValue === "sports") return answers.dnt_0_7_sports;
      return answers.dnt_0_7_none;
    }
    if (optionValue === "plane") return answers.dnt_0_8_plane;
    if (optionValue === "car") return answers.dnt_0_8_car;
    return answers.dnt_0_8_other;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h3 className="text-xl font-bold text-gray-900">{TRAVEL_AGREEMENTS_TITLE}</h3>

      {TRAVEL_AGREEMENTS_SECTIONS.map((section) => (
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
                {"hint" in item && item.hint ? (
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
                ) : item.kind === "checkboxes" ? (
                  <div className="space-y-2">
                    {item.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={isTravelCheckboxSelected(
                            item.id as "dnt_0_7" | "dnt_0_8",
                            option.value
                          )}
                          onChange={(e) =>
                            toggleTravelCheckbox(
                              item.id as "dnt_0_7" | "dnt_0_8",
                              option.value,
                              e.target.checked
                            )
                          }
                          className={agreementCheckboxClass}
                        />
                        <span className="leading-snug">{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <AgreementChoiceGroup
                    value={answers[item.id as keyof TravelAgreementAnswers] as string}
                    options={item.options}
                    onChange={(value) => {
                      setShowValidation(false);
                      setAnswers(
                        (prev) =>
                          ({
                            ...prev,
                            [item.id]: value,
                          }) as TravelAgreementAnswers
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
        <div className="whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
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
