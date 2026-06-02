import {
  applyVendorDisplayNameOverrides,
  getAddonDisplayLabel,
} from "@/lib/config/rcaAddonDisplayNames";
import type { OfferTab } from "@/types/rcaFlow";
import type {
  RcaAdditionalOffer,
  RcaAdditionalProduct,
  RcaAdditionalVendorProductType,
  RcaSelectedAddon,
} from "@/types/rcaAddons";
import { normalizeVendorName, toNumber } from "@/lib/utils/rcaHelpers";

export {
  applyVendorDisplayNameOverrides,
  applyVendorDisplayNameOverridesFromOffers,
  getAddonDisplayLabel,
} from "@/lib/config/rcaAddonDisplayNames";

export const RCA_ADDON_LABELS: Record<RcaAdditionalVendorProductType, string> = {
  ROAD_ASSIST: "Asistență rutieră",
  ACC_PERS: "Accidente persoane",
};

/** Supplementary RCA products are quoted for 6- and 12-month main policies only. */
export const RCA_ADDON_ELIGIBLE_PERIOD_MONTHS = ["6", "12"] as const;
export const RCA_ADDON_PREVIEW_PRODUCT_LIMIT = 4;

export function getAddonQuotePeriodMonths(
  tabPeriodMonths: string[]
): string[] | null {
  const eligible = tabPeriodMonths.filter((period) =>
    (RCA_ADDON_ELIGIBLE_PERIOD_MONTHS as readonly string[]).includes(period)
  );
  return eligible.length > 0 ? eligible : null;
}

export interface AddonPrefetchVariant {
  period: "6" | "12";
  withDirectSettlement: boolean;
}

export function getAddonPrefetchVariantsForTab(
  tab: OfferTab
): AddonPrefetchVariant[] {
  if (tab === "standard") {
    return [
      { period: "6", withDirectSettlement: false },
      { period: "12", withDirectSettlement: false },
    ];
  }
  if (tab === "direct") {
    return [
      { period: "6", withDirectSettlement: true },
      { period: "12", withDirectSettlement: true },
    ];
  }
  return [];
}

/** Shared per order + period + settlement tab (quoting cache, same API for all RCA cards). */
export function buildAddonOffersCacheKey(
  periodMonth: string,
  withDirectSettlement: boolean
): string {
  return `${periodMonth}|${withDirectSettlement ? "dd" : "std"}`;
}

/** Per RCA insurer card + period + settlement tab (user selection state). */
export function buildAddonSelectionKey(
  vendorName: string,
  periodMonth: string,
  withDirectSettlement: boolean
): string {
  const vendor = normalizeVendorName(vendorName).trim().toLowerCase();
  return `${vendor}|${periodMonth}|${withDirectSettlement ? "dd" : "std"}`;
}

export function parseAddonSelectionKey(selectionKey: string): {
  vendorName: string;
  period: string;
  withDirectSettlement: boolean;
} {
  const [vendorName, period, tab] = selectionKey.split("|");
  return {
    vendorName: vendorName ?? "",
    period: period ?? "",
    withDirectSettlement: tab === "dd",
  };
}

export function getAddonProductDisplayName(product: RcaAdditionalProduct): string {
  const commercial = product.productName?.trim();
  if (commercial) return commercial;
  return (
    RCA_ADDON_LABELS[product.vendorProductType] || product.vendorProductType
  );
}

export interface RcaAdditionalVendorGroup {
  vendorId: number;
  vendorLabel: string;
  products: RcaAdditionalProduct[];
}

export function groupAdditionalProductsByVendor(
  products: RcaAdditionalProduct[]
): RcaAdditionalVendorGroup[] {
  const byVendor = new Map<number, RcaAdditionalVendorGroup>();

  for (const product of products) {
    const vendorId = product.vendorDetails.id || 0;
    const vendorLabel =
      product.vendorDetails.commercialName?.trim() ||
      product.vendorDetails.name?.trim() ||
      "Altele";

    const existing = byVendor.get(vendorId);
    if (existing) {
      existing.products.push(product);
    } else {
      byVendor.set(vendorId, {
        vendorId,
        vendorLabel,
        products: [product],
      });
    }
  }

  return Array.from(byVendor.values()).sort((a, b) =>
    a.vendorLabel.localeCompare(b.vendorLabel, "ro")
  );
}

export function addonOfferMapsEqual(
  a: Map<number, RcaAdditionalOffer[]>,
  b: Map<number, RcaAdditionalOffer[]>
): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [key, aOffers] of a) {
    const bOffers = b.get(key);
    if (!bOffers || aOffers !== bOffers) return false;
  }
  return true;
}

export function hasQuotableAddonOffers(
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): boolean {
  for (const offers of offersByProductId.values()) {
    if (pickAdditionalOfferForPeriod(offers, periodMonths)) return true;
  }
  return false;
}

