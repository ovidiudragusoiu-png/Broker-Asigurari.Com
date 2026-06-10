import type { HouseAgreementAnswers } from "@/lib/flows/houseAgreementsCopy";
import type { MalpraxisAgreementAnswers } from "@/lib/flows/malpraxisAgreementsCopy";
import type { PadAgreementAnswers } from "@/lib/flows/padAgreementsCopy";
import type { TravelAgreementAnswers } from "@/lib/flows/travelAgreementsCopy";

/** Shared helpers for product agreement (DNT) forms. */

export const AGREEMENT_ITEM_CLASS =
  "rounded-md border border-gray-100 bg-gray-50/60 p-3 transition-colors";

export const AGREEMENT_ITEM_ERROR_CLASS =
  "border-red-400 bg-red-50 ring-1 ring-red-200";

export function agreementItemClass(hasError: boolean): string {
  return hasError
    ? `${AGREEMENT_ITEM_CLASS} ${AGREEMENT_ITEM_ERROR_CLASS}`
    : AGREEMENT_ITEM_CLASS;
}

/** True when a radio-style choice has been actively selected. */
export function isRadioAnswered(value: string): boolean {
  return value.length > 0;
}

/** Shown when mandatory consent for offers is refused (DNT 0.1 or brokeraj 1.1). */
export const STANDARD_OFFER_CONSENT_BLOCKER_MESSAGE =
  "Nu puteți continua către oferte dacă răspunsul la întrebarea 0.1 (DNT) sau 1.1 (servicii de brokeraj) este NU. Pentru a vedea oferte, ambele răspunsuri trebuie să fie DA.";

export const MALPRAXIS_OFFER_CONSENT_BLOCKER_MESSAGE =
  "Nu puteți continua către oferte dacă nu sunteți de acord cu prelucrarea datelor pentru serviciile de intermediere (secțiunea 3). Pentru a vedea oferte, răspunsul trebuie să fie DA.";

type StandardOfferConsentFields = {
  dnt_0_1: string;
  broker_1_1: string;
};

function getStandardOfferBlockers(answers: StandardOfferConsentFields): string[] {
  const blockers: string[] = [];
  if (answers.dnt_0_1 === "NU") blockers.push("dnt_0_1");
  if (answers.broker_1_1 === "nu") blockers.push("broker_1_1");
  return blockers;
}

export function getHouseOfferBlockers(answers: HouseAgreementAnswers): string[] {
  return getStandardOfferBlockers(answers);
}

export function getPadOfferBlockers(answers: PadAgreementAnswers): string[] {
  return getStandardOfferBlockers(answers);
}

export function getTravelOfferBlockers(answers: TravelAgreementAnswers): string[] {
  return getStandardOfferBlockers(answers);
}

export function getMalpraxisOfferBlockers(
  answers: MalpraxisAgreementAnswers
): string[] {
  return answers.broker_gdpr === "nu" ? ["broker_gdpr"] : [];
}

export function getPadMissingIds(answers: PadAgreementAnswers): string[] {
  const missing: string[] = [];
  if (!answers.comm_1_1) missing.push("comm_1_1");
  if (!isRadioAnswered(answers.dnt_0_1)) missing.push("dnt_0_1");
  if (!isRadioAnswered(answers.dnt_0_2)) missing.push("dnt_0_2");
  if (!isRadioAnswered(answers.dnt_0_4)) missing.push("dnt_0_4");
  if (!isRadioAnswered(answers.dnt_0_5)) missing.push("dnt_0_5");
  if (!isRadioAnswered(answers.dnt_0_6)) missing.push("dnt_0_6");
  if (!isRadioAnswered(answers.broker_1_1)) missing.push("broker_1_1");
  if (!isRadioAnswered(answers.broker_1_2)) missing.push("broker_1_2");
  if (!isRadioAnswered(answers.broker_1_3)) missing.push("broker_1_3");
  return missing;
}

export function getHouseMissingIds(answers: HouseAgreementAnswers): string[] {
  const missing: string[] = [];
  if (!answers.comm_1_1) missing.push("comm_1_1");
  if (!isRadioAnswered(answers.dnt_0_1)) missing.push("dnt_0_1");
  if (!isRadioAnswered(answers.dnt_0_2)) missing.push("dnt_0_2");
  if (!isRadioAnswered(answers.dnt_0_4)) missing.push("dnt_0_4");
  if (!isRadioAnswered(answers.dnt_0_5)) missing.push("dnt_0_5");
  if (!isRadioAnswered(answers.dnt_0_6)) missing.push("dnt_0_6");
  if (!isRadioAnswered(answers.dnt_0_7)) missing.push("dnt_0_7");
  if (!isRadioAnswered(answers.dnt_0_8)) missing.push("dnt_0_8");
  if (!isRadioAnswered(answers.dnt_0_9)) missing.push("dnt_0_9");
  if (!isRadioAnswered(answers.broker_1_1)) missing.push("broker_1_1");
  if (!isRadioAnswered(answers.broker_1_2)) missing.push("broker_1_2");
  if (!isRadioAnswered(answers.broker_1_3)) missing.push("broker_1_3");
  return missing;
}

export function getTravelMissingIds(answers: TravelAgreementAnswers): string[] {
  const missing: string[] = [];
  if (!answers.comm_1_1) missing.push("comm_1_1");
  if (!isRadioAnswered(answers.dnt_0_1)) missing.push("dnt_0_1");
  if (!isRadioAnswered(answers.dnt_0_2)) missing.push("dnt_0_2");
  if (!isRadioAnswered(answers.dnt_0_4)) missing.push("dnt_0_4");
  if (!isRadioAnswered(answers.dnt_0_5)) missing.push("dnt_0_5");
  if (!isRadioAnswered(answers.dnt_0_6)) missing.push("dnt_0_6");
  if (!isRadioAnswered(answers.broker_1_1)) missing.push("broker_1_1");
  if (!isRadioAnswered(answers.broker_1_2)) missing.push("broker_1_2");
  if (!isRadioAnswered(answers.broker_1_3)) missing.push("broker_1_3");
  return missing;
}

export function getMalpraxisMissingIds(answers: MalpraxisAgreementAnswers): string[] {
  const missing: string[] = [];
  if (!answers.comm_1_1) missing.push("comm_1_1");
  if (!isRadioAnswered(answers.general_stats)) missing.push("general_stats");
  if (!isRadioAnswered(answers.broker_gdpr)) missing.push("broker_gdpr");
  if (!isRadioAnswered(answers.dnt_marketing)) missing.push("dnt_marketing");
  if (!isRadioAnswered(answers.dnt_minors)) missing.push("dnt_minors");
  if (!isRadioAnswered(answers.dnt_offer)) missing.push("dnt_offer");
  return missing;
}
