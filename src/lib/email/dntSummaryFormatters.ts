import type { HouseAgreementAnswers } from "@/lib/flows/houseAgreementsCopy";
import { HOUSE_AGREEMENTS_SECTIONS } from "@/lib/flows/houseAgreementsCopy";
import type { MalpraxisAgreementAnswers } from "@/lib/flows/malpraxisAgreementsCopy";
import { MALPRAXIS_AGREEMENTS_SECTIONS } from "@/lib/flows/malpraxisAgreementsCopy";
import type { PadAgreementAnswers } from "@/lib/flows/padAgreementsCopy";
import { PAD_AGREEMENTS_SECTIONS } from "@/lib/flows/padAgreementsCopy";
import type { TravelAgreementAnswers } from "@/lib/flows/travelAgreementsCopy";
import { TRAVEL_AGREEMENTS_SECTIONS } from "@/lib/flows/travelAgreementsCopy";

export type DntSummaryProduct = "PAD" | "HOUSE" | "TRAVEL" | "MALPRAXIS";

export interface DntSummaryRow {
  question: string;
  answer: string;
}

type RadioItem = {
  id: string;
  kind: "radio";
  label: string;
  options: readonly { value: string; label: string }[];
};

type CheckboxItem = {
  id: string;
  kind: "checkbox";
  label: string;
  checkboxLabel: string;
};

function labelForRadio(
  value: string,
  options: readonly { value: string; label: string }[]
): string {
  if (!value) return "Neselectat";
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatSectionsWithRadio<T extends Record<string, unknown>>(
  sections: readonly {
    items: readonly (
      | RadioItem
      | CheckboxItem
      | { id: string; kind: string; label: string; options?: readonly { value: string; label: string }[]; checkboxLabel?: string }
    )[];
  }[],
  answers: T,
  getCheckboxValue: (item: CheckboxItem) => boolean
): DntSummaryRow[] {
  const rows: DntSummaryRow[] = [];

  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === "checkbox" && "checkboxLabel" in item) {
        rows.push({
          question: item.label,
          answer: getCheckboxValue(item as CheckboxItem) ? item.checkboxLabel! : "Nu",
        });
        continue;
      }

      if (item.kind === "radio" && item.options) {
        const value = String(answers[item.id as keyof T] ?? "");
        rows.push({
          question: item.label,
          answer: labelForRadio(value, item.options),
        });
      }
    }
  }

  return rows;
}

export function formatPadDntSummary(answers: PadAgreementAnswers): DntSummaryRow[] {
  return formatSectionsWithRadio(PAD_AGREEMENTS_SECTIONS, answers, () => answers.comm_1_1);
}

export function formatHouseDntSummary(answers: HouseAgreementAnswers): DntSummaryRow[] {
  return formatSectionsWithRadio(HOUSE_AGREEMENTS_SECTIONS, answers, () => answers.comm_1_1);
}

export function formatMalpraxisDntSummary(
  answers: MalpraxisAgreementAnswers
): DntSummaryRow[] {
  return formatSectionsWithRadio(MALPRAXIS_AGREEMENTS_SECTIONS, answers, () => answers.comm_1_1);
}

export function formatTravelDntSummary(answers: TravelAgreementAnswers): DntSummaryRow[] {
  const rows: DntSummaryRow[] = [];

  for (const section of TRAVEL_AGREEMENTS_SECTIONS) {
    for (const item of section.items) {
      if (item.kind === "checkbox") {
        rows.push({
          question: item.label,
          answer: answers.comm_1_1 ? item.checkboxLabel : "Nu",
        });
        continue;
      }

      if (item.kind === "checkboxes") {
        const selected: string[] = [];
        if (item.id === "dnt_0_7") {
          if (answers.dnt_0_7_baggage) selected.push("Pierdere / furt bagaje");
          if (answers.dnt_0_7_sports) selected.push("Sporturi extreme");
          if (answers.dnt_0_7_none) selected.push("Nu sunt interesat");
        } else if (item.id === "dnt_0_8") {
          if (answers.dnt_0_8_plane) selected.push("Avion");
          if (answers.dnt_0_8_car) selected.push("Autoturism");
          if (answers.dnt_0_8_other) selected.push("Alt mijloc de transport");
        }
        rows.push({
          question: item.label,
          answer: selected.length > 0 ? selected.join(", ") : "Neselectat",
        });
        continue;
      }

      if (item.kind === "radio") {
        const value = answers[item.id as keyof TravelAgreementAnswers] as string;
        rows.push({
          question: item.label,
          answer: labelForRadio(value, item.options),
        });
      }
    }
  }

  return rows;
}

export function formatDntSummary(
  productType: DntSummaryProduct,
  answers:
    | PadAgreementAnswers
    | HouseAgreementAnswers
    | TravelAgreementAnswers
    | MalpraxisAgreementAnswers
): DntSummaryRow[] {
  switch (productType) {
    case "PAD":
      return formatPadDntSummary(answers as PadAgreementAnswers);
    case "HOUSE":
      return formatHouseDntSummary(answers as HouseAgreementAnswers);
    case "TRAVEL":
      return formatTravelDntSummary(answers as TravelAgreementAnswers);
    case "MALPRAXIS":
      return formatMalpraxisDntSummary(answers as MalpraxisAgreementAnswers);
  }
}
