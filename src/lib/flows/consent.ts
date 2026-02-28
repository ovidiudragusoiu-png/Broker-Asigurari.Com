import { api } from "@/lib/api/client";

interface ConsentQuestion {
  id: string;
  type?: string;
  answers: { id: string; defaultValue: string }[];
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
 * Safe to call multiple times — no-ops if already signed.
 */
export async function autoSignConsent(
  person: { legalType: string; cif: number | string },
  vendorProductType: string
): Promise<void> {
  // Check if already signed
  try {
    const status = await api.get<ConsentStatus>(
      `/online/client/documents/status?legalType=${person.legalType}&cif=${person.cif}&vendorProductType=${vendorProductType}`
    );
    if (status.signedDocuments) return;
  } catch {
    // Status check failed — proceed to sign
  }

  // Fetch questions
  const consentData = await api.get<ConsentData>(
    `/online/client/documents/fetch-questions?legalType=${person.legalType}&vendorProductType=${vendorProductType}`
  );

  // Build default answers
  const formInputData: Record<string, boolean | string> = {};
  for (const section of consentData.sections) {
    for (const question of section.questions) {
      if (question.type === "text") {
        formInputData[question.id] = "";
      } else {
        for (const answer of question.answers) {
          formInputData[answer.id] = answer.defaultValue === "true";
        }
      }
    }
  }

  // Submit
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
        : "https://www.broker-asigurari.com",
  });
}
