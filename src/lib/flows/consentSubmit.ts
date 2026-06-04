import { api } from "@/lib/api/client";
import { autoSignConsent } from "@/lib/flows/consent";
import {
  buildConsentFormInputData,
  type ConsentFieldMapping,
  type ConsentSection,
  ConsentMappingError,
} from "@/lib/flows/consentApiMapper";
import type { PersonRequest } from "@/types/insuretech";

interface ConsentStatus {
  signedDocuments: boolean;
}

export async function fetchConsentSections(
  legalType: string,
  vendorProductType: string
): Promise<ConsentSection[]> {
  const data = await api.get<{ sections: ConsentSection[] }>(
    `/online/client/documents/fetch-questions?legalType=${legalType}&vendorProductType=${vendorProductType}`
  );
  return data.sections || [];
}

export async function isConsentSigned(
  legalType: string,
  cif: string | number,
  vendorProductType: string
): Promise<boolean> {
  const status = await api.get<ConsentStatus>(
    `/online/client/documents/status?legalType=${legalType}&cif=${cif}&vendorProductType=${vendorProductType}`
  );
  return Boolean(status.signedDocuments);
}

async function ensureConsentSignedWithAutoFallback(
  person: PersonRequest,
  vendorProductType: string,
  mappingError: ConsentMappingError
): Promise<void> {
  const { legalType, cif } = person;

  try {
    await autoSignConsent(person, vendorProductType);
  } catch (autoErr) {
    const autoMessage =
      autoErr instanceof Error ? autoErr.message : "autoSignConsent failed";
    throw new ConsentMappingError(
      `${mappingError.message} Fallback-ul automat nu a reușit.`,
      [...mappingError.details, `autoSign: ${autoMessage}`]
    );
  }

  if (await isConsentSigned(legalType, cif, vendorProductType)) {
    return;
  }

  throw new ConsentMappingError(
    `${mappingError.message} Fallback-ul automat nu a confirmat semnarea.`,
    [...mappingError.details, "signedDocuments=false după autoSignConsent"]
  );
}

export async function submitConsentAnswers(
  person: PersonRequest,
  vendorProductType: string,
  mappings: ConsentFieldMapping[],
  communicationChannelEmail: boolean
): Promise<void> {
  const { legalType, cif } = person;

  if (await isConsentSigned(legalType, cif, vendorProductType)) {
    return;
  }

  try {
    const sections = await fetchConsentSections(legalType, vendorProductType);
    const formInputData = buildConsentFormInputData(sections, mappings);

    await api.post("/online/client/documents/submit-answers", {
      personBaseRequest: person,
      communicationChannelEmail,
      communicationChannelPhoneNo: false,
      communicationChannelAddress: false,
      formInputData,
      vendorProductType,
      website:
        typeof window !== "undefined" ? window.location.origin : "https://www.sigur.ai",
    });

    const signed = await isConsentSigned(legalType, cif, vendorProductType);
    if (!signed) {
      throw new ConsentMappingError(
        "Acordurile au fost trimise, dar serverul nu confirmă semnarea documentelor.",
        ["signedDocuments=false după submit-answers"]
      );
    }
  } catch (err) {
    if (err instanceof ConsentMappingError) {
      await ensureConsentSignedWithAutoFallback(person, vendorProductType, err);
      return;
    }
    throw err;
  }
}

export { ConsentMappingError };
