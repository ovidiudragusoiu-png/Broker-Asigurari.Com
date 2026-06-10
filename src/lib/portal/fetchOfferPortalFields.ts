import { insuretechFetch } from "@/lib/api/insuretech";
import {
  buildOfferDetailsPath,
  extractOfferPortalFields,
  type OfferPortalFields,
} from "@/lib/portal/offerDetails";

export async function fetchOfferPortalFields(
  productType: string,
  offerId: number,
  orderHash: string
): Promise<OfferPortalFields | null> {
  try {
    const path = buildOfferDetailsPath(productType, offerId, orderHash);
    const details = await insuretechFetch<Record<string, unknown>>(path);
    return extractOfferPortalFields(details);
  } catch {
    return null;
  }
}
