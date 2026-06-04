const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parses display dates like "15 Feb 2025" from blog articles. */
export function parseArticleDisplayDate(date: string): Date | undefined {
  const match = date.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = MONTH_MAP[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) {
    return undefined;
  }

  return new Date(Date.UTC(year, month, day));
}

export function articleDateToIso(date: string): string | undefined {
  const parsed = parseArticleDisplayDate(date);
  return parsed?.toISOString();
}
