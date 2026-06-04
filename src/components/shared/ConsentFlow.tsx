"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api/client";
import { btn } from "@/lib/ui/tokens";
import {
  formatConsentDisplayText,
  isExcludedConsentQuestion,
} from "@/lib/flows/consentDisplay";
import type {
  LegalType,
  VendorProductType,
  PersonRequest,
} from "@/types/insuretech";

interface ConsentFlowProps {
  legalType: LegalType;
  cif: string;
  vendorProductType: VendorProductType;
  personData: PersonRequest;
  onComplete: () => void;
  onError?: (error: string) => void;
  onBack?: () => void;
  backLabel?: string;
  title?: string;
}

interface Section {
  title: string;
  questions: Question[];
}

interface Question {
  id: string;
  label: string;
  description: string;
  type: string;
  hiddenByAnswers?: string[];
  answers: Answer[];
}

interface Answer {
  id: string;
  label: string;
  mandatory: boolean;
  defaultValue: string;
  extraField: { name: string; label: string } | null;
}

interface CommunicationChannels {
  communicationChannelEmail: boolean;
  communicationChannelPhoneNo: boolean;
  communicationChannelAddress: boolean;
}

function sanitizeHtml(input: string): string {
  // Allow only safe tags: b, i, em, strong, br, p, ul, ol, li, a (href only)
  return input
    // Remove script tags and content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    // Remove style tags and content
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    // Remove all event handlers (on*)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: protocol in any attribute
    .replace(/javascript\s*:/gi, "")
    // Remove data: protocol (can embed scripts)
    .replace(/data\s*:[^,\s]*/gi, "")
    // Remove iframe, object, embed, form, input tags entirely
    .replace(/<\/?(iframe|object|embed|form|input|textarea|button|select|meta|link|base)[^>]*>/gi, "");
}

function buildDefaultAnswers(loadedSections: Section[]): Record<string, string[]> {
  const defaults: Record<string, string[]> = {};
  for (const section of loadedSections) {
    for (const question of section.questions) {
      if (isExcludedConsentQuestion(question)) continue;
      const defaultSelected = question.answers
        .filter((a) => a.defaultValue === "true")
        .map((a) => a.id);
      if (defaultSelected.length > 0) {
        defaults[question.id] = defaultSelected;
      }
    }
  }
  return defaults;
}

