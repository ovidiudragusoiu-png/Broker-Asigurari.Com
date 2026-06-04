/**
 * Normalizes Malpraxis comparator payloads to match Insuretech API V3 schemas.
 * @see docs/insuretech-malpraxis.txt — offerDetails and comparator request bodies
 */

export interface MalpraxisOfferDetailsInput {
  malpraxisProfessionId?: string | number | null;
  category?: string | null;
  categoryType?: string | null;
  generalLimit?: string | number | null;
  moralDamagesLimit?: string | number | null;
  customMoralDamagesLimit?: string | number | null;
  currency?: string | null;
  operatingAuthorizationType?: string | number | null;
  installmentsNo?: string | number | null;
  retroactivePeriod?: string | number | null;
}

export interface MalpraxisOfferDetailsPayload {
  malpraxisProfessionId: string;
  category: string;
  categoryType: string;
  generalLimit: string;
  moralDamagesLimit: number;
  customMoralDamagesLimit: number;
  currency: string;
  operatingAuthorizationType: number;
  installmentsNo: number;
  retroactivePeriod: string;
}

/**
 * Wire shape for comparator/v3 (verified against successful March 6, 2026 Garanta
 * traffic in .codex-logs/malpraxis-dev.log). The published docs claim string types
 * for profession/limit/retro and number for operatingAuthorizationType, but the
 * upstream Spring deserializer actually rejects that shape with
 * "Problem reading request body. Check request body is not empty or the format
 *  for date or numeric fields" (May 27, 2026 trace 7578cc04). Working March 6
 * traffic uses NUMBER for profession/generalLimit/retroactivePeriod and STRING
 * for operatingAuthorizationType.
 */
export interface MalpraxisComparatorOfferDetailsPayload {
  malpraxisProfessionId: number;
  category: string;
  categoryType: string;
  generalLimit: number;
  moralDamagesLimit: number;
  customMoralDamagesLimit: number | null;
  currency: string;
  operatingAuthorizationType: string;
  installmentsNo: number;
  retroactivePeriod: number;
}

/** productId → productCode for proxy normalization when client already stripped productCode */
const MALPRAXIS_PRODUCT_ID_TO_CODE: Record<number, string> = {
  1218: "GARANTA_MALPRAXIS",
  195: "EUROINS_MALPRAXIS",
  358: "SIGNAL_IDUNA_MALPRAXIS",
  1321: "OMNIASIG_MALPRAXIS_GENERAL",
  1323: "OMNIASIG_MALPRAXIS_PHARMACIST",
  1374: "ABC_MALPRAXIS",
  47: "ASIROM_MALPRAXIS",
  79: "UNIQA_MALPRAXIS",
};

export interface MalpraxisSpecificDetail {
  code: string;
  value: string;
}

export interface MalpraxisMoralDamagesSelection {
  /** Utils dropdown code/value (percentage); "0" means none / Fără */
  moralDamagesLimitCode: string;
  /** Free-text fixed amount in policy currency */
  customMoralDamagesLimit: string;
  generalLimit: string;
}

export type MalpraxisMoralDamagesMode = "percent" | "numeric" | "none";

/**
 * Fields that must not leak into bodies/v3 / eligibility wire bodies.
 *
 * NOTE (May 27, 2026): comparator/v3 KEEPS `productCode`, `saveError`, and
 * `agencyId` on the wire (March 6 working trace line 38 shows them present).
 * Only bodies/v3 + eligibility strip them.
 */
const BODIES_INTERNAL_KEYS = new Set(["saveError", "productCode", "agencyId"]);

/** Products that only accept moralDamagesLimit (percentage), not customMoralDamagesLimit */
export const MALPRAXIS_PERCENT_ONLY_PRODUCT_CODES = new Set([
  "GARANTA_MALPRAXIS",
  "ABC_MALPRAXIS",
  "OMNIASIG_MALPRAXIS_GENERAL",
  "OMNIASIG_MALPRAXIS_PHARMACIST",
  "UNIQA_MALPRAXIS",
]);

/** Products that require a numeric customMoralDamagesLimit instead of percentage */
export const MALPRAXIS_NUMERIC_ONLY_PRODUCT_CODES = new Set([
  "EUROINS_MALPRAXIS",
  "ASIROM_MALPRAXIS",
]);

const MORAL_SUBLIMIT_CODES = new Set([
  "SUBLIMIT_MORAL_DAMAGE_PER_EVENT",
  "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD",
]);

/** ABC utils (`vendorSpecificDetails`) boolean claim fields from comparator/utils. */
export const ABC_VENDOR_BOOLEAN_CLAIM_CODES = {
  knowledge: "KNOWLEDGE_COMPENSATION_CLAIMS",
  registered: "REGISTERED_COMPENSATION_CLAIMS",
} as const;

