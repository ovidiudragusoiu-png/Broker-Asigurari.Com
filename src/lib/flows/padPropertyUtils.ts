import { api, ApiError } from "@/lib/api/client";
import { getArray } from "@/lib/utils/dto";

export interface LabeledIdOption {
  id: number;
  name: string;
  description: string;
}

/** PAD-A product id fallback when /online/products/house is unavailable. */
export const PAD_PRODUCT_ID_A = 1270;

/** PAD-B product id fallback (production uses 1271, not 1272). */
export const PAD_PRODUCT_ID_B = 1271;

/** Staging PAD construction types; used when production returns 500 for constructionTypes/{padProductId}. */
export const PAD_CONSTRUCTION_TYPE_FALLBACK: LabeledIdOption[] = [
  { id: 1, name: "Bloc", description: "Bloc" },
  { id: 3, name: "Casa", description: "Casa" },
];

const PAD_PRODUCT_FALLBACKS = new Map<string, number>([
  ["A", PAD_PRODUCT_ID_A],
  ["B", PAD_PRODUCT_ID_B],
]);

/** Parse PAD-A / PAD-B ids from GET /online/products/house. */
export function parsePadProductIds(data: unknown): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of getArray<Record<string, unknown>>(data)) {
    const id = Number(item.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const name = String(item.productName || "");
    const match = name.match(/PAD-([AB])/i);
    if (match) {
      map.set(match[1].toUpperCase(), id);
    }
  }
  return map;
}

export async function fetchPadProductIds(): Promise<Map<string, number>> {
  try {
    const data = await api.get<unknown>("/online/products/house");
    const parsed = parsePadProductIds(data);
    if (parsed.size > 0) return parsed;
  } catch {
    // use static fallbacks
  }
  return new Map(PAD_PRODUCT_FALLBACKS);
}

export function padProductIdForBuildingType(
  padPropertyType: string,
  catalog?: Map<string, number> | null
): number {
  const key = padPropertyType.trim().toUpperCase();
  const fromCatalog = catalog?.get(key);
  if (fromCatalog != null) return fromCatalog;
  return PAD_PRODUCT_FALLBACKS.get(key) ?? PAD_PRODUCT_ID_A;
}

export function constructionTypeNameForPad(
  constructionTypeId: string | number,
  options: LabeledIdOption[]
): string {
  const match = options.find((item) => item.id === Number(constructionTypeId));
  return match?.name || match?.description || "";
}

/** Tip B (case) — default to Casa when user picks PAD type B. */
export function defaultConstructionTypeIdForPad(padPropertyType: string): string {
  return padPropertyType === "B" ? "3" : "";
}

/** PAID rejects postal codes that are not in the Insuretech street directory. */
export async function isPadPostalCodeRecognized(
  cityId: number,
  streetName: string,
  postalCode: string
): Promise<boolean> {
  const query = streetName.trim();
  const postal = postalCode.trim();
  if (!cityId || !query || !postal) return false;

  try {
    const results = await api.get<{ postalCode: string; streetName: string }[]>(
      `/online/address/utils/postalCodes/find?cityId=${cityId}&streetName=${encodeURIComponent(query)}`
    );
    return results.some(
      (row) =>
        String(row.postalCode).trim() === postal &&
        query.toLowerCase().includes(String(row.streetName || "").trim().toLowerCase())
    );
  } catch {
    return false;
  }
}

export interface PadOfferPayload {
  orderId: number;
  productId: number;
  policyStartDate: string;
  policyEndDate: string;
  offerDetails: Record<string, unknown>;
}

export async function postPadOffer<T extends { error?: boolean; message?: string }>(
  orderHash: string,
  body: PadOfferPayload
): Promise<T> {
  try {
    return await api.post<T>(`/online/offers/paid/pad/v3?orderHash=${orderHash}`, body);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 400) throw err;
    return api.post<T>("/online/offers/paid/pad", body);
  }
}

export function normalizeLabeledIdOptions(data: unknown): LabeledIdOption[] {
  const list = getArray<Record<string, unknown>>(data);
  return list
    .map((item) => ({
      id: Number(item.id),
      name: String(item.name || item.description || ""),
      description: String(item.description || item.name || ""),
    }))
    .filter((item) => Number.isFinite(item.id) && item.id > 0);
}

/**
 * Load building structure options. Production Insuretech may 500 on /{productId};
 * the global list endpoint returns the same catalog.
 */
export async function fetchBuildingStructureOptions(
  productId?: number
): Promise<LabeledIdOption[]> {
  const paths =
    productId != null
      ? [
          `/online/utils/buildingStructures/${productId}`,
          "/online/utils/buildingStructures",
        ]
      : ["/online/utils/buildingStructures"];

  for (const path of paths) {
    try {
      const data = await api.get<unknown>(path);
      const options = normalizeLabeledIdOptions(data);
      if (options.length > 0) return options;
    } catch {
      // try fallback path
    }
  }

  return [];
}

/** Load PAD construction type options with documented fallback when product route fails. */
export async function fetchPadConstructionTypeOptions(
  productId: number
): Promise<LabeledIdOption[]> {
  try {
    const data = await api.get<unknown>(`/online/utils/constructionTypes/${productId}`);
    const options = normalizeLabeledIdOptions(data);
    if (options.length > 0) return options;
  } catch {
    // Production PAD product ids often 500 on this route.
  }

  return PAD_CONSTRUCTION_TYPE_FALLBACK;
}
