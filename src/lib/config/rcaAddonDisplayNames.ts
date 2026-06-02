import type {
  RcaAdditionalOffer,
  RcaAdditionalProduct,
  RcaAdditionalVendorProductType,
} from "@/types/rcaAddons";
import { normalizeVendorName } from "@/lib/utils/rcaHelpers";

const RAW_ADDON_LABELS: Record<RcaAdditionalVendorProductType, string> = {
  ROAD_ASSIST: "Asistență rutieră",
  ACC_PERS: "Accidente persoane",
};

function pickOfferForPeriod(
  offers: RcaAdditionalOffer[],
  periodMonths: number
): RcaAdditionalOffer | null {
  const valid = offers.filter((o) => !o.error && o.policyPremium > 0);
  return valid.find((o) => o.periodMonths === periodMonths) ?? null;
}

function rawAddonProductDisplayName(product: RcaAdditionalProduct): string {
  const commercial = product.productName?.trim();
  if (commercial) return commercial;
  return (
    RAW_ADDON_LABELS[product.vendorProductType] || product.vendorProductType
  );
}

export interface RcaAddonVendorGroupContext {
  vendorId: number;
  vendorLabel: string;
}

interface ProductPeriodEntry {
  productId: number;
  product: RcaAdditionalProduct;
  premium: number;
}

const GRAWE_ROAD_ASSIST_TIERS = [
  "Asistenta Rutiera BasicPlus",
  "Asistenta Rutiera Util",
  "Asistenta Rutiera Premium",
  "Asistenta Rutiera PremiumEuropa",
] as const;

const POINTER_ROAD_ASSIST_TIERS = [
  "Asistenta Rutiera Premium",
  "Asistenta Rutiera VIP",
] as const;

const SIGNAL_EXPERT_TIERS = [
  "Signal Expert B1",
  "Signal Expert B2",
  "Signal Expert B3",
  "Signal Expert B4",
] as const;

const SIGNAL_EVENT_TIERS = [
  "Signal Event M1",
  "Signal Event M2",
  "Signal Event M3",
  "Signal Event M4",
] as const;

export function getVendorCommercialKey(product: RcaAdditionalProduct): string {
  const raw =
    product.vendorDetails.commercialName?.trim() ||
    product.vendorDetails.name?.trim() ||
    "";
  return normalizeVendorName(raw).trim().toLowerCase();
}

function vendorKeyIncludes(key: string, needle: string): boolean {
  return key.includes(needle);
}

function isRoadAssistProduct(product: RcaAdditionalProduct): boolean {
  if (product.vendorProductType === "ROAD_ASSIST") return true;
  const hint = `${product.productName} ${product.productType}`.toLowerCase();
  return hint.includes("rutier") || hint.includes("asistent");
}

function isAccidentLikeProduct(product: RcaAdditionalProduct): boolean {
  if (product.vendorProductType === "ACC_PERS") return true;
  const hint = `${product.productName} ${product.productType}`.toLowerCase();
  return hint.includes("accident") || hint.includes("accidente");
}

function isSignalExpertProduct(product: RcaAdditionalProduct): boolean {
  const hint = `${product.productName} ${product.productType}`.toLowerCase();
  return hint.includes("expert") && !hint.includes("event");
}

function isSignalEventProduct(product: RcaAdditionalProduct): boolean {
  const hint = `${product.productName} ${product.productType}`.toLowerCase();
  return hint.includes("event") && !hint.includes("expert");
}

function sortByPremiumAsc(entries: ProductPeriodEntry[]): ProductPeriodEntry[] {
  return [...entries].sort((a, b) => a.premium - b.premium);
}

function assignTierLabels(
  entries: ProductPeriodEntry[],
  tiers: readonly string[],
  overrides: Map<number, string>
): void {
  const sorted = sortByPremiumAsc(entries);
  sorted.forEach((entry, index) => {
    const label = tiers[Math.min(index, tiers.length - 1)];
    if (label) overrides.set(entry.productId, label);
  });
}

function applyAxeriaOverrides(
  entries: ProductPeriodEntry[],
  overrides: Map<number, string>
): void {
  for (const entry of entries) {
    if (isAccidentLikeProduct(entry.product)) {
      overrides.set(entry.productId, "Accidente Persoane");
    }
  }
}

function applyGraweRoadAssistOverrides(
  entries: ProductPeriodEntry[],
  overrides: Map<number, string>
): void {
  const roadAssist = entries.filter((e) => isRoadAssistProduct(e.product));
  if (roadAssist.length === 0) return;
  assignTierLabels(roadAssist, GRAWE_ROAD_ASSIST_TIERS, overrides);
}

function applyPointerRoadAssistOverrides(
  entries: ProductPeriodEntry[],
  overrides: Map<number, string>
): void {
  const roadAssist = entries.filter((e) => isRoadAssistProduct(e.product));
  if (roadAssist.length === 0) return;
  assignTierLabels(roadAssist, POINTER_ROAD_ASSIST_TIERS, overrides);
}

function applySignalIdunaOverrides(
  entries: ProductPeriodEntry[],
  overrides: Map<number, string>
): void {
  const expert = entries.filter((e) => isSignalExpertProduct(e.product));
  const event = entries.filter((e) => isSignalEventProduct(e.product));

  if (expert.length > 0) {
    assignTierLabels(expert, SIGNAL_EXPERT_TIERS, overrides);
  }
  if (event.length > 0) {
    assignTierLabels(event, SIGNAL_EVENT_TIERS, overrides);
  }
}