/** ABC comparator/v3 wire codes (bodies); required as DA/NU — maps to registeredCompensationClaimsObj. */
export const ABC_REQUIRED_CIVIL_LIABILITY_CODES = [
  "PRIOR_CIVIL_LIABILITY_DAMAGES",
  "PREVIOUS_CIVIL_LIABILITY",
] as const;

export interface MalpraxisVendorSpecificDetailMeta {
  code: string;
  name?: string;
  description?: string;
}

export interface MalpraxisVendorSpecificGroupMeta {
  productCode: string;
  details: MalpraxisVendorSpecificDetailMeta[];
}

/** Label from GET /online/offers/malpraxis/comparator/utils → vendorSpecificDetails. */
export function getMalpraxisVendorBooleanLabel(
  vendorGroups: MalpraxisVendorSpecificGroupMeta[],
  productCode: string,
  detailCode: string,
  fallback: string
): string {
  const group = vendorGroups.find((entry) => entry.productCode === productCode);
  const detail = group?.details.find((entry) => entry.code === detailCode);
  const label = detail?.name?.trim() || detail?.description?.trim();
  return label || fallback;
}

export function formatMalpraxisVendorBooleanQuestion(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
}

/** Utils booleans (true/false strings) + comparator DA/NU for ABC claim declarations. */
export function buildAbcClaimSpecificDetails(input: {
  knowledgeCompensationClaims: boolean;
  registeredCompensationClaims: boolean;
}): MalpraxisSpecificDetail[] {
  const knowledge = input.knowledgeCompensationClaims;
  const registered = input.registeredCompensationClaims;
  return [
    {
      code: ABC_VENDOR_BOOLEAN_CLAIM_CODES.knowledge,
      value: knowledge ? "true" : "false",
    },
    {
      code: ABC_VENDOR_BOOLEAN_CLAIM_CODES.registered,
      value: registered ? "true" : "false",
    },
    {
      code: "PREVIOUS_CIVIL_LIABILITY",
      value: knowledge ? "DA" : "NU",
    },
    {
      code: "PRIOR_CIVIL_LIABILITY_DAMAGES",
      value: registered ? "DA" : "NU",
    },
  ];
}

