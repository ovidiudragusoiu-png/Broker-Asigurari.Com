/** Static „Acorduri necesare” copy for Locuință (HOUSE) — per approved UI. */

export const HOUSE_AGREEMENTS_TITLE = "Acorduri necesare";

export const HOUSE_AGREEMENTS_SECTIONS = [
  {
    id: "communication",
    title: "1. Comunicare",
    items: [
      {
        id: "comm_1_1",
        kind: "checkbox" as const,
        label:
          "1.1 Sunt de acord cu stabilirea unui canal de comunicare (e-mail, telefon, corespondență) pentru transmiterea de informații privind contractele de asigurare (termene de plată, oferte, reînnoiri etc.).",
        checkboxLabel: "Adresa de e-mail",
        required: true,
      },
    ],
  },
  {
    id: "dnt",
    title: "2. DNT",
    items: [
      {
        id: "dnt_0_1",
        kind: "radio" as const,
        label:
          "0.1 Sunt de acord cu furnizarea de informații către Sigur.Ai, în vederea evaluării necesităților mele de asigurare, conform prevederilor legale aplicabile.",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_0_2",
        kind: "radio" as const,
        label: "0.2 DORESC OFERTA:",
        options: [
          { value: "renew_same", label: "reînnoire poliță la același asigurător" },
          { value: "single", label: "de la un singur asigurător" },
          { value: "multi", label: "de la mai mulți asigurători" },
        ],
        required: true,
      },
      {
        id: "dnt_0_4",
        kind: "radio" as const,
        label:
          "0.4 DETALII SUPLIMENTARE SPECIFICE ASIGURĂRII DE LOCUINTE PAD: Calitatea dvs.:",
        options: [
          { value: "proprietar", label: "Proprietar" },
          {
            value: "chirias",
            label:
              "Chirias (contractantul poliței este chiriașul, iar proprietarul este asiguratul)",
          },
        ],
        required: true,
      },
      {
        id: "dnt_0_5",
        kind: "radio" as const,
        label: "0.5 Tip locuinta:",
        options: [
          { value: "apartament", label: "Apartament" },
          { value: "casa", label: "Casa/Vila" },
        ],
        required: true,
      },
      {
        id: "dnt_0_6",
        kind: "radio" as const,
        label: "0.6 Aveti polita PAD valabila?",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_0_7",
        kind: "radio" as const,
        label: "0.7 Doriti si asigurarea bunurilor aflate in locuinta?",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_0_8",
        kind: "radio" as const,
        label: "0.8 Doriti si clauza de Raspundere civila?",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_0_9",
        kind: "radio" as const,
        label: "0.9 Doriti si riscuri suplimentare?",
        hint: "Dacă alegeți DA, detaliați în chestionarul specific.",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
    ],
  },
  {
    id: "brokerage",
    title:
      "3. Informarea/Consimtamantul privind furnizarea de servicii de brokeraj in asigurari, servicii de intermediere produse financiare si protectia datelor personale",
    items: [
      {
        id: "broker_1_1",
        kind: "radio" as const,
        label:
          "1.1 Sunt de acord cu furnizarea de servicii de brokeraj în asigurări și servicii de intermediere în produse financiare.",
        options: [
          { value: "da", label: "Da" },
          { value: "nu", label: "Nu" },
        ],
        required: true,
      },
      {
        id: "broker_1_2",
        kind: "radio" as const,
        label:
          "1.2 Sunt de acord să primesc comunicări comerciale (oferte, promoții) din partea intermediarului.",
        options: [
          { value: "da", label: "Da" },
          { value: "nu", label: "Nu" },
        ],
        required: true,
      },
      {
        id: "broker_1_3",
        kind: "radio" as const,
        label:
          "1.3 Sunt de acord cu prelucrarea datelor în scopul îndeplinirii obligațiilor legale și cerințelor autorităților din domeniul financiar.",
        options: [
          { value: "da", label: "Da" },
          { value: "nu", label: "Nu" },
        ],
        required: true,
      },
    ],
  },
] as const;

export type HouseAgreementAnswers = {
  comm_1_1: boolean;
  dnt_0_1: "DA" | "NU";
  dnt_0_2: "renew_same" | "single" | "multi";
  dnt_0_4: "proprietar" | "chirias";
  dnt_0_5: "apartament" | "casa";
  dnt_0_6: "DA" | "NU";
  dnt_0_7: "DA" | "NU";
  dnt_0_8: "DA" | "NU";
  dnt_0_9: "DA" | "NU";
  broker_1_1: "da" | "nu";
  broker_1_2: "da" | "nu";
  broker_1_3: "da" | "nu";
};

export const HOUSE_AGREEMENTS_DEFAULTS: HouseAgreementAnswers = {
  comm_1_1: true,
  dnt_0_1: "DA",
  dnt_0_2: "multi",
  dnt_0_4: "proprietar",
  dnt_0_5: "apartament",
  dnt_0_6: "NU",
  dnt_0_7: "DA",
  dnt_0_8: "NU",
  dnt_0_9: "NU",
  broker_1_1: "da",
  broker_1_2: "nu",
  broker_1_3: "da",
};
