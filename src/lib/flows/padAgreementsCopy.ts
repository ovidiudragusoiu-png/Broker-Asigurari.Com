/** Static „Acorduri necesare” copy for PAD — per approved UI (not InsureTech labels). */

export const PAD_AGREEMENTS_TITLE = "Acorduri necesare";

export const PAD_AGREEMENTS_SECTIONS = [
  {
    id: "communication",
    title: "1. Comunicare",
    items: [
      {
        id: "comm_1_1",
        kind: "checkbox" as const,
        label:
          "1.1 Sunt de acord cu stabilirea unui canal de comunicare (e-mail, telefon, corespondență) pentru transmiterea de informații privind contractele de asigurare (prime, oferte, expirări etc.).",
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
        label: "0.6 Tip structura:",
        options: [
          {
            value: "tip_a",
            label:
              "Tip A — beton armat, metal, lemn, piatră, cărămidă arsă sau material similar",
          },
          {
            value: "tip_b",
            label:
              "Tip B — cărămidă nearsă sau orice alte materiale, inclusiv materiale ne-tratate termic",
          },
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

export type PadAgreementAnswers = {
  comm_1_1: boolean;
  dnt_0_1: "DA" | "NU";
  dnt_0_2: "renew_same" | "single" | "multi";
  dnt_0_4: "proprietar" | "chirias";
  dnt_0_5: "apartament" | "casa";
  dnt_0_6: "tip_a" | "tip_b";
  broker_1_1: "da" | "nu";
  broker_1_2: "da" | "nu";
  broker_1_3: "da" | "nu";
};

export const PAD_AGREEMENTS_DEFAULTS: PadAgreementAnswers = {
  comm_1_1: true,
  dnt_0_1: "DA",
  dnt_0_2: "multi",
  dnt_0_4: "proprietar",
  dnt_0_5: "apartament",
  dnt_0_6: "tip_a",
  broker_1_1: "da",
  broker_1_2: "nu",
  broker_1_3: "da",
};