const ABC_REQUIRED_CIVIL_LIABILITY_CODE_SET = new Set<string>(
  ABC_REQUIRED_CIVIL_LIABILITY_CODES
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toOptionalString(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

export function resolveMalpraxisMoralDamagesMode(
  productCode: string
): MalpraxisMoralDamagesMode | null {
  const normalized = productCode.trim().toUpperCase();
  if (MALPRAXIS_PERCENT_ONLY_PRODUCT_CODES.has(normalized)) {
    return "percent";
  }
  if (MALPRAXIS_NUMERIC_ONLY_PRODUCT_CODES.has(normalized)) {
    return "numeric";
  }
  return null;
}

export function parseMalpraxisMoralDamagesSelection(
  input: MalpraxisOfferDetailsInput
): MalpraxisMoralDamagesSelection {
  return {
    moralDamagesLimitCode: toOptionalString(input.moralDamagesLimit),
    customMoralDamagesLimit: toOptionalString(input.customMoralDamagesLimit),
    generalLimit: toOptionalString(input.generalLimit),
  };
}

function derivePercentFromAmount(
  generalLimit: number,
  customAmount: number
): number {
  if (generalLimit <= 0 || customAmount <= 0) {
    return 0;
  }
  return Math.round((customAmount / generalLimit) * 100);
}

function deriveAmountFromPercent(
  generalLimit: number,
  percent: number
): number {
  if (generalLimit <= 0 || percent <= 0) {
    return 0;
  }
  return Math.round((generalLimit * percent) / 100);
}

/**
 * Maps UI selection to per-product offerDetails moral-damage fields.
 * Percent-only insurers get moralDamagesLimit + custom=0; numeric-only get custom + moral=0.
 */
export function adaptMalpraxisMoralDamagesForProduct(
  productCode: string,
  baseOfferDetails: MalpraxisOfferDetailsPayload,
  selection: MalpraxisMoralDamagesSelection
): Pick<
  MalpraxisOfferDetailsPayload,
  "moralDamagesLimit" | "customMoralDamagesLimit"
> {
  const generalLimit = toNumber(baseOfferDetails.generalLimit, 0);
  const percentCode = selection.moralDamagesLimitCode;
  const percent = percentCode === "" || percentCode === "0" ? 0 : toNumber(percentCode, 0);
  const customRaw = selection.customMoralDamagesLimit.trim();
  const customAmount =
    customRaw === "" ? 0 : toNumber(customRaw, 0);

  const mode = resolveMalpraxisMoralDamagesMode(productCode);
  const useCustomAmount =
    mode === "numeric" ||
    (mode !== "percent" && customAmount > 0 && percent <= 0);
  const usePercent =
    mode === "percent" ||
    (mode !== "numeric" && percent > 0 && customAmount <= 0);

  if (useCustomAmount) {
    const amount =
      customAmount > 0 ? customAmount : deriveAmountFromPercent(generalLimit, percent);
    return {
      moralDamagesLimit: 0,
      customMoralDamagesLimit: amount,
    };
  }

  if (usePercent) {
    const resolvedPercent =
      percent > 0
        ? percent
        : derivePercentFromAmount(generalLimit, customAmount);
    return {
      moralDamagesLimit: resolvedPercent,
      customMoralDamagesLimit: 0,
    };
  }

  return {
    moralDamagesLimit: 0,
    customMoralDamagesLimit: 0,
  };
}

/**
 * SUBLIMIT_MORAL_DAMAGE_* values for comparator/v3 specificDetails.
 *
 * All insurers receive the SUBLIMIT as a numeric **EUR amount** (string-encoded).
 * The amount is derived from `customMoralDamagesLimit` when provided, otherwise
 * computed as `percent × generalLimit / 100`. When no moral damage is requested
 * (percent=0 and custom=0), the amount is 0 → SUBLIMIT="0".
 *
 * Empirical justification:
 * - Verified against the only March 6 working Garanta comparator/v3 trace
 *   (.codex-logs/malpraxis-dev.log line 38 → policyPremium 12, error:false):
 *   moralDamagesLimit=0 paired with SUBLIMIT="0" (amount=0).
 * - The previous "sublimit=0 for percent-only insurers" rule regressed Uniqa
 *   (back to body-parse) per user-reported screenshot after the May 27 fix.
 *   No log evidence supports zeroing SUBLIMIT when moralDamagesLimit > 0.
 * - The May 27 wire trace 7578cc04 already sent derived amounts (1850 for 5%
 *   of 37000) to Asirom/Euroins/Signal_Iduna and the post-fix state confirms
 *   those reach business-level (not body-parse). Using the same derivation for
 *   percent-only insurers keeps the wire homogeneous and avoids per-insurer
 *   classification mistakes.
 *
 * @see MALPRAXIS_PERCENT_ONLY_PRODUCT_CODES — controls only offerDetails moral
 *   field placement (moralDamagesLimit vs customMoralDamagesLimit), NOT SUBLIMIT.
 */
export function buildMalpraxisMoralSublimitValues(
  _productCode: string,
  selection: MalpraxisMoralDamagesSelection,
  adapted: Pick<
    MalpraxisOfferDetailsPayload,
    "moralDamagesLimit" | "customMoralDamagesLimit"
  >
): { perEvent: string; perPeriod: string } {
  const generalLimit = toNumber(selection.generalLimit, 0);
  const selectionPercent =
    selection.moralDamagesLimitCode === "" || selection.moralDamagesLimitCode === "0"
      ? 0
      : toNumber(selection.moralDamagesLimitCode, 0);
  const selectionCustom = toNumber(selection.customMoralDamagesLimit, 0);
  const percent =
    adapted.moralDamagesLimit > 0 ? adapted.moralDamagesLimit : selectionPercent;
  const custom =
    adapted.customMoralDamagesLimit > 0
      ? adapted.customMoralDamagesLimit
      : selectionCustom;

  const amount =
    custom > 0 ? custom : deriveAmountFromPercent(generalLimit, percent);

  return { perEvent: String(amount), perPeriod: String(amount) };
}

export function normalizeMalpraxisVendorKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Maps vendor/product labels to Insuretech productCode for per-insurer moral-damage rules. */
export function inferMalpraxisProductCode(
  vendorName: string,
  productName: string
): string | null {
  const vendorKey = normalizeMalpraxisVendorKey(vendorName);
  const isPharmacistProduct = /farmac/i.test(productName);

  if (vendorKey === "omniasig") {
    return isPharmacistProduct
      ? "OMNIASIG_MALPRAXIS_PHARMACIST"
      : "OMNIASIG_MALPRAXIS_GENERAL";
  }

  const byVendor: Record<string, string> = {
    garanta: "GARANTA_MALPRAXIS",
    euroins: "EUROINS_MALPRAXIS",
    uniqa: "UNIQA_MALPRAXIS",
    asirom: "ASIROM_MALPRAXIS",
    abc: "ABC_MALPRAXIS",
  };

  return byVendor[vendorKey] ?? null;
}

export function inferMalpraxisProductCodeByProductId(
  productId: number
): string | null {
  if (!Number.isFinite(productId) || productId <= 0) {
    return null;
  }
  return MALPRAXIS_PRODUCT_ID_TO_CODE[productId] ?? null;
}

export function resolveMalpraxisProductCode(
  body: Record<string, unknown>
): string {
  // Prefer canonical mapping by productId — bodies/v3 often returns vendor-specific
  // productCode strings that skip ABC-specific comparator wiring (NPE on
  // registeredCompensationClaimsObj when PRIOR/PREVIOUS are omitted).
  const fromProductId = inferMalpraxisProductCodeByProductId(toNumber(body.productId));
  if (fromProductId) {
    return fromProductId;
  }
  return toOptionalString(body.productCode);
}

export function buildMalpraxisOfferDetailsForProduct(
  productCode: string,
  input: MalpraxisOfferDetailsInput,
  selection?: MalpraxisMoralDamagesSelection
): MalpraxisOfferDetailsPayload {
  const base = buildMalpraxisOfferDetails(input);
  const moralSelection = selection ?? parseMalpraxisMoralDamagesSelection(input);
  return {
    ...base,
    ...adaptMalpraxisMoralDamagesForProduct(productCode, base, moralSelection),
  };
}

export interface MalpraxisEligibilityBatch {
  productIds: string[];
  offerDetails: MalpraxisOfferDetailsPayload;
}

/**
 * Groups products for eligibility checks so each batch uses offerDetails
 * matching that insurer's percent vs numeric moral-damage mode.
 */
export function groupMalpraxisEligibilityBatches(
  items: { productId: number; productCode: string | null }[],
  input: MalpraxisOfferDetailsInput,
  selection: MalpraxisMoralDamagesSelection
): MalpraxisEligibilityBatch[] {
  const base = buildMalpraxisOfferDetails(input);
  const groups = new Map<string, { productIds: string[]; offerDetails: MalpraxisOfferDetailsPayload }>();

  for (const item of items) {
    const productId = String(item.productId);
    const offerDetails =
      item.productCode != null
        ? buildMalpraxisOfferDetailsForProduct(item.productCode, input, selection)
        : base;
    const key = `${offerDetails.moralDamagesLimit}:${offerDetails.customMoralDamagesLimit}`;

    const existing = groups.get(key);
    if (existing) {
      existing.productIds.push(productId);
    } else {
      groups.set(key, { productIds: [productId], offerDetails });
    }
  }

  return Array.from(groups.values());
}

export function buildMalpraxisOfferDetails(
  input: MalpraxisOfferDetailsInput
): MalpraxisOfferDetailsPayload {
  const customRaw = input.customMoralDamagesLimit;
  const customMoralDamagesLimit =
    customRaw == null || customRaw === ""
      ? 0
      : toNumber(customRaw, 0);

  return {
    malpraxisProfessionId: toOptionalString(input.malpraxisProfessionId),
    category: toOptionalString(input.category),
    categoryType: toOptionalString(input.categoryType),
    generalLimit: toOptionalString(input.generalLimit),
    moralDamagesLimit: toNumber(input.moralDamagesLimit, 0),
    customMoralDamagesLimit,
    currency: toOptionalString(input.currency) || "EUR",
    operatingAuthorizationType: toNumber(input.operatingAuthorizationType, 0),
    installmentsNo: Math.max(1, toNumber(input.installmentsNo, 1)),
    retroactivePeriod: toOptionalString(input.retroactivePeriod),
  };
}

/**
 * Final wire shape for comparator/v3 (and bodies/v3 / eligibility, which use the
 * same offerDetails wire format per March 6 working traffic). Numeric fields are
 * coerced to numbers, `operatingAuthorizationType` is kept as a string, and
 * `customMoralDamagesLimit` is `null` when zero/empty (matches successful
 * March 6 Garanta request `customMoralDamagesLimit: null`).
 */
export function finalizeMalpraxisComparatorOfferDetails(
  offerDetails: Record<string, unknown>
): MalpraxisComparatorOfferDetailsPayload {
  const customRaw = offerDetails.customMoralDamagesLimit;
  const customMoralDamagesLimit =
    customRaw == null || customRaw === "" || toNumber(customRaw, 0) === 0
      ? null
      : toNumber(customRaw, 0);

  const rawAuth = offerDetails.operatingAuthorizationType;
  const operatingAuthorizationType =
    rawAuth == null || rawAuth === "" ? "0" : String(rawAuth).trim();

  // Field order matches the verified March 6 bodies/v3 response (which is then
  // sent verbatim by comparator/v3 successful flows in .codex-logs/malpraxis-dev.log
  // line 36 → 38 / line 93 → 95). Spring Boot/Jackson does not require a specific
  // order, but we match exactly to remove a degree of freedom while debugging.
  return {
    malpraxisProfessionId: toNumber(offerDetails.malpraxisProfessionId, 0),
    category: toOptionalString(offerDetails.category),
    categoryType: toOptionalString(offerDetails.categoryType),
    generalLimit: toNumber(offerDetails.generalLimit, 0),
    moralDamagesLimit: toNumber(offerDetails.moralDamagesLimit, 0),
    customMoralDamagesLimit,
    retroactivePeriod: toNumber(offerDetails.retroactivePeriod, 0),
    currency: toOptionalString(offerDetails.currency) || "EUR",
    operatingAuthorizationType,
    installmentsNo: Math.max(1, toNumber(offerDetails.installmentsNo, 1)),
  };
}

function isMalpraxisOfferDetailsPayload(
  input: MalpraxisOfferDetailsInput | MalpraxisOfferDetailsPayload
): input is MalpraxisOfferDetailsPayload {
  return (
    typeof input.malpraxisProfessionId === "string" &&
    typeof input.generalLimit === "string"
  );
}

export function buildMalpraxisComparatorOfferDetails(
  input: MalpraxisOfferDetailsInput | MalpraxisOfferDetailsPayload
): MalpraxisComparatorOfferDetailsPayload {
  const offerDetails: Record<string, unknown> = isMalpraxisOfferDetailsPayload(input)
    ? { ...input }
    : { ...buildMalpraxisOfferDetails(input) };
  return finalizeMalpraxisComparatorOfferDetails(offerDetails);
}

function applyMoralSublimitRewrite(
  details: MalpraxisSpecificDetail[],
  moralSublimits: { perEvent: string; perPeriod: string } | null
): MalpraxisSpecificDetail[] {
  if (!moralSublimits) {
    return details;
  }
  return details.map((detail) => {
    if (!MORAL_SUBLIMIT_CODES.has(detail.code)) {
      return detail;
    }
    return {
      code: detail.code,
      value:
        detail.code === "SUBLIMIT_MORAL_DAMAGE_PER_EVENT"
          ? moralSublimits.perEvent
          : moralSublimits.perPeriod,
    };
  });
}

/** Patch only moral-damage fields; coerce the rest from bodies/v3 offerDetails. */
function patchOfferDetailsMoralFields(
  bodyOfferDetails: Record<string, unknown>,
  productCode: string,
  moralSelection: MalpraxisMoralDamagesSelection
): MalpraxisComparatorOfferDetailsPayload {
  const patched: Record<string, unknown> = { ...bodyOfferDetails };

  if (productCode) {
    const adapted = adaptMalpraxisMoralDamagesForProduct(
      productCode,
      buildMalpraxisOfferDetails(bodyOfferDetails),
      moralSelection
    );
    patched.moralDamagesLimit = adapted.moralDamagesLimit;
    patched.customMoralDamagesLimit =
      adapted.customMoralDamagesLimit > 0 ? adapted.customMoralDamagesLimit : null;
  }

  return finalizeMalpraxisComparatorOfferDetails(patched);
}

/**
 * comparator/v3 offerDetails: bodies/v3 shape + per-product moral field patch only.
 */
export function prepareComparatorOfferDetailsFromBody(
  bodyOfferDetails: Record<string, unknown>,
  productCode: string,
  moralSelection: MalpraxisMoralDamagesSelection
): MalpraxisComparatorOfferDetailsPayload {
  return patchOfferDetailsMoralFields(bodyOfferDetails, productCode, moralSelection);
}

function coerceAbcCivilLiabilityValue(value: unknown): string | null {
  if (value === true) {
    return "DA";
  }
  if (value === false) {
    return "NU";
  }
  if (value == null || value === "") {
    return null;
  }
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "DA" || normalized === "NU") {
    return normalized;
  }
  return null;
}

function coerceAbcBooleanClaimValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "da" || normalized === "1";
}

