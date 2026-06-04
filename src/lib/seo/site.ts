/** Canonical production host (Vercel primary domain). Apex redirects here at the edge. */
export const SITE_URL = "https://www.sigur.ai";
export const SITE_NAME = "Sigur.Ai";
export const SITE_LOCALE = "ro_RO";
export const DEFAULT_DESCRIPTION =
  "Compară și cumpără asigurări online: RCA, călătorie, locuință, CASCO, malpraxis, garanții. Oferte de la asigurătorii din România.";

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
