import { isExcludedConsentQuestion } from "@/lib/flows/consentDisplay";

export interface ConsentAnswer {
  id: string;
  label: string;
  mandatory?: boolean;
  defaultValue?: string;
}

export interface ConsentQuestion {
  id: string;
  label?: string;
  type?: string;
  hiddenByAnswers?: string[];
  answers: ConsentAnswer[];
}

export interface ConsentSection {
  title: string;
  questions: ConsentQuestion[];
}

export class ConsentMappingError extends Error {
  constructor(
    message: string,
    readonly details: string[]
  ) {
    super(message);
    this.name = "ConsentMappingError";
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Leading item code from API label, e.g. "0.4 DETALII..." → "0.4", "1.1 Sunt..." → "1.1" */
export function extractQuestionCode(label: string | undefined): string | null {
  const match = (label ?? "").trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

function sectionMatches(title: string | undefined, sectionHint: string | undefined): boolean {
  if (!sectionHint) return true;
  return normalizeText(title ?? "").includes(normalizeText(sectionHint));
}

function answerMatches(label: string, answerHints: string[]): boolean {
  const normalized = normalizeText(label);
  return answerHints.some((hint) => normalized.includes(normalizeText(hint)));
}

function questionMatches(
  question: ConsentQuestion,
  questionCode?: string,
  questionLabelHints?: string[]
): boolean {
  if (questionLabelHints?.length) {
    const normalized = normalizeText(question.label ?? "");
    return questionLabelHints.some((hint) => normalized.includes(normalizeText(hint)));
  }
  if (questionCode) {
    return extractQuestionCode(question.label) === questionCode;
  }
  return false;
}

export function findAnswerId(
  sections: ConsentSection[],
  questionCode: string,
  answerHints: string[],
  options?: { sectionHint?: string; questionLabelHints?: string[] }
): string | null {
  for (const section of sections) {
    if (!sectionMatches(section.title, options?.sectionHint)) continue;

    for (const question of section.questions) {
      if (isExcludedConsentQuestion(question)) continue;
      if (
        !questionMatches(
          question,
          options?.questionLabelHints ? undefined : questionCode,
          options?.questionLabelHints
        )
      ) {
        continue;
      }

      for (const answer of question.answers) {
        if (answerMatches(answer.label, answerHints)) {
          return answer.id;
        }
      }
    }
  }
  return null;
}

export type ConsentFieldMapping = {
  questionCode?: string;
  questionLabelHints?: string[];
  answerHints: string[];
  selected: boolean;
  sectionHint?: string;
};

export function buildConsentFormInputData(
  sections: ConsentSection[],
  mappings: ConsentFieldMapping[]
): Record<string, boolean | string> {
  const formInputData: Record<string, boolean | string> = {};
  const unmapped: string[] = [];

  for (const section of sections) {
    for (const question of section.questions) {
      if (isExcludedConsentQuestion(question)) continue;

      if (question.type === "text") {
        formInputData[question.id] = "";
        continue;
      }

      for (const answer of question.answers) {
        formInputData[answer.id] = false;
      }
    }
  }

  for (const mapping of mappings) {
    const answerId = findAnswerId(
      sections,
      mapping.questionCode ?? "",
      mapping.answerHints,
      {
        sectionHint: mapping.sectionHint,
        questionLabelHints: mapping.questionLabelHints,
      }
    );
    if (!answerId) {
      if (mapping.selected) {
        const questionRef =
          mapping.questionCode ??
          mapping.questionLabelHints?.join(" + ") ??
          "?";
        unmapped.push(
          `${questionRef} → [${mapping.answerHints.join(", ")}]${mapping.sectionHint ? ` (${mapping.sectionHint})` : ""}`
        );
      }
      continue;
    }
    formInputData[answerId] = mapping.selected;
  }

  validateConsentFormInputData(sections, formInputData, unmapped);
  return formInputData;
}

export function validateConsentFormInputData(
  sections: ConsentSection[],
  formInputData: Record<string, boolean | string>,
  unmappedSelected: string[] = []
): void {
  const errors: string[] = [...unmappedSelected.map((u) => `Mapare lipsă: ${u}`)];

  for (const section of sections) {
    for (const question of section.questions) {
      if (isExcludedConsentQuestion(question)) continue;
      if (question.type === "text") continue;

      const selectedIds = question.answers
        .filter((answer) => formInputData[answer.id] === true)
        .map((answer) => answer.id);

      if (question.type === "checkbox_oneOf") {
        if (selectedIds.length !== 1) {
          errors.push(
            `Întrebarea „${question.label?.slice(0, 80) ?? question.id}” necesită exact un răspuns (are ${selectedIds.length}).`
          );
        }
        continue;
      }

      const mandatoryAnswers = question.answers.filter((answer) => answer.mandatory);
      if (mandatoryAnswers.length > 0) {
        const hasMandatory = mandatoryAnswers.some((answer) => formInputData[answer.id] === true);
        if (!hasMandatory) {
          errors.push(
            `Întrebarea „${question.label?.slice(0, 80) ?? question.id}” necesită un răspuns obligatoriu.`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ConsentMappingError(
      "Nu am putut mapa complet acordurile pentru semnare. Încercați din nou sau contactați suportul.",
      errors
    );
  }
}
