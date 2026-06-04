import {
  type MalpraxisMoralDamagesSelection,
  inferMalpraxisProductCode,
  inferMalpraxisProductCodeByProductId,
  resolveMalpraxisMoralDamagesMode,
} from "./malpraxisOfferPayload";

export type MalpraxisMoralInputMode = "none" | "percent" | "numeric";

export type MalpraxisMatrixStatus = "included" | "excluded";

export interface MalpraxisMatrixProductInput {
  id: number;
  productName?: string;
  vendorDetails?: { name?: string };
}

export interface MalpraxisMatrixCell {
  productId: number;
  productCode: string;
  status: MalpraxisMatrixStatus;
  reason?: string;
}

const DISPLAY_NAMES: Record<string, string> = {
  GARANTA_MALPRAXIS: "Garanta",
  EUROINS_MALPRAXIS: "Euroins",
  UNIQA_MALPRAXIS: "Uniqa",
  ASIROM_MALPRAXIS: "Asirom",
  ABC_MALPRAXIS: "ABC Insurance SA",
  SIGNAL_IDUNA_MALPRAXIS: "Signal Iduna Asigurari (Ergo)",
  OMNIASIG_MALPRAXIS_GENERAL: "Omniasig",
  OMNIASIG_MALPRAXIS_PHARMACIST: "Omniasig",
};

function toNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getMalpraxisMoralInputMode(
  selection: MalpraxisMoralDamagesSelection
): MalpraxisMoralInputMode {
  const customAmount = toNumber(selection.customMoralDamagesLimit);
  const percentCode = selection.moralDamagesLimitCode.trim();
  const percent =
    percentCode === "" || percentCode === "0" ? 0 : toNumber(percentCode);

  if (customAmount > 0) {
    return "numeric";
  }
  if (percent > 0) {
    return "percent";
  }
  return "none";
}

function displayName(productCode: string): string {
  return DISPLAY_NAMES[productCode] ?? productCode;
}

function isRetroactiveSelected(retroactivePeriod: string): boolean {
  const code = retroactivePeriod.trim();
  return code !== "" && code !== "0";
}

export function resolveMalpraxisProductCodeForMatrix(
  product: MalpraxisMatrixProductInput
): string | null {
  return (
    inferMalpraxisProductCodeByProductId(product.id) ??
    inferMalpraxisProductCode(
      product.vendorDetails?.name ?? "",
      product.productName ?? ""
    )
  );
}

/**
 * Static malpraxis product matrix (live Comparator Malpraxis rules).
 * Eligibility API may still exclude products after this filter.
 */
export function getProductMatrixCell(
  productCode: string,
  moralInputMode: MalpraxisMoralInputMode,
  retroactivePeriod: string
): Pick<MalpraxisMatrixCell, "status" | "reason"> {
  if (
    productCode === "SIGNAL_IDUNA_MALPRAXIS" &&
    isRetroactiveSelected(retroactivePeriod)
  ) {
    return {
      status: "excluded",
      reason: `Produsul ${displayName(productCode)} nu accepta perioada retroactiva selectata`,
    };
  }

  const damagesMode = resolveMalpraxisMoralDamagesMode(productCode);

  if (moralInputMode === "percent") {
    if (damagesMode === "numeric") {
      return {
        status: "excluded",
        reason: `Produsul ${displayName(productCode)} nu accepta procent pentru limita daune morale, va rugam selectati o valoare numerica`,
      };
    }
    return { status: "included" };
  }

  if (moralInputMode === "numeric") {
    if (damagesMode === "percent") {
      return {
        status: "excluded",
        reason: `Produsul ${displayName(productCode)} accepta doar procent pentru limita daune morale`,
      };
    }
    return { status: "included" };
  }

  return { status: "included" };
}

export function buildMalpraxisProductMatrix(
  products: MalpraxisMatrixProductInput[],
  selection: MalpraxisMoralDamagesSelection,
  retroactivePeriod: string
): MalpraxisMatrixCell[] {
  const moralInputMode = getMalpraxisMoralInputMode(selection);

  return products.flatMap((product) => {
    const productCode = resolveMalpraxisProductCodeForMatrix(product);
    if (!productCode) {
      return [];
    }

    const cell = getProductMatrixCell(productCode, moralInputMode, retroactivePeriod);
    return [
      {
        productId: product.id,
        productCode,
        status: cell.status,
        reason: cell.reason,
      },
    ];
  });
}

export function getIncludedProductIdsFromMatrix(matrix: MalpraxisMatrixCell[]): number[] {
  return matrix.filter((cell) => cell.status === "included").map((cell) => cell.productId);
}

export function getMatrixExcludedCells(matrix: MalpraxisMatrixCell[]): MalpraxisMatrixCell[] {
  return matrix.filter((cell) => cell.status === "excluded");
}

export interface MalpraxisMatrixExcludedOffer {
  productId: number;
  vendorName: string;
  message: string;
}

export function mapMatrixExcludedToOffers(
  matrix: MalpraxisMatrixCell[],
  products: MalpraxisMatrixProductInput[]
): MalpraxisMatrixExcludedOffer[] {
  const byId = new Map(products.map((product) => [product.id, product]));

  return getMatrixExcludedCells(matrix).map((cell) => {
    const product = byId.get(cell.productId);
    const vendorName = product?.vendorDetails?.name?.trim() || displayName(cell.productCode);
    return {
      productId: cell.productId,
      vendorName,
      message: cell.reason ?? "Produsul nu este disponibil pentru configuratia selectata",
    };
  });
}
