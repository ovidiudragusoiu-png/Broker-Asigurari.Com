import type { DateRange, ReportDateRanges } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function dateOnlyUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function formatGoogleAdsDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildRange(label: string, start: Date, end: Date): DateRange {
  return {
    label,
    startDate: formatGoogleAdsDate(start),
    endDate: formatGoogleAdsDate(end),
  };
}

export function getWeeklyReportDateRanges(now = new Date(), timezone = "Europe/Bucharest"): ReportDateRanges {
  const todayParts = localDateParts(now, timezone);
  const today = dateOnlyUtc(todayParts.year, todayParts.month, todayParts.day);
  const last7End = addDays(today, -1);
  const last7Start = addDays(last7End, -6);
  const previous7End = addDays(last7Start, -1);
  const previous7Start = addDays(previous7End, -6);
  const monthStart = dateOnlyUtc(todayParts.year, todayParts.month, 1);

  return {
    last7Days: buildRange("Last 7 days", last7Start, last7End),
    previous7Days: buildRange("Previous 7 days", previous7Start, previous7End),
    monthToDate:
      last7End >= monthStart
        ? buildRange("Month to date", monthStart, last7End)
        : undefined,
    generatedAt: new Intl.DateTimeFormat("ro-RO", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now),
    timezone,
  };
}

export function formatDateRangeForSubject(range: DateRange): string {
  return `${range.startDate} to ${range.endDate}`;
}