export function isAbcMalpraxisProduct(productCode: string, productId?: number): boolean {
  if (productCode.trim().toUpperCase() === "ABC_MALPRAXIS") {
    return true;
  }
  if (productId != null && inferMalpraxisProductCodeByProductId(productId) === "ABC_MALPRAXIS") {
    return true;
  }
  return false;
}

/** Resolve ABC claim flags from bodies/v3 + client (utils booleans and DA/NU wire codes). */
export function resolveAbcClaimFlags(
  bodySpecificDetails: unknown,
  clientSpecificDetails: MalpraxisSpecificDetail[] = []
): { knowledgeCompensationClaims: boolean; registeredCompensationClaims: boolean } {
  const clientByCode = new Map(
    clientSpecificDetails.map((detail) => [detail.code, detail.value])
  );
  const fromBodiesCivil = new Map<string, string>();
  const fromBodiesBool = new Map<string, boolean>();

  if (Array.isArray(bodySpecificDetails)) {
    for (const entry of bodySpecificDetails) {
      if (!isPlainObject(entry)) {
        continue;
      }
      const code = toOptionalString(entry.code);
      if (ABC_REQUIRED_CIVIL_LIABILITY_CODE_SET.has(code)) {
        const coerced = coerceAbcCivilLiabilityValue(entry.value);
        if (coerced) {
          fromBodiesCivil.set(code, coerced);
        }
      }
      if (
        code === ABC_VENDOR_BOOLEAN_CLAIM_CODES.knowledge ||
        code === ABC_VENDOR_BOOLEAN_CLAIM_CODES.registered
      ) {
        fromBodiesBool.set(code, coerceAbcBooleanClaimValue(entry.value));
      }
    }
  }

  const previousClient = coerceAbcCivilLiabilityValue(
    clientByCode.get("PREVIOUS_CIVIL_LIABILITY")
  );
  const priorClient = coerceAbcCivilLiabilityValue(
    clientByCode.get("PRIOR_CIVIL_LIABILITY_DAMAGES")
  );

  const knowledge = clientByCode.has(ABC_VENDOR_BOOLEAN_CLAIM_CODES.knowledge)
    ? coerceAbcBooleanClaimValue(clientByCode.get(ABC_VENDOR_BOOLEAN_CLAIM_CODES.knowledge))
    : previousClient != null
      ? previousClient === "DA"
      : (fromBodiesBool.get(ABC_VENDOR_BOOLEAN_CLAIM_CODES.knowledge) ??
        fromBodiesCivil.get("PREVIOUS_CIVIL_LIABILITY") === "DA");

  const registered = clientByCode.has(ABC_VENDOR_BOOLEAN_CLAIM_CODES.registered)
    ? coerceAbcBooleanClaimValue(clientByCode.get(ABC_VENDOR_BOOLEAN_CLAIM_CODES.registered))
    : priorClient != null
      ? priorClient === "DA"
      : (fromBodiesBool.get(ABC_VENDOR_BOOLEAN_CLAIM_CODES.registered) ??
        fromBodiesCivil.get("PRIOR_CIVIL_LIABILITY_DAMAGES") === "DA");

  return { knowledgeCompensationClaims: knowledge, registeredCompensationClaims: registered };
}

