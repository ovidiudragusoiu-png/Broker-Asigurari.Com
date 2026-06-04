import { api } from "@/lib/api/client";
import type { MalpraxisOfferDetailsInput, MalpraxisMoralDamagesSelection, MalpraxisSpecificDetail } from "./malpraxisOfferPayload";
import {
  buildAbcComparatorSpecificDetails,
  buildMalpraxisBodiesPayload,
  buildMalpraxisComparatorPayload,
  buildMalpraxisEligibilityPayload,
  buildMalpraxisOfferDetailsForProduct,
  MALPRAXIS_NUMERIC_ONLY_PRODUCT_CODES,
  MALPRAXIS_PERCENT_ONLY_PRODUCT_CODES,
  parseMalpraxisMoralDamagesSelection,
} from "./malpraxisOfferPayload";

export type MalpraxisInsurerAdjustableField = "retroactive" | "moralPercent" | "moralCustom";

/** Default fixed moral-damage amount (5% of 37_000 EUR) for numeric-only insurers. */
export const MALPRAXIS_DEFAULT_CUSTOM_MORAL_AMOUNT = "1850";

function isPercentOnlyProduct(code: string): boolean {
  return MALPRAXIS_PERCENT_ONLY_PRODUCT_CODES.has(code.trim().toUpperCase());
}

function isNumericOnlyProduct(code: string): boolean {
  return MALPRAXIS_NUMERIC_ONLY_PRODUCT_CODES.has(code.trim().toUpperCase());
}

const RETROACTIVE_HINT_PRODUCT_CODES = new Set([
  "GARANTA_MALPRAXIS",
  "UNIQA_MALPRAXIS",
  "SIGNAL_IDUNA_MALPRAXIS",
]);

export interface MalpraxisInsurerOverride {
  moralDamagesLimit: string;
  customMoralDamagesLimit: string;
  retroactivePeriod: string;
}

