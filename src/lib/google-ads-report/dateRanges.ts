import type { DateRange, DateRangeSet } from "./types";

const millisecondsPerDay = 24 * 60 * 60 * 1000;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const dayOfWeekToCronValue: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getDatePartsInTimezone(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve local date for timezone ${timezone}.`);
  }

  return { year, month, day };
}

function dateFromParts(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * millisecondsPerDay);
}

function formatGoogleAdsDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRange(label: string, start: Date, end: Date): DateRange {
  return {
    label,
    startDate: formatGoogleAdsDate(start),
    endDate: formatGoogleAdsDate(end),
  };
}

export function buildWeeklyDateRanges(now = new Date(), timezone = "Europe/Bucharest"): DateRangeSet {
  const localToday = dateFromParts(getDatePartsInTimezone(now, timezone));
  const yesterday = addDays(localToday, -1);
  const currentStart = addDays(localToday, -7);
  const previousStart = addDays(localToday, -14);
  const previousEnd = addDays(localToday, -8);
  const monthStart = new Date(Date.UTC(localToday.getUTCFullYear(), localToday.getUTCMonth(), 1));

  return {
    current: buildRange("Last 7 days", currentStart, yesterday),
    previous: buildRange("Previous 7 days", previousStart, previousEnd),
    monthToDate:
      monthStart.getTime() <= yesterday.getTime()
        ? buildRange("Month to date", monthStart, yesterday)
        : undefined,
  };
}

export function buildCronExpression(dayOfWeek: string, time: string): string {
  const day = dayOfWeekToCronValue[dayOfWeek.toLowerCase()];
  if (day === undefined) {
    throw new Error(`Unsupported report day: ${dayOfWeek}`);
  }

  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid report time: ${time}`);
  }

  return `${minute} ${hour} * * ${day}`;
}