/** ABC comparator: utils booleans and DA/NU wire codes for registeredCompensationClaimsObj. */
export function buildAbcComparatorSpecificDetails(
  bodySpecificDetails: unknown,
  clientSpecificDetails: MalpraxisSpecificDetail[] = []
): MalpraxisSpecificDetail[] {
  return buildAbcClaimSpecificDetails(
    resolveAbcClaimFlags(bodySpecificDetails, clientSpecificDetails)
  );
}

/**
 * specificDetails for comparator/v3: passthrough from bodies/v3 only.
 *
 * March 6 success (trace 75aa9fc3, Garanta policyPremium 37): bodies returned
 * `specificDetails: []` and comparator forwarded `[]` — never the client UI
 * template. May 27 body-parse (trace 9767b85c) injected six client fields when
 * bodies returned `[]`.
 *
 * Exception: ABC_MALPRAXIS always needs PRIOR/PREVIOUS civil liability as "DA"/"NU"
 * strings; bodies often returns booleans/nulls only (would otherwise yield [] and
 * NPE registeredCompensationClaimsObj on the server).
 */
function prepareBodiesSpecificDetailsForWire(
  bodySpecificDetails: unknown,
  offerDetails: MalpraxisComparatorOfferDetailsPayload,
  productCode: string,
  moralSelection: MalpraxisMoralDamagesSelection,
  clientSpecificDetails: MalpraxisSpecificDetail[] = []
): MalpraxisSpecificDetail[] {
  if (isAbcMalpraxisProduct(productCode)) {
    return buildAbcComparatorSpecificDetails(bodySpecificDetails, clientSpecificDetails);
  }

  if (!Array.isArray(bodySpecificDetails) || bodySpecificDetails.length === 0) {
    return [];
  }

  const hasWireSafeValue = bodySpecificDetails.some((entry) => {
    if (!isPlainObject(entry)) {
      return false;
    }
    const rawValue = entry.value;
    return rawValue != null && typeof rawValue !== "boolean" && rawValue !== "";
  });

  if (!hasWireSafeValue) {
    return [];
  }

  const generalLimit = String(offerDetails.generalLimit ?? "");
  const merged = mergeMalpraxisSpecificDetails(
    [],
    bodySpecificDetails,
    generalLimit
  );

  const hasMoralSublimit = merged.some((detail) => MORAL_SUBLIMIT_CODES.has(detail.code));
  if (!hasMoralSublimit || !productCode) {
    return merged;
  }

  const adapted = adaptMalpraxisMoralDamagesForProduct(
    productCode,
    buildMalpraxisOfferDetails(offerDetails),
    moralSelection
  );
  const moralSublimits = buildMalpraxisMoralSublimitValues(
    productCode,
    moralSelection,
    adapted
  );
  return applyMoralSublimitRewrite(merged, moralSublimits);
}