function applyVendorGroupOverrides(
  vendorKey: string,
  entries: ProductPeriodEntry[],
  overrides: Map<number, string>
): void {
  if (vendorKeyIncludes(vendorKey, "axeria")) {
    applyAxeriaOverrides(entries, overrides);
  }
  if (vendorKeyIncludes(vendorKey, "grawe")) {
    applyGraweRoadAssistOverrides(entries, overrides);
  }
  if (vendorKeyIncludes(vendorKey, "pointer")) {
    applyPointerRoadAssistOverrides(entries, overrides);
  }
  if (vendorKeyIncludes(vendorKey, "signal")) {
    applySignalIdunaOverrides(entries, overrides);
  }
}

function collectProductPeriodEntries(
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): ProductPeriodEntry[] {
  const entries: ProductPeriodEntry[] = [];

  for (const [productId, offers] of offersByProductId) {
    const offer = pickOfferForPeriod(offers, periodMonths);
    if (!offer) continue;
    entries.push({
      productId,
      product: offer.productDetails,
      premium: offer.policyPremium,
    });
  }

  return entries;
}

/** Build display-name overrides from quoted offers for a single policy period. */
export function applyVendorDisplayNameOverrides(
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): Map<number, string> {
  const entries = collectProductPeriodEntries(offersByProductId, periodMonths);
  const overrides = new Map<number, string>();

  const byVendorId = new Map<number, ProductPeriodEntry[]>();
  for (const entry of entries) {
    const vendorId = entry.product.vendorDetails.id || 0;
    const group = byVendorId.get(vendorId) ?? [];
    group.push(entry);
    byVendorId.set(vendorId, group);
  }

  for (const group of byVendorId.values()) {
    const vendorKey = getVendorCommercialKey(group[0]!.product);
    applyVendorGroupOverrides(vendorKey, group, overrides);
  }

  return overrides;
}

/** Flat offer list variant (same rules as map-based helper). */
export function applyVendorDisplayNameOverridesFromOffers(
  offers: RcaAdditionalOffer[],
  periodMonths: number
): Map<number, string> {
  const byProductId = new Map<number, RcaAdditionalOffer[]>();
  for (const offer of offers) {
    const productId = offer.productDetails.id;
    const list = byProductId.get(productId) ?? [];
    list.push(offer);
    byProductId.set(productId, list);
  }
  return applyVendorDisplayNameOverrides(byProductId, periodMonths);
}

export function getAddonDisplayLabel(
  product: RcaAdditionalProduct,
  displayNameOverrides?: Map<number, string>
): string {
  const override = displayNameOverrides?.get(product.id);
  if (override) return override;
  return rawAddonProductDisplayName(product);
}

function productPremiumForPeriod(
  productId: number,
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): number {
  const offers = offersByProductId.get(productId) ?? [];
  const offer = pickOfferForPeriod(offers, periodMonths);
  return offer?.policyPremium ?? Number.POSITIVE_INFINITY;
}

function extractSignalTierRank(label: string, tierLetter: "B" | "M"): number | null {
  const match = label.match(new RegExp(`\\b${tierLetter}(\\d+)\\b`, "i"));
  if (match) return Number(match[1]);
  return null;
}

function sortByPremiumAscProducts(
  products: RcaAdditionalProduct[],
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  periodMonths: number
): RcaAdditionalProduct[] {
  return [...products].sort(
    (a, b) =>
      productPremiumForPeriod(a.id, offersByProductId, periodMonths) -
      productPremiumForPeriod(b.id, offersByProductId, periodMonths)
  );
}

/** Order products within a vendor group for modal display (after display-name overrides). */
export function sortVendorGroupProducts(
  products: RcaAdditionalProduct[],
  offersByProductId: Map<number, RcaAdditionalOffer[]>,
  vendorKey: string,
  periodMonths: number,
  displayNameOverrides?: Map<number, string>
): RcaAdditionalProduct[] {
  const key = vendorKey.trim().toLowerCase();
  const labelFor = (product: RcaAdditionalProduct) =>
    getAddonDisplayLabel(product, displayNameOverrides);

  if (vendorKeyIncludes(key, "grawe")) {
    const roadAssist = sortByPremiumAscProducts(
      products.filter((p) => isRoadAssistProduct(p)),
      offersByProductId,
      periodMonths
    );
    const accident = sortByPremiumAscProducts(
      products.filter((p) => isAccidentLikeProduct(p)),
      offersByProductId,
      periodMonths
    );
    const rest = products.filter(
      (p) => !isRoadAssistProduct(p) && !isAccidentLikeProduct(p)
    );
    return [...roadAssist, ...accident, ...rest];
  }

  if (vendorKeyIncludes(key, "signal")) {
    const expert = [...products.filter((p) => isSignalExpertProduct(p))].sort(
      (a, b) => {
        const rankA =
          extractSignalTierRank(labelFor(a), "B") ??
          productPremiumForPeriod(a.id, offersByProductId, periodMonths);
        const rankB =
          extractSignalTierRank(labelFor(b), "B") ??
          productPremiumForPeriod(b.id, offersByProductId, periodMonths);
        return rankA - rankB;
      }
    );
    const event = [...products.filter((p) => isSignalEventProduct(p))].sort(
      (a, b) => {
        const rankA =
          extractSignalTierRank(labelFor(a), "M") ??
          productPremiumForPeriod(a.id, offersByProductId, periodMonths);
        const rankB =
          extractSignalTierRank(labelFor(b), "M") ??
          productPremiumForPeriod(b.id, offersByProductId, periodMonths);
        return rankA - rankB;
      }
    );
    const rest = products.filter(
      (p) => !isSignalExpertProduct(p) && !isSignalEventProduct(p)
    );
    return [...expert, ...event, ...rest];
  }

  return products;
}
