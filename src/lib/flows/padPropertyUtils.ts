import { api } from "@/lib/api/client";
import { getArray } from "@/lib/utils/dto";

export interface LabeledIdOption {
  id: number;
  name: string;
  description: string;
}

/** PAD-A product id (Insuretech docs / staging). */
export const PAD_PRODUCT_ID_A = 1270;

/**
 * PAD-B product id — not documented; keep in sync with Insuretech if offers fail for Tip B.
 */
export const PAD_PRODUCT_ID_B = 1272;

/** Staging PAD construction types; used when production returns 500 for constructionTypes/{padProductId}. */
export const PAD_CONSTRUCTION_TYPE_FALLBACK: LabeledIdOption[] = [
  { id: 1, name: "Bloc", description: "Bloc" },
  { id: 3, name: "Casa", description: "Casa" },
];

export function padProductIdForBuildingType(padPropertyType: string): number {
  return padPropertyType === "B" ? PAD_PRODUCT_ID_B : PAD_PRODUCT_ID_A;
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