/**
 * Single canonical comparator/v3 payload builder. bodies/v3 response is the source
 * of truth for offerDetails types and specificDetails; only moralDamagesLimit /
 * customMoralDamagesLimit are adapted per insurer.
 */
export function buildComparatorPayloadFromBodiesResponse(
  body: Record<string, unknown>,
  moralSelection: MalpraxisMoralDamagesSelection,
  clientSpecificDetails: MalpraxisSpecificDetail[] = []
): Record<string, unknown> {
  const bodyOfferDetails = isPlainObject(body.offerDetails) ? body.offerDetails : {};
  const productCode = resolveMalpraxisProductCode(body);
  const offerDetails = patchOfferDetailsMoralFields(
    bodyOfferDetails,
    productCode,
    moralSelection
  );
  const specificDetails = prepareBodiesSpecificDetailsForWire(
    body.specificDetails,
    offerDetails,
    productCode,
    moralSelection,
    clientSpecificDetails
  );

  return {
    orderId: toNumber(body.orderId),
    productId: toNumber(body.productId),
    agencyId: "agencyId" in body ? body.agencyId ?? null : null,
    policyStartDate: toOptionalString(body.policyStartDate),
    policyEndDate: toOptionalString(body.policyEndDate),
    offerDetails,
    productCode: productCode || toOptionalString(body.productCode),
    specificDetails,
    saveError: body.saveError === false ? false : true,
  };
}

