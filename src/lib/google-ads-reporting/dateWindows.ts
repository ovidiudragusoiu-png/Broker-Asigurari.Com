import type { DateRange, ReportDateWindows } from "./types";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function toUtcLocalMidnight(date: Date, timezone: string) {
  const parts = localDateParts(date, timezone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function buildWeeklyDateWindows(timezone: string, referenceDate = new Date()): ReportDateWindows {
  const today = toUtcLocalMidnight(referenceDate, timezone);
  const last7End = addDays(today, -1);
  const last7Start = addDays(last7End, -6);
  const previous7End = addDays(last7Start, -1);
  const previous7Start = addDays(previous7End, -6);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const monthToDate: DateRange | undefined =
    monthStart <= last7End
      ? {
          start: formatDate(monthStart),
          end: formatDate(last7End),
        }
      : undefined;

  return {
    generatedAt: referenceDate.toISOString(),
    timezone,
    last7Days: {
      start: formatDate(last7Start),
      end: formatDate(last7End),
    },
    previous7Days: {
      start: formatDate(previous7Start),
      end: formatDate(previous7End),
    },
    monthToDate,
  };
}

export function formatDateRange(range: DateRange) {
  return `${range.start} to ${range.end}`;
}
