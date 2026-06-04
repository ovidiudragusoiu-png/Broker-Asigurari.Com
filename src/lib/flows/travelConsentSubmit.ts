import type { ConsentFieldMapping } from "@/lib/flows/consentApiMapper";
import type { TravelAgreementAnswers } from "@/lib/flows/travelAgreementsCopy";
import { submitConsentAnswers } from "@/lib/flows/consentSubmit";
import type { PersonRequest } from "@/types/insuretech";

export function travelAnswersToMappings(answers: TravelAgreementAnswers): ConsentFieldMapping[] {
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
    { questionCode: "0.4", answerHints: ["asigurat"], selected: answers.dnt_0_4 === "asigurat" },
    { questionCode: "0.4", answerHints: ["contractant"], selected: answers.dnt_0_4 === "contractant" },
    { questionCode: "0.5", answerHints: ["europa"], selected: answers.dnt_0_5 === "europe" },
    {
      questionCode: "0.5",
      answerHints: ["exceptia", "excepția", "exceptie"],
      selected: answers.dnt_0_5 === "excl_usa",
    },
    {
      questionCode: "0.5",
      answerHints: ["sua, canada", "sua canada", "israel"],
      selected: answers.dnt_0_5 === "usa",
    },
    { questionCode: "0.5", answerHints: ["romania", "românia"], selected: answers.dnt_0_5 === "romania" },
    { questionCode: "0.6", answerHints: ["da"], selected: answers.dnt_0_6 === "DA" },
    { questionCode: "0.6", answerHints: ["nu"], selected: answers.dnt_0_6 === "NU" },
    {
      questionCode: "0.7",
      answerHints: ["bagaj", "furt"],
      selected: answers.dnt_0_7_baggage,
    },
    { questionCode: "0.7", answerHints: ["sport", "extreme"], selected: answers.dnt_0_7_sports },
    {
      questionCode: "0.7",
      answerHints: ["nu sunt interesat", "neinteresat", "nu ma intereseaza"],
      selected: answers.dnt_0_7_none,
    },
    { questionCode: "0.8", answerHints: ["avion"], selected: answers.dnt_0_8_plane },
    { questionCode: "0.8", answerHints: ["autoturism", "masina", "mașina"], selected: answers.dnt_0_8_car },
    { questionCode: "0.8", answerHints: ["alt mijloc", "altul"], selected: answers.dnt_0_8_other },
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

export async function submitTravelAgreements(
  person: PersonRequest,
  answers: TravelAgreementAnswers
): Promise<void> {
  await submitConsentAnswers(
    person,
    "TRAVEL",
    travelAnswersToMappings(answers),
    answers.comm_1_1
  );
}
