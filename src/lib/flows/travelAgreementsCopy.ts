/** Static „Acorduri necesare” copy for Travel — per approved UI (not InsureTech labels). */

export const TRAVEL_AGREEMENTS_TITLE = "Acorduri necesare";

export const TRAVEL_AGREEMENTS_SECTIONS = [
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
        hint:
          "Refuzul furnizării informațiilor împiedică intermediarul să evalueze dacă produsul de asigurare corespunde cerințelor și necesităților dumneavoastră.",
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
          "0.4 DETALII SUPLIMENTARE SPECIFICE ASIGURĂRII PRIVIND ASISTENȚA ȘI CHELTUIELILE MEDICALE ÎN STRĂINĂTATE (TRAVEL / STORNO): Calitatea dvs.:",
        options: [
          { value: "asigurat", label: "Asigurat" },
          { value: "contractant", label: "Contractant" },
        ],
        required: true,
      },
      {
        id: "dnt_0_5",
        kind: "radio" as const,
        label: "0.5 Călătoriți în:",
        options: [
          { value: "europe", label: "Europa" },
          {
            value: "excl_usa",
            label: "Toate țările, cu excepția SUA, Canada și Israel",
          },
          { value: "usa", label: "SUA, Canada și Israel" },
          { value: "romania", label: "România" },
        ],
        required: true,
      },
      {
        id: "dnt_0_6",
        kind: "radio" as const,
        label: "0.6 Sunteți interesat de acoperirea Storno?",
        options: [
          { value: "DA", label: "DA" },
          { value: "NU", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_0_7",
        kind: "checkboxes" as const,
        label: "0.7 Sunteți interesat de următoarele acoperiri / riscuri suplimentare?",
        options: [
          { value: "baggage", label: "Pierdere / furt bagaje" },
          { value: "sports", label: "Sporturi extreme" },
          { value: "none", label: "Nu sunt interesat" },
        ],
        required: false,
      },
      {
        id: "dnt_0_8",
        kind: "checkboxes" as const,
        label: "0.8 Călătoriți cu:",
        options: [
          { value: "plane", label: "Avion" },
          { value: "car", label: "Autoturism" },
          { value: "other", label: "Alt mijloc de transport" },
        ],
        required: false,
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

export type TravelAgreementAnswers = {
  comm_1_1: boolean;
  dnt_0_1: "DA" | "NU";
  dnt_0_2: "renew_same" | "single" | "multi";
  dnt_0_4: "asigurat" | "contractant";
  dnt_0_5: "europe" | "excl_usa" | "usa" | "romania";
  dnt_0_6: "DA" | "NU";
  dnt_0_7_baggage: boolean;
  dnt_0_7_sports: boolean;
  dnt_0_7_none: boolean;
  dnt_0_8_plane: boolean;
  dnt_0_8_car: boolean;
  dnt_0_8_other: boolean;
  broker_1_1: "da" | "nu";
  broker_1_2: "da" | "nu";
  broker_1_3: "da" | "nu";
};

export const TRAVEL_AGREEMENTS_DEFAULTS: TravelAgreementAnswers = {
  comm_1_1: true,
  dnt_0_1: "DA",
  dnt_0_2: "multi",
  dnt_0_4: "asigurat",
  dnt_0_5: "europe",
  dnt_0_6: "NU",
  dnt_0_7_baggage: false,
  dnt_0_7_sports: false,
  dnt_0_7_none: true,
  dnt_0_8_plane: true,
  dnt_0_8_car: false,
  dnt_0_8_other: false,
  broker_1_1: "da",
  broker_1_2: "nu",
  broker_1_3: "da",
};