export function getQuotableProductsForPeriod(
  products: RcaAdditionalProduct[],
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): RcaAdditionalProduct[] {
  return products.filter((product) => {
    const offers = offersByProductId.get(product.id) ?? [];
    return pickAdditionalOfferForPeriod(offers, periodMonths) != null;
  });
}

export function sumSelectedAddonPremiums(
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  selectedProductIds: number[],
  periodMonths: number
): number {
  return resolveSelectedAddons(
    offersByProductId,
    selectedProductIds,
    periodMonths
  ).reduce((sum, addon) => sum + addon.premium, 0);
}

function parseApiBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0 || value == null) return false;
  return Boolean(value);
}

function inferVendorProductType(
  raw: Record<string, unknown>,
  fallback?: RcaAdditionalVendorProductType
): RcaAdditionalVendorProductType | null {
  const explicit = raw.vendorProductType;
  if (explicit === "ROAD_ASSIST" || explicit === "ACC_PERS") {
    return explicit;
  }
  if (fallback) return fallback;

  const hint = `${raw.productType || ""} ${raw.productName || ""}`.toUpperCase();
  if (hint.includes("ROAD") || hint.includes("ASSIST")) return "ROAD_ASSIST";
  if (hint.includes("ACC")) return "ACC_PERS";
  return null;
}

export function normalizeRcaAdditionalProduct(
  raw: Record<string, unknown>,
  fallbackVendorProductType?: RcaAdditionalVendorProductType
): RcaAdditionalProduct | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const vendorProductType = inferVendorProductType(raw, fallbackVendorProductType);
  if (!vendorProductType) return null;

  const vendorDetails = (raw.vendorDetails as Record<string, unknown>) || {};

  return {
    id,
    productName: String(raw.productName || ""),
    productType: String(raw.productType || ""),
    productSubType: (raw.productSubType as string | null) ?? null,
    vendorProductType,
    insuranceClass: String(raw.insuranceClass || ""),
    vat: Number(raw.vat) || 0,
    vendorDetails: {
      id: Number(vendorDetails.id) || 0,
      name: String(vendorDetails.name || ""),
      commercialName: String(vendorDetails.commercialName || ""),
      linkLogo: String(vendorDetails.linkLogo || ""),
    },
  };
}

export function normalizeRcaAdditionalOffer(
  raw: Record<string, unknown>,
  catalogProduct?: RcaAdditionalProduct
): RcaAdditionalOffer | null {
  const offerDetails =
    raw.offerDetails && typeof raw.offerDetails === "object"
      ? (raw.offerDetails as Record<string, unknown>)
      : undefined;

  const isError = parseApiBoolean(offerDetails?.error ?? raw.error);
  const id =
    toNumber(raw.id) ??
    toNumber(raw.offerId) ??
    toNumber(offerDetails?.id) ??
    toNumber(offerDetails?.offerId);

  if (isError || id == null || id <= 0) return null;

  const productRaw = (raw.productDetails ??
    raw.product ??
    offerDetails?.productDetails ??
    offerDetails?.product) as Record<string, unknown> | undefined;

  const product =
    (productRaw
      ? normalizeRcaAdditionalProduct(
          productRaw,
          catalogProduct?.vendorProductType
        )
      : null) ?? catalogProduct;
  if (!product) return null;

  const policyPremium =
    toNumber(offerDetails?.policyPremium) ??
    toNumber(raw.policyPremium) ??
    toNumber(raw.premium) ??
    toNumber(raw.totalPremium) ??
    0;

  const periodMonths =
    toNumber(offerDetails?.periodMonths) ?? toNumber(raw.periodMonths) ?? 0;

  const policyStartDate =
    typeof offerDetails?.policyStartDate === "string"
      ? offerDetails.policyStartDate
      : typeof raw.policyStartDate === "string"
        ? raw.policyStartDate
        : undefined;
  const policyEndDate =
    typeof offerDetails?.policyEndDate === "string"
      ? offerDetails.policyEndDate
      : typeof raw.policyEndDate === "string"
        ? raw.policyEndDate
        : undefined;

  return {
    id,
    orderId: toNumber(raw.orderId) ?? toNumber(offerDetails?.orderId) ?? 0,
    policyPremium: policyPremium ?? 0,
    currency: String(offerDetails?.currency ?? raw.currency ?? "RON"),
    periodMonths: periodMonths ?? 0,
    policyStartDate,
    policyEndDate,
    error: false,
    message:
      typeof raw.message === "string"
        ? raw.message
        : typeof offerDetails?.message === "string"
          ? offerDetails.message
          : null,
    productDetails: product,
  };
}

export function normalizeRcaAdditionalOffers(
  response: unknown,
  catalogProduct?: RcaAdditionalProduct
): RcaAdditionalOffer[] {
  const list = parseRcaAdditionalOffersResponse(response);
  return list
    .map((item) =>
      item && typeof item === "object"
        ? normalizeRcaAdditionalOffer(
            item as Record<string, unknown>,
            catalogProduct
          )
        : null
    )
    .filter((o): o is RcaAdditionalOffer => o != null);
}

