import { describe, expect, it } from "vitest";
import {
  buildConsentFormInputData,
  extractQuestionCode,
  type ConsentSection,
} from "@/lib/flows/consentApiMapper";
import { padAnswersToMappings } from "@/lib/flows/padConsentSubmit";
import { PAD_AGREEMENTS_DEFAULTS } from "@/lib/flows/padAgreementsCopy";
import { travelAnswersToMappings } from "@/lib/flows/travelConsentSubmit";
import { TRAVEL_AGREEMENTS_DEFAULTS } from "@/lib/flows/travelAgreementsCopy";

const mockPadSections: ConsentSection[] = [
  {
    title: "1. Comunicare",
    questions: [
      {
        id: "q_comm",
        label: "1.1 Canal comunicare",
        type: "checkbox_allIn",
        answers: [{ id: "inputName_email", label: "Adresa de e-mail", mandatory: true }],
      },
    ],
  },
  {
    title: "2. DNT",
    questions: [
      {
        id: "q01",
        label: "0.1 Acord furnizare informatii",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_01_da", label: "DA" },
          { id: "inputName_01_nu", label: "NU" },
        ],
      },
      {
        id: "q03",
        label: "0.3 ACORDARE CONSULTANTA",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_03_nu", label: "NU" },
          { id: "inputName_03_da", label: "DA" },
        ],
      },
      {
        id: "q04",
        label: "0.4 DETALII SUPLIMENTARE PAD",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_04_p", label: "Proprietar" },
          { id: "inputName_04_c", label: "Chirias" },
        ],
      },
      {
        id: "q02",
        label: "0.2 DORESC OFERTA",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_02_r", label: "reinnoire polita" },
          { id: "inputName_02_s", label: "de la un singur asigurator" },
          { id: "inputName_02_m", label: "de la mai multi asiguratori" },
        ],
      },
      {
        id: "q05",
        label: "0.5 Tip locuinta",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_05_a", label: "Apartament" },
          { id: "inputName_05_c", label: "Casa/Vila" },
        ],
      },
      {
        id: "q06",
        label: "0.6 Tip structura",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_06_a", label: "Tip A" },
          { id: "inputName_06_b", label: "Tip B" },
        ],
      },
    ],
  },
  {
    title: "3. Informarea/Consimtamantul privind brokeraj",
    questions: [
      {
        id: "q_b11",
        label: "1.1 Servicii brokeraj",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_b11_da", label: "Da" },
          { id: "inputName_b11_nu", label: "Nu" },
        ],
      },
      {
        id: "q_b12",
        label: "1.2 Comunicari comerciale",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_b12_da", label: "Da" },
          { id: "inputName_b12_nu", label: "Nu" },
        ],
      },
      {
        id: "q_b13",
        label: "1.3 Obligatii legale",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_b13_da", label: "Da" },
          { id: "inputName_b13_nu", label: "Nu" },
        ],
      },
    ],
  },
];

describe("consentApiMapper", () => {
  it("extracts question codes from API labels", () => {
    expect(extractQuestionCode("0.4 DETALII PAD")).toBe("0.4");
    expect(extractQuestionCode("1.1 Servicii")).toBe("1.1");
  });

  it("maps PAD defaults and skips excluded 0.3", () => {
    const form = buildConsentFormInputData(mockPadSections, padAnswersToMappings(PAD_AGREEMENTS_DEFAULTS));
    expect(form.inputName_email).toBe(true);
    expect(form.inputName_01_da).toBe(true);
    expect(form.inputName_01_nu).toBe(false);
    expect(form.inputName_03_da).toBeUndefined();
    expect(form.inputName_03_nu).toBeUndefined();
    expect(form.inputName_04_p).toBe(true);
    expect(form.inputName_b11_da).toBe(true);
  });

  it("fails when a selected radio cannot be mapped", () => {
    const sections: ConsentSection[] = [
      {
        title: "2. DNT",
        questions: [
          {
            id: "q02",
            label: "0.2 DORESC OFERTA",
            type: "checkbox_oneOf",
            answers: [{ id: "a_single", label: "de la un singur asigurator" }],
          },
        ],
      },
    ];
    expect(() =>
      buildConsentFormInputData(sections, [
        { questionCode: "0.2", answerHints: ["mai multi", "mai mulți"], selected: true },
      ])
    ).toThrow(/Nu am putut mapa|Mapare lipsă|exact un răspuns/);
  });
});

import { malpraxisAnswersToMappings } from "@/lib/flows/malpraxisConsentSubmit";
import { MALPRAXIS_AGREEMENTS_DEFAULTS } from "@/lib/flows/malpraxisAgreementsCopy";

const mockMalpraxisSections: ConsentSection[] = [
  {
    title: "Acord General",
    questions: [
      {
        id: "inputGroupName_10",
        label:
          "Sunt de acord ca datele mele personale sa fie prelucrate de broker pentru scopuri statistice",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_47", label: "DA" },
          { id: "inputName_48", label: "NU" },
        ],
      },
    ],
  },
  {
    title: "Informarea/Consimtamantul privind furnizarea de servicii de brokeraj",
    questions: [
      {
        id: "inputGroupName_452",
        label:
          "Sunt de acord cu prelucrarea de catre Insuretech Brokers a datelor mele cu caracter personal inclusiv cele privind starea de sanatate",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_652", label: "DA" },
          { id: "inputName_702", label: "NU" },
        ],
      },
    ],
  },
  {
    title: "DNT",
    questions: [
      {
        id: "inputGroupName_904",
        label:
          "Sunt de acord ca datele mele personale sa fie prelucrate de broker pentru scopuri statistice, respectiv de marketing, sa fiu contactat",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_1158", label: "DA" },
          { id: "inputName_1159", label: "NU" },
        ],
      },
      {
        id: "inputGroupName_908",
        label: "Pentru prelucrarea datelor cu caracter personal privind minorii",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_1166", label: "DA" },
          { id: "inputName_1167", label: "NU" },
          { id: "inputName_1168", label: "NU se aplica" },
        ],
      },
      {
        id: "inputGroupName_106",
        label: "DORESC OFERTĂ:",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_254", label: "reînnoire poliță la același asigurător;" },
          { id: "inputName_932", label: "de la un singur asigurător;" },
          { id: "inputName_933", label: "de la mai mulți asigurători." },
        ],
      },
      {
        id: "inputGroupName_107",
        label: "ACORDARE CONSULTANȚĂ",
        type: "checkbox_oneOf",
        answers: [
          { id: "inputName_304", label: "NU;" },
          { id: "inputName_255", label: "DA." },
        ],
      },
    ],
  },
];

describe("malpraxisAnswersToMappings", () => {
  it("maps Malpraxis defaults and skips excluded consultancy", () => {
    const form = buildConsentFormInputData(
      mockMalpraxisSections,
      malpraxisAnswersToMappings(MALPRAXIS_AGREEMENTS_DEFAULTS)
    );
    expect(form.inputName_48).toBe(true);
    expect(form.inputName_652).toBe(true);
    expect(form.inputName_1159).toBe(true);
    expect(form.inputName_1168).toBe(true);
    expect(form.inputName_933).toBe(true);
    expect(form.inputName_304).toBeUndefined();
    expect(form.inputName_255).toBeUndefined();
  });
});

describe("travelAnswersToMappings", () => {
  it("includes travel-specific question codes", () => {
    const codes = travelAnswersToMappings(TRAVEL_AGREEMENTS_DEFAULTS).map(
      (m) => m.questionCode
    );
    expect(codes).toContain("0.5");
    expect(codes).toContain("0.8");
  });
});
