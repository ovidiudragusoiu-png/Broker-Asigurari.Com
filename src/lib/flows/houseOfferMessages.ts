import {
  presentUnavailableOfferError,
  type PresentedOfferError,
} from "@/lib/ui/offerErrorPresentation";

/** Insuretech buildingStructures id for Caramida Piatra — not mapped by Allianz MYHOME. */
export const CARAMIDA_PIATRA_BUILDING_STRUCTURE_TYPE_ID = 4;

export const ALLIANZ_CARAMIDA_PIATRA_STRUCTURE_MESSAGE =
  "Allianz oferă asigurare locuință doar pentru clădiri cu structură beton prefabricat/Metal/Lemn. Pentru structura selectată, alegeți un alt asigurător.";

export interface HouseUnavailableOfferLike {
  vendorName?: string;
  productName?: string;
  error?: string;
  message?: string;
  hasApiError?: boolean;
  policyPremium?: number;
}

export function isAllianzHouseVendor(name: string): boolean {
  return name.toLowerCase().includes("allianz");
}

export function isCaramidaPiatraBuildingStructure(structureTypeId: string | number): boolean {
  return Number(structureTypeId) === CARAMIDA_PIATRA_BUILDING_STRUCTURE_TYPE_ID;
}

export function extractHouseOfferRawMessage(offer: HouseUnavailableOfferLike): string | undefined {
  return (
    offer.error ||
    offer.message?.split("|").pop()?.trim() ||
    undefined
  );
}

export function shouldUseAllianzCaramidaPiatraMessage(
  offer: HouseUnavailableOfferLike,
  buildingStructureTypeId: string | number
): boolean {
  if (!isCaramidaPiatraBuildingStructure(buildingStructureTypeId)) return false;

  const vendorHaystack = `${offer.vendorName || ""} ${offer.productName || ""}`;
  return isAllianzHouseVendor(vendorHaystack);
}

export function resolveHouseUnavailableOfferReason(
  offer: HouseUnavailableOfferLike,
  buildingStructureTypeId: string | number
): string {
  return resolveHouseUnavailableOfferPresentation(offer, buildingStructureTypeId).display;
}

export function resolveHouseUnavailableOfferPresentation(
  offer: HouseUnavailableOfferLike,
  buildingStructureTypeId: string | number
): PresentedOfferError {
  if (shouldUseAllianzCaramidaPiatraMessage(offer, buildingStructureTypeId)) {
    const technical = extractHouseOfferRawMessage(offer);
    return {
      display: ALLIANZ_CARAMIDA_PIATRA_STRUCTURE_MESSAGE,
      ...(technical && technical !== ALLIANZ_CARAMIDA_PIATRA_STRUCTURE_MESSAGE
        ? { technical }
        : {}),
    };
  }

  const raw = extractHouseOfferRawMessage(offer);
  if (raw) {
    return presentUnavailableOfferError(raw, { vendorName: offer.vendorName });
  }

  const premium = Number(offer.policyPremium);
  const hasPositivePremium = Number.isFinite(premium) && premium > 0;

  if (offer.hasApiError) {
    return { display: "Eroare API la generarea ofertei." };
  }
  if (!hasPositivePremium) {
    return { display: "Prima nu este disponibilă pentru selecție." };
  }
  return { display: "Ofertă indisponibilă." };
}

export interface GroupedUnavailableHouseOffer {
  key: string;
  vendorName: string;
  productNames: string[];
  presentation: PresentedOfferError;
}

export function groupUnavailableHouseOffers(
  offers: HouseUnavailableOfferLike[],
  buildingStructureTypeId: string | number
): GroupedUnavailableHouseOffer[] {
  const groups = new Map<string, GroupedUnavailableHouseOffer>();

  for (const offer of offers) {
    const presentation = resolveHouseUnavailableOfferPresentation(
      offer,
      buildingStructureTypeId
    );
    const vendorName = offer.vendorName?.trim() || "Asigurător indisponibil";
    const productName = offer.productName?.trim() || "Ofertă locuință";
    const key = `${vendorName.toLowerCase()}|${presentation.display}`;

    const existing = groups.get(key);
    if (existing) {
      if (!existing.productNames.includes(productName)) {
        existing.productNames.push(productName);
      }
      continue;
    }

    groups.set(key, {
      key,
      vendorName,
      productNames: [productName],
      presentation,
    });
  }

  return Array.from(groups.values());
}
