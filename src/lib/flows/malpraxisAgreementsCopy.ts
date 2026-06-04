/** Static „Acorduri necesare” copy for Malpraxis — per approved UI (not InsureTech labels). */

export const MALPRAXIS_AGREEMENTS_TITLE = "Acorduri necesare";

export const MALPRAXIS_AGREEMENTS_SECTIONS = [
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
    id: "general",
    title: "2. Acord general",
    items: [
      {
        id: "general_stats",
        kind: "radio" as const,
        label:
          "Sunt de acord ca datele mele personale să fie prelucrate de Sigur.Ai pentru scopuri statistice.",
        options: [
          { value: "da", label: "DA" },
          { value: "nu", label: "NU" },
        ],
        required: true,
      },
    ],
  },
  {
    id: "brokerage",
    title:
      "3. Informarea/Consimțământul privind furnizarea de servicii de brokeraj în asigurări, servicii de intermediere produse financiare și protecția datelor personale",
    items: [
      {
        id: "broker_gdpr",
        kind: "radio" as const,
        label:
          "Sunt de acord cu prelucrarea de către Sigur.Ai a datelor mele cu caracter personal, inclusiv cele privind starea de sănătate dacă este cazul, indispensabile în vederea prestării serviciilor de intermediere în asigurări solicitate de mine, în administrarea polițelor mele de asigurare și pentru a interveni în sprijinul meu în relația cu societățile de asigurare în situațiile de producere a riscului asigurat, în acord cu legislația privind prelucrarea datelor cu caracter personal, legislația privind asigurările și codurile de conduită din industria de profil.",
        options: [
          { value: "da", label: "DA" },
          { value: "nu", label: "NU" },
        ],
        required: true,
      },
    ],
  },
  {
    id: "dnt",
    title: "4. DNT",
    items: [
      {
        id: "dnt_marketing",
        kind: "radio" as const,
        label:
          "Sunt de acord ca datele mele personale să fie prelucrate de Sigur.Ai pentru scopuri statistice și de marketing, să fiu contactat și să primesc informații relevante în vederea fructificării de eventuale oportunități de asigurare și a îmbunătățirii serviciilor oferite.",
        options: [
          { value: "da", label: "DA" },
          { value: "nu", label: "NU" },
        ],
        required: true,
      },
      {
        id: "dnt_minors",
        kind: "radio" as const,
        label:
          "Pentru prelucrarea datelor cu caracter personal privind minorii nominalizați ca (potențiali) asigurați/beneficiari, indispensabile în vederea prestării serviciilor de asigurare.",
        options: [
          { value: "da", label: "DA" },
          { value: "nu", label: "NU" },
          { value: "na", label: "NU se aplică" },
        ],
        required: true,
      },
      {
        id: "dnt_offer",
        kind: "radio" as const,
        label: "DORESC OFERTĂ:",
        options: [
          { value: "renew_same", label: "reînnoire poliță la același asigurător" },
          { value: "single", label: "de la un singur asigurător" },
          { value: "multi", label: "de la mai mulți asigurători" },
        ],
        required: true,
      },
    ],
  },
] as const;

export type MalpraxisAgreementAnswers = {
  comm_1_1: boolean;
  general_stats: "da" | "nu";
  broker_gdpr: "da" | "nu";
  dnt_marketing: "da" | "nu";
  dnt_minors: "da" | "nu" | "na";
  dnt_offer: "renew_same" | "single" | "multi";
};

export const MALPRAXIS_AGREEMENTS_DEFAULTS: MalpraxisAgreementAnswers = {
  comm_1_1: true,
  general_stats: "nu",
  broker_gdpr: "da",
  dnt_marketing: "nu",
  dnt_minors: "na",
  dnt_offer: "multi",
};
