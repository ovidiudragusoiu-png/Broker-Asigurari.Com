export interface PresentedOfferError {
  /** User-facing Romanian message. */
  display: string;
  /** Raw insurer/API text when it was hidden or rewritten. */
  technical?: string;
}

export const GENERIC_UNAVAILABLE_OFFER_MESSAGE =
  "Acest asigurător nu poate emite ofertă pentru datele introduse. Încercați alt asigurător sau modificați detaliile locuinței.";

interface KnownOfferErrorPattern {
  test: RegExp;
  message: string;
}

/** Extend incrementally when a raw message is confirmed in production. */
const KNOWN_OFFER_ERROR_PATTERNS: KnownOfferErrorPattern[] = [
  {
    test: /household:.*only real value insurance sum option is available/i,
    message:
      "Acest produs acceptă doar asigurare la valoare reală pentru combinația de date introdusă.",
  },
  {
    test: /sumaasiguratacontinut nu corespunde/i,
    message:
      "Suma asigurată pentru conținut nu respectă regulile produsului (de obicei circa 10% din suma clădirii).",
  },
  {
    test: /floorsinbuildinginvalid|numar.*etaje/i,
    message:
      "Numărul de etaje introdus nu este acceptat de acest produs. Pentru casă la parter, încercați valoarea 1.",
  },
  {
    test: /tipstructura|tip structura/i,
    message: "Structura clădirii selectată nu este acceptată de acest produs.",
  },
];

const TECHNICAL_ERROR_MARKERS =
  /element is invalid|datatype|enumeration constraint|offerdetails[a-z]|\.insuredgood|building_structure|'[a-z_]+' element/i;

const ROMANIAN_HINT =
  /[ăâîșțĂÂÎȘȚ]|(\b)(nu se|pentru|acest|acesta|produs|asigur|cladire|clădire|structur|valoare)(\b)/i;

export function isTechnicalOfferError(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (trimmed.length > 160) return true;
  return TECHNICAL_ERROR_MARKERS.test(trimmed);
}

export function isUserFriendlyRomanianOfferError(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || isTechnicalOfferError(trimmed)) return false;
  return ROMANIAN_HINT.test(trimmed);
}

export function matchKnownOfferErrorPattern(rawMessage: string): string | undefined {
  for (const { test, message: friendlyMessage } of KNOWN_OFFER_ERROR_PATTERNS) {
    if (test.test(rawMessage)) return friendlyMessage;
  }
  return undefined;
}

export function presentUnavailableOfferError(
  rawMessage: string | undefined,
  options?: { vendorName?: string }
): PresentedOfferError {
  const trimmed = rawMessage?.trim();
  if (!trimmed) {
    return { display: GENERIC_UNAVAILABLE_OFFER_MESSAGE };
  }

  const known = matchKnownOfferErrorPattern(trimmed);
  if (known) {
    return known === trimmed
      ? { display: known }
      : { display: known, technical: trimmed };
  }

  if (isUserFriendlyRomanianOfferError(trimmed)) {
    return { display: trimmed };
  }

  if (isTechnicalOfferError(trimmed) || !ROMANIAN_HINT.test(trimmed)) {
    return { display: GENERIC_UNAVAILABLE_OFFER_MESSAGE, technical: trimmed };
  }

  return { display: trimmed };
}

export function vendorUnavailableOfferLabel(vendorName?: string): string {
  const vendor = vendorName?.trim();
  if (!vendor) return GENERIC_UNAVAILABLE_OFFER_MESSAGE;
  return `${vendor} nu poate emite ofertă pentru datele introduse.`;
}
