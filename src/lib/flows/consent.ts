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

  // Build default answers — mark all mandatory answers as true
  const formInputData: Record<string, boolean | string> = {};
  for (const section of consentData.sections) {
    for (const question of section.questions) {
      if (question.type === "text") {
        formInputData[question.id] = "";
      } else {
        for (const answer of question.answers) {
          // Auto-approve all consent answers (mandatory ones must be true)
          formInputData[answer.id] = true;
        }
      }
    }
  }

  // Submit with full person object as personBaseRequest
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

  // Verify consent was actually signed
  try {
    const verification = await api.get<ConsentStatus>(
      `/online/client/documents/status?legalType=${legalType}&cif=${cif}&vendorProductType=${vendorProductType}`
    );
    if (!verification.signedDocuments) {
      throw new Error(
        `Consimțământul nu a fost înregistrat pentru ${vendorProductType}. Vă rugăm să reîncercați.`
      );
    }
  } catch (err) {
    // Re-throw our own error, but don't fail on network errors during verification
    if (err instanceof Error && err.message.includes("Consimțământul")) {
      throw err;
    }
    // Verification call itself failed — consent submission succeeded, proceed optimistically
  }
}
