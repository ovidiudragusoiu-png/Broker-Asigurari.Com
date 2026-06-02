/**
 * Validation utilities for Romanian-specific data.
 */

/**
 * Validate a Romanian CNP (Cod Numeric Personal).
 * 13 digits with checksum validation.
 */
export function validateCNP(cnp: string): boolean {
  if (!/^\d{13}$/.test(cnp)) return false;

  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const digits = cnp.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights[i];
  }

  let checkDigit = sum % 11;
  if (checkDigit === 10) checkDigit = 1;

  return checkDigit === digits[12];
}

/**
 * Validate a Romanian CUI (Cod Unic de Identificare).
 */
export function validateCUI(cui: string): boolean {
  const cleaned = cui.replace(/^RO/i, "").trim();
  if (!/^\d{2,10}$/.test(cleaned)) return false;

  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cleaned.split("").map(Number);
  const checkDigit = digits.pop()!;

  // Pad to 9 digits from left
  while (digits.length < 9) {
    digits.unshift(0);
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }

  let expected = (sum * 10) % 11;
  if (expected === 10) expected = 0;

  return expected === checkDigit;
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Major consumer email providers — skip DNS/MX checks (often flaky in dev or restricted networks). */
const KNOWN_EMAIL_PROVIDER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "outlook.com",
  "outlook.ro",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "tutanota.com",
  "tuta.io",
]);

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 ? domain : null;
}

export function isKnownEmailProviderDomain(domain: string): boolean {
  return KNOWN_EMAIL_PROVIDER_DOMAINS.has(domain.trim().toLowerCase());
}

export function isKnownEmailProvider(email: string): boolean {
  const domain = getEmailDomain(email);
  return domain !== null && isKnownEmailProviderDomain(domain);
}

/**
 * Common email domain typos → correct domain.
 * Returns a suggested correction or null if the domain looks fine.
 */
const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmaul.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.ro": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmai.com": "gmail.com",
  "gimail.com": "gmail.com",
  // Yahoo
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "yaoo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahoo.ro": "yahoo.com",
  "yahoo.comm": "yahoo.com",
  "yhoo.com": "yahoo.com",
  // Hotmail / Outlook
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  // iCloud
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
  // Proton
  "protonmal.com": "protonmail.com",
  "protonmail.co": "protonmail.com",
};

export function suggestEmailTypo(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  const lowerDomain = domain.toLowerCase();
  const correction = DOMAIN_TYPOS[lowerDomain];
  if (correction) return `${local}@${correction}`;
  return null;
}

/**
 * Validate Romanian phone number.
 */
export function validatePhoneRO(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  return /^(07\d{8}|40\d{9}|0040\d{9})$/.test(cleaned);
}

/**
 * Extract date of birth from a Romanian CNP as "YYYY-MM-DDTHH:mm:ss" string.
 * Returns null if CNP is invalid or date cannot be extracted.
 * CNP structure: S YY MM DD CC NNN C
 *   S = sex/century digit (1/2=1900s, 5/6=2000s, 7/8=resident)
 */
export function dateOfBirthFromCNP(cnp: string): string | null {
  if (!/^\d{13}$/.test(cnp)) return null;

  const s = Number(cnp[0]);
  const yy = Number(cnp.substring(1, 3));
  const mm = cnp.substring(3, 5);
  const dd = cnp.substring(5, 7);

  let century: number;
  if (s === 1 || s === 2) century = 1900;
  else if (s === 3 || s === 4) century = 1800;
  else if (s === 5 || s === 6) century = 2000;
  else century = 1900; // 7/8 = foreign residents, assume 1900s

  const year = century + yy;
  return `${year}-${mm}-${dd}T00:00:00`;
}

/**
 * Validate VIN (Vehicle Identification Number) - 17 characters.
 */
export function validateVIN(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Validate Romanian license plate format.
 * Bucharest: B + 2-3 digits + 3 letters (e.g., B11XXX, B111XXX)
 * Counties: 2-letter county code + 2-3 digits + 3 letters (e.g., IS11XXX)
 */
export function validateLicensePlate(plate: string): boolean {
  const cleaned = plate.replace(/[\s\-]/g, "").toUpperCase();
  return /^(B\d{2,3}[A-Z]{3}|[A-Z]{2}\d{2,3}[A-Z]{3})$/.test(cleaned);
}
