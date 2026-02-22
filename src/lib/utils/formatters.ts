/**
 * Formatting utilities.
 */

/**
 * Bucharest sector county codes map.
 * In the InsureTech API, Bucharest sectors are represented as counties with codes B1-B6.
 */
export const BUCHAREST_SECTORS: Record<string, string> = {
  B1: "Sector 1",
  B2: "Sector 2",
  B3: "Sector 3",
  B4: "Sector 4",
  B5: "Sector 5",
  B6: "Sector 6",
};

/**
 * Romania country ID in the InsureTech API.
 */
export const ROMANIA_COUNTRY_ID = 185;

/**
 * Format a date to YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a date to YYYY-MM-DDTHH:mm:ss (no timezone).
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

/**
 * Format price with Romanian locale.
 */
export function formatPrice(amount: number, currency = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate policy end date (start + 1 year - 1 day).
 */
export function calculatePolicyEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  return endDate;
}
