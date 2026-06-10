import type { ConsentFieldMapping } from "@/lib/flows/consentApiMapper";
import type { HouseAgreementAnswers } from "@/lib/flows/houseAgreementsCopy";
import { isConsentSigned, submitConsentAnswers } from "@/lib/flows/consentSubmit";
import { notifyDntSummaryEmail } from "@/lib/flows/dntSummaryNotify";
import type { PersonRequest } from "@/types/insuretech";

export function houseAnswersToMappings(answers: HouseAgreementAnswers): ConsentFieldMapping[] {
  return [
    {
      questionCode: "1.1",
      sectionHint: "comunicare",
      answerHints: ["e-mail", "email", "adresa"],
      selected: answers.comm_1_1,
    },
    { questionCode: "0.1", answerHints: ["da"], selected: answers.dnt_0_1 === "DA" },
    { questionCode: "0.1", answerHints: ["nu"], selected: answers.dnt_0_1 === "NU" },
    {
      questionCode: "0.2",
      answerHints: ["acelasi", "același", "reinnoire", "reînnoire"],
      selected: answers.dnt_0_2 === "renew_same",
    },
    { questionCode: "0.2", answerHints: ["un singur"], selected: answers.dnt_0_2 === "single" },
    {
      questionCode: "0.2",
      answerHints: ["mai multi", "mai mulți"],
      selected: answers.dnt_0_2 === "multi",
    },
    { questionCode: "0.4", answerHints: ["proprietar"], selected: answers.dnt_0_4 === "proprietar" },
    { questionCode: "0.4", answerHints: ["chirias", "chiriaș"], selected: answers.dnt_0_4 === "chirias" },
    { questionCode: "0.5", answerHints: ["apartament"], selected: answers.dnt_0_5 === "apartament" },
    { questionCode: "0.5", answerHints: ["casa", "vila", "vilă"], selected: answers.dnt_0_5 === "casa" },
    { questionCode: "0.6", answerHints: ["da"], selected: answers.dnt_0_6 === "DA" },
    { questionCode: "0.6", answerHints: ["nu"], selected: answers.dnt_0_6 === "NU" },
    { questionCode: "0.7", answerHints: ["da"], selected: answers.dnt_0_7 === "DA" },
    { questionCode: "0.7", answerHints: ["nu"], selected: answers.dnt_0_7 === "NU" },
    { questionCode: "0.8", answerHints: ["da"], selected: answers.dnt_0_8 === "DA" },
    { questionCode: "0.8", answerHints: ["nu"], selected: answers.dnt_0_8 === "NU" },
    { questionCode: "0.9", answerHints: ["da"], selected: answers.dnt_0_9 === "DA" },
    { questionCode: "0.9", answerHints: ["nu"], selected: answers.dnt_0_9 === "NU" },
    {
      questionCode: "1.1",
      sectionHint: "informarea",
      answerHints: ["da"],
      selected: answers.broker_1_1 === "da",
    },
    {
      questionCode: "1.1",
      sectionHint: "informarea",
      answerHints: ["nu"],
      selected: answers.broker_1_1 === "nu",
    },
    {
      questionCode: "1.2",
      sectionHint: "informarea",
      answerHints: ["da"],
      selected: answers.broker_1_2 === "da",
    },
    {
      questionCode: "1.2",
      sectionHint: "informarea",
      answerHints: ["nu"],
      selected: answers.broker_1_2 === "nu",
    },
    {
      questionCode: "1.3",
      sectionHint: "informarea",
      answerHints: ["da"],
      selected: answers.broker_1_3 === "da",
    },
    {
      questionCode: "1.3",
      sectionHint: "informarea",
      answerHints: ["nu"],
      selected: answers.broker_1_3 === "nu",
    },
  ];
}

export async function submitHouseAgreements(
  person: PersonRequest,
  answers: HouseAgreementAnswers
): Promise<void> {
  const { legalType, cif } = person;
  const alreadySigned = await isConsentSigned(legalType, cif, "HOUSE");
  await submitConsentAnswers(person, "HOUSE", houseAnswersToMappings(answers), answers.comm_1_1);
  if (!alreadySigned) {
    notifyDntSummaryEmail("HOUSE", person, answers);
  }
}