export function mergeMalpraxisSpecificDetails(
  clientDetails: MalpraxisSpecificDetail[],
  bodySpecificDetails: unknown,
  generalLimit: string,
  options?: { ignoreBodyValues?: boolean }
): MalpraxisSpecificDetail[] {
  const merged = new Map<string, MalpraxisSpecificDetail>();

  for (const detail of clientDetails) {
    merged.set(detail.code, { code: detail.code, value: detail.value });
  }

  if (options?.ignoreBodyValues || !Array.isArray(bodySpecificDetails)) {
    return Array.from(merged.values());
  }

  for (const entry of bodySpecificDetails) {
    if (!isPlainObject(entry)) {
      continue;
    }

    const code = toOptionalString(entry.code);
    if (!code) {
      continue;
    }

    const requestDetail = merged.get(code);
    const requestValue = requestDetail?.value;
    const entryValue = entry.value;
    if (typeof entryValue === "boolean") {
      continue;
    }
    const isZeroLike =
      entryValue === 0 ||
      entryValue === "0" ||
      entryValue == null ||
      entryValue === "";

    const shouldRestoreRequestValue =
      (code === "EVENT_LIMIT_INSURED_AMOUNT" || MORAL_SUBLIMIT_CODES.has(code)) &&
      isZeroLike &&
      requestValue != null &&
      requestValue !== "" &&
      requestValue !== "0";

    const value = shouldRestoreRequestValue
      ? requestValue
      : isZeroLike
        ? requestValue ?? (code === "EVENT_LIMIT_INSURED_AMOUNT" ? generalLimit : "0")
        : String(entryValue);

    merged.set(code, { code, value });
  }

  return normalizeMalpraxisSpecificDetailsArray(Array.from(merged.values()));
}

/** Ensures every specific detail value is a string (bodies/v3 request bodies). */
export function normalizeMalpraxisSpecificDetailsArray(
  details: unknown
): MalpraxisSpecificDetail[] {
  if (!Array.isArray(details)) {
    return [];
  }

  const normalized: MalpraxisSpecificDetail[] = [];
  for (const entry of details) {
    if (!isPlainObject(entry)) {
      continue;
    }
    const code = toOptionalString(entry.code);
    if (!code) {
      continue;
    }
    const rawValue = entry.value;
    if (typeof rawValue === "boolean") {
      continue;
    }
    const value =
      rawValue == null || rawValue === ""
        ? "0"
        : String(rawValue);
    normalized.push({ code, value });
  }
  return normalized;
}

