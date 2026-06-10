import type { DntSummaryProduct } from "@/lib/email/dntSummaryFormatters";
import { formatDntSummary } from "@/lib/email/dntSummaryFormatters";
import type { HouseAgreementAnswers } from "@/lib/flows/houseAgreementsCopy";
import type { MalpraxisAgreementAnswers } from "@/lib/flows/malpraxisAgreementsCopy";
import type { PadAgreementAnswers } from "@/lib/flows/padAgreementsCopy";
import type { TravelAgreementAnswers } from "@/lib/flows/travelAgreementsCopy";
import type { PersonRequest } from "@/types/insuretech";

type DntAnswers =
  | PadAgreementAnswers
  | HouseAgreementAnswers
  | TravelAgreementAnswers
  | MalpraxisAgreementAnswers;

/** Fire-and-forget: sends DNT summary email after successful consent. Failures are silent. */
export function notifyDntSummaryEmail(
  productType: DntSummaryProduct,
  person: PersonRequest,
  answers: DntAnswers
): void {
  const rows = formatDntSummary(productType, answers);
  const firstName = person.legalType === "PF" ? person.firstName : undefined;

  void fetch("/api/email/dnt-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productType,
      email: person.email,
      firstName,
      rows,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("[DNT summary email] API returned", response.status);
      }
    })
    .catch((err) => {
      console.error("[DNT summary email] request failed:", err);
    });
}