/** Accepts a raw array or common API envelope shapes. */
export function parseRcaAdditionalCatalogResponse(
  response: unknown
): Record<string, unknown>[] {
  if (Array.isArray(response)) {
    return response.filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (response && typeof response === "object") {
    const envelope = response as Record<string, unknown>;
    for (const key of ["data", "products", "items", "content", "results"]) {
      const nested = envelope[key];
      if (Array.isArray(nested)) {
        return parseRcaAdditionalCatalogResponse(nested);
      }
    }
  }
  return [];
}

function parseRcaAdditionalOffersResponse(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const envelope = response as Record<string, unknown>;
    for (const key of ["offers", "data", "items", "content", "results"]) {
      const nested = envelope[key];
      if (Array.isArray(nested)) return nested;
    }
  }
  return response != null ? [response] : [];
}

/** Match RCA offer vendor label to catalog vendorDetails (exact or prefix). */
export function vendorNamesMatch(
  offerVendorName: string,
  catalogCommercialName: string,
  catalogName: string
): boolean {
  const normalizedOffer = normalizeVendorName(offerVendorName).trim().toLowerCase();
  if (!normalizedOffer) return false;

  const catalogLabels = [catalogCommercialName, catalogName]
    .map((label) => normalizeVendorName(label).trim().toLowerCase())
    .filter(Boolean);

  for (const catalogLabel of catalogLabels) {
    if (normalizedOffer === catalogLabel) return true;
    if (
      normalizedOffer.length >= 3 &&
      catalogLabel.length >= 3 &&
      (normalizedOffer.includes(catalogLabel) ||
        catalogLabel.includes(normalizedOffer))
    ) {
      return true;
    }
  }
  return false;
}

/** Legacy helper; catalog is not filtered by RCA card insurer. */
export function filterAdditionalProductsForVendor(
  products: RcaAdditionalProduct[],
  vendorName: string,
  vendorDetailsId?: number | null
): RcaAdditionalProduct[] {
  const normalizedVendor = normalizeVendorName(vendorName).trim().toLowerCase();
  if (!normalizedVendor && !vendorDetailsId) return [];

  return products.filter((p) => {
    if (
      vendorDetailsId != null &&
      vendorDetailsId > 0 &&
      p.vendorDetails.id === vendorDetailsId
    ) {
      return true;
    }
    return vendorNamesMatch(
      vendorName,
      p.vendorDetails.commercialName,
      p.vendorDetails.name
    );
  });
}

export function filterAddonOffersForRequestedPeriods(
  offers: RcaAdditionalOffer[],
  requestedPeriodMonths: string[]
): RcaAdditionalOffer[] {
  const valid = offers.filter((o) => !o.error && o.policyPremium > 0);
  const requested = requestedPeriodMonths
    .map((period) => Number(period))
    .filter((months) => Number.isFinite(months) && months > 0);

  if (requested.length === 0) return valid;

  return valid.filter((offer) => requested.includes(offer.periodMonths));
}

export function pickAdditionalOfferForPeriod(
  offers: RcaAdditionalOffer[],
  periodMonths: number
): RcaAdditionalOffer | null {
  const valid = offers.filter((o) => !o.error && o.policyPremium > 0);
  if (valid.length === 0) return null;

  const exact = valid.find((o) => o.periodMonths === periodMonths);
  if (exact) return exact;

  return null;
}

export function resolveSelectedAddons(
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  selectedProductIds: number[],
  periodMonths: number
): RcaSelectedAddon[] {
  const displayNameOverrides = applyVendorDisplayNameOverrides(
    offersByProductId,
    periodMonths
  );
  const resolved: RcaSelectedAddon[] = [];

  for (const productId of selectedProductIds) {
    const offers = offersByProductId.get(productId) ?? [];
    const match = pickAdditionalOfferForPeriod(offers, periodMonths);
    if (!match) continue;

    resolved.push({
      offerId: match.id,
      productId,
      premium: match.policyPremium,
      vendorProductType: match.productDetails.vendorProductType,
      label: getAddonDisplayLabel(
        match.productDetails,
        displayNameOverrides
      ),
    });
  }

  return resolved;
}

export function formatAddonRoPrice(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAddonRoDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Subtext under addon row: start date + validity from offer period. */
export function formatAddonOfferSubtext(offer: RcaAdditionalOffer): string {
  const parts: string[] = [];
  if (offer.policyStartDate) {
    parts.push(`Început: ${formatAddonRoDate(offer.policyStartDate)}`);
  }
  if (offer.periodMonths > 0) {
    parts.push(`Valabilitate: ${offer.periodMonths} luni`);
  }
  return parts.join(" · ");
}
