const BUCHAREST_TZ = "Europe/Bucharest";

export const REMINDER_DAY_OFFSETS = [30, 7, 1] as const;
export type ReminderDayOffset = (typeof REMINDER_DAY_OFFSETS)[number];

export function getBucharestDateParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function parsePolicyEndDate(endDate: string | null): Date | null {
  if (!endDate?.trim()) return null;
  const raw = endDate.trim().split("T")[0];
  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPolicyDateRo(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUCHAREST_TZ,
  });
}

export function daysUntilExpiry(endDate: string | null, today = new Date()): number | null {
  const end = parsePolicyEndDate(endDate);
  if (!end) return null;

  const todayParts = getBucharestDateParts(today);
  const endParts = getBucharestDateParts(end);

  const todayUtc = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  const endUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day);

  return Math.round((endUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function matchesReminderWindow(
  endDate: string | null,
  reminderDays: number,
  today = new Date()
): boolean {
  const remaining = daysUntilExpiry(endDate, today);
  return remaining === reminderDays;
}
