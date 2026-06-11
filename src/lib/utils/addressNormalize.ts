import type { AddressRequest } from "@/types/insuretech";

/** Insuretech id for "Strada" — not 1 (which is "Alee"). */
export const INSURETECH_STREET_TYPE_STRADA = 41;

const STREET_TYPE_PREFIX =
  /^(strada|str\.?|st\.?|calea|cale|bulevardul|bulevard|bd\.?|soseaua|sos\.?|aleea|alee|piata|piața|intrarea|drumul)\s+/i;

const NO_STREET_PLACEHOLDER =
  /^[-–—.\/\\]$|^(n\/a|na|fara|fără)(\s+strad[aă]?)?\.?$/i;

/** True for "-", ".", "fara strada", etc. — localities without a named street. */
export function isNoStreetNamePlaceholder(streetName: string): boolean {
  const trimmed = streetName.trim();
  if (!trimmed) return false;
  return NO_STREET_PLACEHOLDER.test(trimmed);
}

/** Strip a leading street-type label when the UI stored "Strada Victoriei" in streetName. */
export function bareStreetName(streetName: string): string {
  let bare = streetName.trim();
  while (STREET_TYPE_PREFIX.test(bare)) {
    bare = bare.replace(STREET_TYPE_PREFIX, "").trim();
  }
  return bare;
}

/**
 * Shape address payloads for Insuretech / PAID:
 * - bare street name (type lives in streetTypeId)
 * - Strada (41) as default — id 1 is "Alee", which made PAID render "0" instead of "-"
 * - localities without a street: Strada + "-"
 */
export function normalizeAddressForInsuretech<T extends AddressRequest>(address: T): T {
  const bare = bareStreetName(address.streetName);

  if (isNoStreetNamePlaceholder(bare) || isNoStreetNamePlaceholder(address.streetName)) {
    return {
      ...address,
      streetName: "-",
      streetTypeId: INSURETECH_STREET_TYPE_STRADA,
    };
  }

  return {
    ...address,
    streetName: bare,
    streetTypeId: address.streetTypeId ?? INSURETECH_STREET_TYPE_STRADA,
  };
}
