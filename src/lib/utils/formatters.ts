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
 * Format a date to YYYY-MM-DDTHH:mm:ss (local time, no timezone).
 */
export function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
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
 * Extract date of birth from a Romanian CNP (13 digits).
 * Format: SAALLZZJJNNNC where S=sex/century, AA=year, LL=month, ZZ=day.
 * Returns ISO date string (YYYY-MM-DD) or null if invalid.
 */
export function birthDateFromCnp(cnp: string | number): string | null {
  const s = String(cnp).replace(/\D/g, "");
  if (s.length !== 13) return null;

  const century: Record<string, number> = {
    "1": 1900, "2": 1900, "3": 1800, "4": 1800,
    "5": 2000, "6": 2000, "7": 1900, "8": 1900, "9": 1900,
  };
  const base = century[s[0]];
  if (!base) return null;

  const year = base + Number(s.slice(1, 3));
  const month = s.slice(3, 5);
  const day = s.slice(5, 7);

  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (isNaN(date.getTime())) return null;

  return `${year}-${month}-${day}`;
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