export function buildMalpraxisBodiesPayload(
  body: Record<string, unknown>
): Record<string, unknown> {
  const offerDetails = finalizeMalpraxisComparatorOfferDetails(
    isPlainObject(body.offerDetails) ? body.offerDetails : {}
  );

  const productIds = Array.isArray(body.productIds)
    ? body.productIds
        .map((id) => toNumber(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : [];

  return stripMalpraxisInternalFields({
    orderId: toNumber(body.orderId),
    productIds,
    policyStartDate: toOptionalString(body.policyStartDate),
    policyEndDate: toOptionalString(body.policyEndDate),
    offerDetails,
    specificDetails: normalizeMalpraxisSpecificDetailsArray(body.specificDetails),
  });
}

export function buildMalpraxisEligibilityPayload(
  body: Record<string, unknown>
): Record<string, unknown> {
  const offerDetails = finalizeMalpraxisComparatorOfferDetails(
    isPlainObject(body.offerDetails) ? body.offerDetails : {}
  );

  const productIds = Array.isArray(body.productIds)
    ? body.productIds.map((id) => String(id)).filter(Boolean)
    : [];

  return {
    clientId: toNumber(body.clientId),
    productIds,
    policyStartDate: toOptionalString(body.policyStartDate),
    policyEndDate: toOptionalString(body.policyEndDate),
    offerDetails,
  };
}

/**
 * Server-side normalization when only the outbound JSON is available (proxy).
 *
 * Verified against the successful March 6, 2026 Garanta comparator/v3 traffic
 * (.codex-logs/malpraxis-dev.log line 38 → response policyPremium 12, error:false).
 * That working request kept `agencyId: null`, `productCode`, and `saveError: true`
 * on the wire alongside the offerDetails. The May 27 failure trace omitted them
 * and inverted the numeric/string types — both are corrected here.
 */
/** Minimal proxy normalizer: same single code path as the client builder. */
export function normalizeMalpraxisComparatorProxyPayload(
  body: Record<string, unknown>
): Record<string, unknown> {
  const bodyOfferDetails = isPlainObject(body.offerDetails) ? body.offerDetails : {};
  const moralSelection = parseMalpraxisMoralDamagesSelection(bodyOfferDetails);
  const clientSpecificDetails = normalizeMalpraxisSpecificDetailsArray(
    body.specificDetails
  );
  return buildComparatorPayloadFromBodiesResponse(
    body,
    moralSelection,
    clientSpecificDetails
  );
}

export function normalizeMalpraxisPostBody(path: string, rawBody: string): string {
  if (!rawBody || !path.startsWith("online/offers/malpraxis/")) {
    return rawBody;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return rawBody;
  }

  if (!isPlainObject(parsed)) {
    return rawBody;
  }

  if (path.includes("comparator/bodies/v3")) {
    return JSON.stringify(buildMalpraxisBodiesPayload(parsed));
  }

  if (path.includes("comparator/products/eligible")) {
    return JSON.stringify(buildMalpraxisEligibilityPayload(parsed));
  }

  if (path.includes("comparator/v3")) {
    return JSON.stringify(normalizeMalpraxisComparatorProxyPayload(parsed));
  }

  return rawBody;
}

export function buildMalpraxisComparatorPayload(
  body: Record<string, unknown>,
  clientOfferDetails: MalpraxisOfferDetailsPayload,
  clientSpecificDetails: MalpraxisSpecificDetail[] = [],
  options?: {
    moralDamagesSelection?: MalpraxisMoralDamagesSelection;
  }
): Record<string, unknown> {
  const moralSelection =
    options?.moralDamagesSelection ??
    parseMalpraxisMoralDamagesSelection(clientOfferDetails);
  return buildComparatorPayloadFromBodiesResponse(
    body,
    moralSelection,
    clientSpecificDetails
  );
}

/**
 * Strips fields that bodies/v3 and eligibility do NOT accept. Comparator/v3
 * keeps them — do not use this helper there.
 */
export function stripMalpraxisInternalFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!BODIES_INTERNAL_KEYS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Backwards-compatible alias (renamed for clarity; some tests still reference
 * the old name). Comparator/v3 wire payload now keeps internals — callers that
 * need bodies/v3 stripping should use `stripMalpraxisInternalFields`.
 */
export const stripMalpraxisComparatorInternals = stripMalpraxisInternalFields;

