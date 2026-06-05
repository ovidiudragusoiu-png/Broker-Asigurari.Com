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

/** Runtime origin for emails and auth redirects (supports local dev + Vercel previews). */
export function getRuntimeSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return SITE_URL;
}

export function runtimeAbsoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getRuntimeSiteUrl()}${normalized}`;
}
