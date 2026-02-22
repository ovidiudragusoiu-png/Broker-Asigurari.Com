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

/**
 * Validate Romanian phone number.
 */
export function validatePhoneRO(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, "");
  return /^(07\d{8}|40\d{9}|0040\d{9})$/.test(cleaned);
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