export default function ConsentFlow({
  legalType,
  cif,
  vendorProductType,
  personData,
  onComplete,
  onError,
  onBack,
  backLabel = "Inapoi",
  title = "Acorduri necesare",
}: ConsentFlowProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [extraFieldValues, setExtraFieldValues] = useState<
    Record<string, string>
  >({});
  const [commChannels, setCommChannels] = useState<CommunicationChannels>({
    communicationChannelEmail: true,
    communicationChannelPhoneNo: false,
    communicationChannelAddress: false,
  });
  const [alreadyConsented, setAlreadyConsented] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorStatus, setSubmitErrorStatus] = useState<number | null>(
    null
  );

  const checkAndLoad = useCallback(async () => {
    setLoading(true);
    try {
      // Check if consent already exists (valid for 2 hours)
      const status = await api.get<{ signedDocuments: boolean }>(
        `/online/client/documents/status?legalType=${legalType}&cif=${cif}&vendorProductType=${vendorProductType}`
      );

      if (status.signedDocuments) {
        setAlreadyConsented(true);
        setLoading(false);
        onComplete();
        return;
      }

      // Fetch consent questions
      const data = await api.get<{
        sections: Section[];
        communicationChannels: string[];
      }>(
        `/online/client/documents/fetch-questions?legalType=${legalType}&vendorProductType=${vendorProductType}`
      );

      const loadedSections = data.sections || [];
      setSections(loadedSections);
      setChannels(data.communicationChannels || []);
      setSelectedAnswers(buildDefaultAnswers(loadedSections));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to load consent");
    } finally {
      setLoading(false);
    }
  }, [legalType, cif, vendorProductType, onComplete, onError]);

  useEffect(() => {
    checkAndLoad();
  }, [checkAndLoad]);

  // Get all selected answer IDs (flat) to check hiddenByAnswers
  const allSelectedIds = Object.values(selectedAnswers).flat();

  const isQuestionHidden = (question: Question): boolean => {
    if (!question.hiddenByAnswers?.length) return false;
    return question.hiddenByAnswers.some((id) => allSelectedIds.includes(id));
  };

  const toggleAnswer = (
    questionId: string,
    answerId: string,
    type: string
  ) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (type === "checkbox_oneOf") {
        return { ...prev, [questionId]: [answerId] };
      }
      // checkbox_allIn: toggle
      if (current.includes(answerId)) {
        return {
          ...prev,
          [questionId]: current.filter((id) => id !== answerId),
        };
      }
      return { ...prev, [questionId]: [...current, answerId] };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorStatus(null);
    try {
      if (alreadyConsented) {
        onComplete();
        return;
      }
      // Build formInputData: { inputName_X: true/false, ... }
      const formInputData: Record<string, boolean | string> = {};
      for (const section of sections) {
        for (const question of section.questions) {
          if (isExcludedConsentQuestion(question) || isQuestionHidden(question)) continue;

          if (question.type === "text") {
            formInputData[question.id] =
              textAnswers[question.id] || "";
          } else {
            const selected = selectedAnswers[question.id] || [];
            for (const answer of question.answers) {
              formInputData[answer.id] = selected.includes(answer.id);
              // If answer has extraField and is selected, include it
              if (
                answer.extraField &&
                selected.includes(answer.id) &&
                extraFieldValues[answer.id]
              ) {
                formInputData[answer.extraField.name] =
                  extraFieldValues[answer.id];
              }
            }
          }
        }
      }

      await api.post("/online/client/documents/submit-answers", {
        personBaseRequest: personData,
        communicationChannelEmail: commChannels.communicationChannelEmail,
        communicationChannelPhoneNo: commChannels.communicationChannelPhoneNo,
        communicationChannelAddress: commChannels.communicationChannelAddress,
        formInputData,
        vendorProductType,
        website:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://www.sigur.ai",
      });

      onComplete();
    } catch (err) {
      const status =
        err instanceof ApiError ? err.status : 0;
      const message =
        err instanceof Error ? err.message : "Failed to submit consent";
      setSubmitError(message);
      setSubmitErrorStatus(status);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
        Se verifica consimtamantul...
      </div>
    );
  }

  if (alreadyConsented) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
        Consimtamantul este deja acordat. Puteti continua.
      </div>
    );
  }

  const resetAnswers = () => {
    setSelectedAnswers(buildDefaultAnswers(sections));
    setTextAnswers({});
    setExtraFieldValues({});
    setSubmitError(null);
    setSubmitErrorStatus(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>

      {sections.map((section, sectionIndex) => (
        <div
          key={sectionIndex}
          className="rounded-md border border-gray-200 p-4"
        >
          {section.title ? (
            <h4 className="mb-3 font-medium text-gray-900">
              {formatConsentDisplayText(section.title)}
            </h4>
          ) : null}

          {section.questions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Fara intrebari in aceasta sectiune.
            </p>
          ) : (
            <div className="space-y-4">
              {section.questions.map((question) => {
                if (isExcludedConsentQuestion(question) || isQuestionHidden(question)) return null;

                return (
                  <div key={question.id} className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-1 text-sm font-medium text-gray-800">
                      {formatConsentDisplayText(question.label)}
                    </p>
                    {question.description && (
                      <p
                        className="mb-2 text-xs text-gray-500"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(formatConsentDisplayText(question.description)),
                        }}
                      />
                    )}

                    {question.type === "text" ? (
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={textAnswers[question.id] || ""}
                        onChange={(e) =>
                          setTextAnswers((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {question.answers.map((answer) => {
                          const isChecked = (
                            selectedAnswers[question.id] || []
                          ).includes(answer.id);
                          const inputType =
                            question.type === "checkbox_oneOf"
                              ? "radio"
                              : "checkbox";
                          return (
                            <div key={answer.id}>
                              <label className="flex items-start gap-2 text-sm">
                                <input
                                  type={inputType}
                                  name={`q_${question.id}`}
                                  checked={isChecked}
                                  onChange={() =>
                                    toggleAnswer(
                                      question.id,
                                      answer.id,
                                      question.type
                                    )
                                  }
                                  className="mt-0.5"
                                />
                                <span className="text-gray-700">
                                  {formatConsentDisplayText(answer.label)}
                                  {answer.mandatory && (
                                    <span className="text-red-500"> *</span>
                                  )}
                                </span>
                              </label>
                              {answer.extraField && isChecked && (
                                <div className="ml-6 mt-1">
                                  <label className="text-xs text-gray-500">
                                    {answer.extraField.label}
                                  </label>
                                  <input
                                    type="text"
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                                    value={extraFieldValues[answer.id] || ""}
                                    onChange={(e) =>
                                      setExtraFieldValues((prev) => ({
                                        ...prev,
                                        [answer.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Communication channels */}
      {channels.length > 0 && (
        <div className="rounded-md border border-gray-200 p-4">
          <h4 className="mb-3 font-medium text-gray-900">
            Canale de comunicare
          </h4>
          <div className="space-y-2">
            {channels.includes("communicationChannelEmail") && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={commChannels.communicationChannelEmail}
                  onChange={(e) =>
                    setCommChannels((prev) => ({
                      ...prev,
                      communicationChannelEmail: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Email</span>
              </label>
            )}
            {channels.includes("communicationChannelPhoneNo") && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={commChannels.communicationChannelPhoneNo}
                  onChange={(e) =>
                    setCommChannels((prev) => ({
                      ...prev,
                      communicationChannelPhoneNo: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Telefon</span>
              </label>
            )}
            {channels.includes("communicationChannelAddress") && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={commChannels.communicationChannelAddress}
                  onChange={(e) =>
                    setCommChannels((prev) => ({
                      ...prev,
                      communicationChannelAddress: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Adresa postala</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Submit error display */}
      {submitError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Eroare la trimiterea consimtamantului
          </p>
          <p className="mt-1 text-sm text-red-700">{submitError}</p>
          {submitErrorStatus === 500 && (
            <div className="mt-3 rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                Serverul InsureTech a returnat o eroare interna (500). Aceasta
                este o problema temporara pe partea de server. Puteti incerca din
                nou sau continua fara consimtamant (pentru mediul de staging).
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Reincearca
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className="rounded-md border border-yellow-600 px-4 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                >
                  Continua fara consimtamant (staging)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={resetAnswers}
          className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700"
        >
          Resetează răspunsurile
        </button>
        {!submitError && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`${btn.primary} disabled:opacity-50 sm:min-w-[12rem]`}
          >
            {submitting ? "Se trimite..." : "Confirmă acordurile"}
          </button>
        )}
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