export interface MalpraxisGlobalFormSlice {
  moralDamagesLimit: string;
  customMoralDamagesLimit: string;
  retroactivePeriod: string;
  generalLimit: string;
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

/** User-facing hint on retry cards (replaces raw API text where possible). */
export function getInsurerRetryHintMessage(productCode: string, rawMessage: string): string {
  const code = productCode.trim().toUpperCase();
  const normalized = normalizeMessage(rawMessage);

  if (
    code === "GARANTA_MALPRAXIS" ||
    (/garanta|anterioritate|reinnoire|competenta/.test(normalized) &&
      /calculul|realizat/.test(normalized))
  ) {
    return "Dacă polița nu este reînnoire, Garanta nu se poate acorda retroactivitate. Alegeți Fără pentru a obține o ofertă.";
  }

  if (code === "UNIQA_MALPRAXIS" || (/uniqa/.test(normalized) && /retroactiv/.test(normalized))) {
    return "Produsul Uniqa nu acceptă perioada retroactivă selectată. Alegeți Fără pentru a primi o ofertă.";
  }

  if (
    code === "SIGNAL_IDUNA_MALPRAXIS" ||
    (/signal/.test(normalized) && /retroactiv/.test(normalized))
  ) {
    return "Alegeți Fără perioada retroactivă și apăsați Obține ofertă.";
  }

  if (/registeredcompensationclaims/.test(normalized)) {
    return "Eroare tehnică la transmiterea datelor către ABC. În pasul Detalii, setați Fără la daune morale și confirmați cele două întrebări despre răspundere civilă profesională anterioară, apoi reîncercați.";
  }

  if (/corpul ofertei|nu am primit/.test(normalized)) {
    return "Serverul nu a returnat datele ofertei (posibil indisponibil în mediul de test). Încercați din nou sau folosiți altă configurație.";
  }

  if (/accepta doar procent/.test(normalized) || (isPercentOnlyProduct(code) && /valoare numerica/.test(normalized))) {
    return "Acest produs acceptă doar procent la daune morale. Alegeți Fără sau un procent acceptat, nu sumă fixă.";
  }

  if (/nu accepta procent/.test(normalized)) {
    if (isNumericOnlyProduct(code)) {
      return "Completați o sumă fixă pentru a obține o ofertă.";
    }
    if (isPercentOnlyProduct(code)) {
      return "Procentul selectat nu este acceptat de acest asigurător. Încercați Fără sau alt procent.";
    }
    return "Procentul selectat nu este acceptat. Încercați Fără sau o sumă fixă, după tipul produsului.";
  }

  if (isNumericOnlyProduct(code) && /valoare numerica|daune morale/.test(normalized)) {
    return "Completați o sumă fixă pentru a obține o ofertă.";
  }

  if (/retroactiv|anterioritate/.test(normalized)) {
    return "Alegeți Fără perioada retroactivă și apăsați Obține ofertă.";
  }

  return rawMessage.trim() || "Ajustați setările de mai jos și apăsați Obține ofertă.";
}

/** Which fields the user can tweak for this insurer. */
export function inferInsurerAdjustmentFields(
  productCode: string,
  message: string
): MalpraxisInsurerAdjustableField[] {
  const code = productCode.trim().toUpperCase();
  const normalized = normalizeMessage(message);
  const fields: MalpraxisInsurerAdjustableField[] = [];

  if (/registeredcompensationclaims/.test(normalized)) {
    return isPercentOnlyProduct(code) ? ["moralPercent"] : ["moralCustom"];
  }

  if (/corpul ofertei|nu am primit/.test(normalized)) {
    if (isPercentOnlyProduct(code)) {
      return ["moralPercent"];
    }
    if (isNumericOnlyProduct(code)) {
      return ["moralCustom"];
    }
    return ["moralPercent", "retroactive"];
  }

  if (isNumericOnlyProduct(code)) {
    return ["moralCustom"];
  }

  if (RETROACTIVE_HINT_PRODUCT_CODES.has(code)) {
    if (/retroactiv|anterioritate|reinnoire|competenta|calculul/.test(normalized)) {
      return ["retroactive"];
    }
  }

  if (/accepta doar procent/.test(normalized) || (isPercentOnlyProduct(code) && /valoare numerica/.test(normalized))) {
    return ["moralPercent"];
  }

  if (/nu accepta procent/.test(normalized)) {
    return isNumericOnlyProduct(code) ? ["moralCustom"] : ["moralPercent"];
  }

  if (/retroactiv|anterioritate|reinnoire/.test(normalized)) {
    fields.push("retroactive");
  }
  if (/valoare numerica/.test(normalized)) {
    fields.push("moralCustom");
  }
  if (fields.length === 0 && /moral|daune morale|configuratia/.test(normalized)) {
    fields.push("moralPercent", "moralCustom", "retroactive");
  }
  if (fields.length === 0) {
    if (isPercentOnlyProduct(code)) {
      return ["moralPercent"];
    }
    if (isNumericOnlyProduct(code)) {
      return ["moralCustom"];
    }
    fields.push("retroactive", "moralPercent");
  }

  return fields;
}

/** Suggested per-insurer tweaks (does not change global form). */
export function suggestInsurerOverride(
  productCode: string,
  message: string,
  global: MalpraxisGlobalFormSlice
): Partial<MalpraxisInsurerOverride> {
  const fields = inferInsurerAdjustmentFields(productCode, message);
  const suggested: Partial<MalpraxisInsurerOverride> = {};

  if (fields.includes("retroactive")) {
    suggested.retroactivePeriod = "0";
  }

  if (fields.includes("moralCustom")) {
    suggested.moralDamagesLimit = "0";
    suggested.customMoralDamagesLimit = "";
  }

  if (fields.includes("moralPercent")) {
    suggested.customMoralDamagesLimit = "";
    if (/nu accepta procent/.test(normalizeMessage(message)) && isPercentOnlyProduct(productCode)) {
      suggested.moralDamagesLimit = "0";
    } else if (!global.moralDamagesLimit || global.moralDamagesLimit === "0") {
      suggested.moralDamagesLimit = "5";
    }
  }

  return suggested;
}

export function resolveInsurerOverride(
  global: MalpraxisGlobalFormSlice,
  productCode: string,
  message: string,
  stored?: Partial<MalpraxisInsurerOverride>
): MalpraxisInsurerOverride {
  const suggested = suggestInsurerOverride(productCode, message, global);
  const fields = inferInsurerAdjustmentFields(productCode, message);
  const useEmptyCustomDefault = fields.includes("moralCustom") && !stored?.customMoralDamagesLimit;

  return {
    moralDamagesLimit: stored?.moralDamagesLimit ?? suggested.moralDamagesLimit ?? global.moralDamagesLimit,
    customMoralDamagesLimit: stored?.customMoralDamagesLimit ??
      suggested.customMoralDamagesLimit ??
      (useEmptyCustomDefault ? "" : global.customMoralDamagesLimit),
    retroactivePeriod:
      stored?.retroactivePeriod ?? suggested.retroactivePeriod ?? global.retroactivePeriod,
  };
}

export function mergeInsurerOverrideIntoInput(
  base: MalpraxisOfferDetailsInput,
  override: MalpraxisInsurerOverride
): MalpraxisOfferDetailsInput {
  return {
    ...base,
    moralDamagesLimit: override.moralDamagesLimit,
    customMoralDamagesLimit: override.customMoralDamagesLimit,
    retroactivePeriod: override.retroactivePeriod,
  };
}

export interface FetchMalpraxisInsurerOfferParams {
  orderId: number;
  orderHash: string;
  productId: number;
  productCode: string;
  clientId: number;
  policyStartDate: string;
  policyEndDate: string;
  formInput: MalpraxisOfferDetailsInput;
  specificDetails: MalpraxisSpecificDetail[];
  traceHeaders?: Record<string, string>;
}

export interface FetchMalpraxisInsurerOfferResult {
  isEligible: boolean;
  eligibilityReason?: string | null;
  offer?: Record<string, unknown>;
  errorMessage?: string;
}

export async function fetchMalpraxisInsurerOffer(
  params: FetchMalpraxisInsurerOfferParams
): Promise<FetchMalpraxisInsurerOfferResult> {
  const {
    orderId,
    orderHash,
    productId,
    productCode,
    clientId,
    policyStartDate,
    policyEndDate,
    formInput,
    specificDetails,
    traceHeaders,
  } = params;

  const offerDetails = buildMalpraxisOfferDetailsForProduct(
    productCode,
    formInput,
    parseMalpraxisMoralDamagesSelection({
      moralDamagesLimit: String(formInput.moralDamagesLimit ?? "0"),
      customMoralDamagesLimit: String(formInput.customMoralDamagesLimit ?? ""),
      generalLimit: String(formInput.generalLimit ?? ""),
    })
  );
  const moralDamagesSelection = parseMalpraxisMoralDamagesSelection({
    moralDamagesLimit: String(formInput.moralDamagesLimit ?? "0"),
    customMoralDamagesLimit: String(formInput.customMoralDamagesLimit ?? ""),
    generalLimit: String(formInput.generalLimit ?? ""),
  });

  const eligibilityPath = "/online/offers/malpraxis/comparator/products/eligible";
  let eligibility: { productId: number; isEligible: boolean; reason: string | null }[] = [];
  try {
    eligibility = await api.post(
      eligibilityPath,
      buildMalpraxisEligibilityPayload({
        clientId,
        productIds: [String(productId)],
        policyStartDate,
        policyEndDate,
        offerDetails,
      }),
      traceHeaders
    );
  } catch (err) {
    return {
      isEligible: false,
      errorMessage: err instanceof Error ? err.message : "Eroare la verificarea eligibilitatii",
    };
  }

  const row = eligibility.find((entry) => entry.productId === productId);
  if (!row?.isEligible) {
    return {
      isEligible: false,
      eligibilityReason: row?.reason ?? "Produsul nu este eligibil pentru configuratia selectata",
    };
  }

  const bodiesPath = "/online/offers/malpraxis/comparator/bodies/v3";
  let bodies: Record<string, unknown>[];
  try {
    bodies = await api.post(
      `${bodiesPath}?orderHash=${orderHash}`,
      buildMalpraxisBodiesPayload({
        orderId,
        productIds: [productId],
        policyStartDate,
        policyEndDate,
        offerDetails,
        specificDetails,
      }),
      traceHeaders
    );
  } catch (err) {
    return {
      isEligible: true,
      errorMessage: err instanceof Error ? err.message : "Eroare la pregatirea ofertei",
    };
  }

  const body = bodies.find((entry) => Number(entry.productId) === productId) ?? bodies[0];
  if (!body) {
    return {
      isEligible: true,
      errorMessage: "Nu am primit corpul ofertei de la server",
    };
  }

  const comparatorPath = "/online/offers/malpraxis/comparator/v3";
  const bodyForComparator: Record<string, unknown> = {
    ...body,
    productId,
    productCode,
  };
  let comparatorPayload = buildMalpraxisComparatorPayload(
    bodyForComparator,
    offerDetails,
    specificDetails,
    { moralDamagesSelection }
  );

  if (productCode === "ABC_MALPRAXIS") {
    comparatorPayload = {
      ...comparatorPayload,
      productCode: "ABC_MALPRAXIS",
      productId,
      specificDetails: buildAbcComparatorSpecificDetails(
        body.specificDetails,
        specificDetails
      ),
    };
  }

  try {
    const result = await api.post<Record<string, unknown>[]>(
      `${comparatorPath}?orderHash=${orderHash}`,
      comparatorPayload,
      traceHeaders
    );
    const offer = (Array.isArray(result) ? result[0] : result) as Record<string, unknown>;
    if (offer?.error) {
      return {
        isEligible: true,
        offer,
        errorMessage: String(offer.message || "Eroare generare oferta"),
      };
    }
    return { isEligible: true, offer };
  } catch (err) {
    return {
      isEligible: true,
      errorMessage: err instanceof Error ? err.message : "Eroare la generarea ofertei",
    };
  }
}
