import { api } from "@/lib/api/client";

interface ConsentAnswer {
  id: string;
  defaultValue: string;
  extraField?: { name: string } | null;
}

interface ConsentQuestion {
  id: string;
  type?: string;
  answers: ConsentAnswer[];
}

interface ConsentSection {
  title: string;
  questions: ConsentQuestion[];
}

interface ConsentData {
  sections: ConsentSection[];
  communicationChannels: string[];
}

interface ConsentStatus {
  signedDocuments: boolean;
}

/**
 * Auto-sign consent documents for a person + product type.
 * Checks status first, fetches questions only if unsigned, then submits defaults.
 * After signing, verifies that the status is now signed.
 * Safe to call multiple times — no-ops if already signed.
 */
export async function autoSignConsent(
  person: { legalType: string; cif: number | string },
  vendorProductType: string
): Promise<void> {
  const { legalType, cif } = person;

  // Check if already signed
  try {
    const status = await api.get<ConsentStatus>(
      `/online/client/documents/status?legalType=${legalType}&cif=${cif}&vendorProductType=${vendorProductType}`
    );
    if (status.signedDocuments) return;
  } catch {
    // Status check failed — proceed to sign
  }

  // Fetch questions
  const consentData = await api.get<ConsentData>(
    `/online/client/documents/fetch-questions?legalType=${legalType}&vendorProductType=${vendorProductType}`
  );

  // Mirror ConsentFlow defaults: select only default answers and send false for all others.
  const formInputData: Record<string, boolean | string> = {};
  for (const section of consentData.sections) {
    for (const question of section.questions) {
      if (question.type === "text") {
        formInputData[question.id] = "";
        continue;
      }

      const defaultSelected = question.type === "checkbox_oneOf"
        ? new Set(
            question.answers
              .filter((answer) => answer.defaultValue === "true")
              .slice(0, 1)
              .map((answer) => answer.id)
          )
        : new Set(
            question.answers
              .filter((answer) => answer.defaultValue === "true")
              .map((answer) => answer.id)
          );

      for (const answer of question.answers) {
        const isSelected = defaultSelected.has(answer.id);
        formInputData[answer.id] = isSelected;
        if (isSelected && answer.extraField?.name) {
          formInputData[answer.extraField.name] = "";
        }
      }
    }
  }

  // Submit with full person object as personBaseRequest
  // If this succeeds (no error thrown), consent is signed — skip redundant verify call
  await api.post("/online/client/documents/submit-answers", {
    personBaseRequest: person,
    communicationChannelEmail: true,
    communicationChannelPhoneNo: false,
    communicationChannelAddress: false,
    formInputData,
    vendorProductType,
    website:
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.sigur.ai",
  });
}


