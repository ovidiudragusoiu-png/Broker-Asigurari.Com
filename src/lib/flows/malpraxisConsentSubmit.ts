import type { ConsentFieldMapping } from "@/lib/flows/consentApiMapper";
import type { MalpraxisAgreementAnswers } from "@/lib/flows/malpraxisAgreementsCopy";
import { isConsentSigned, submitConsentAnswers } from "@/lib/flows/consentSubmit";
import { notifyDntSummaryEmail } from "@/lib/flows/dntSummaryNotify";
import type { PersonRequest } from "@/types/insuretech";

export function malpraxisAnswersToMappings(
  answers: MalpraxisAgreementAnswers
): ConsentFieldMapping[] {
  return [
    {
      sectionHint: "acord general",
      questionLabelHints: ["scopuri statistice"],
      answerHints: ["da"],
      selected: answers.general_stats === "da",
    },
    {
      sectionHint: "acord general",
      questionLabelHints: ["scopuri statistice"],
      answerHints: ["nu"],
      selected: answers.general_stats === "nu",
    },
    {
      sectionHint: "informarea",
      questionLabelHints: ["intermediere in asigurari", "starea de sanatate"],
      answerHints: ["da"],
      selected: answers.broker_gdpr === "da",
    },
    {
      sectionHint: "informarea",
      questionLabelHints: ["intermediere in asigurari", "starea de sanatate"],
      answerHints: ["nu"],
      selected: answers.broker_gdpr === "nu",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["marketing", "contactat"],
      answerHints: ["da"],
      selected: answers.dnt_marketing === "da",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["marketing", "contactat"],
      answerHints: ["nu"],
      selected: answers.dnt_marketing === "nu",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["minor"],
      answerHints: ["da"],
      selected: answers.dnt_minors === "da",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["minor"],
      answerHints: ["nu"],
      selected: answers.dnt_minors === "nu",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["minor"],
      answerHints: ["nu se aplica", "nu se aplic"],
      selected: answers.dnt_minors === "na",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["doresc oferta", "ofert"],
      answerHints: ["acelasi", "același", "reinnoire", "reînnoire"],
      selected: answers.dnt_offer === "renew_same",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["doresc oferta", "ofert"],
      answerHints: ["un singur"],
      selected: answers.dnt_offer === "single",
    },
    {
      sectionHint: "dnt",
      questionLabelHints: ["doresc oferta", "ofert"],
      answerHints: ["mai multi", "mai mulți"],
      selected: answers.dnt_offer === "multi",
    },
  ];
}

export async function submitMalpraxisAgreements(
  person: PersonRequest,
  answers: MalpraxisAgreementAnswers
): Promise<void> {
  const { legalType, cif } = person;
  const alreadySigned = await isConsentSigned(legalType, cif, "MALPRAXIS");
  await submitConsentAnswers(
    person,
    "MALPRAXIS",
    malpraxisAnswersToMappings(answers),
    answers.comm_1_1
  );
  if (!alreadySigned) {
    notifyDntSummaryEmail("MALPRAXIS", person, answers);
  }
}
