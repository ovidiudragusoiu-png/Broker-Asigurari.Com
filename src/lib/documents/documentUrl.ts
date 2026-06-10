export function parseDocumentUrl(data: unknown): string | null {
  const url = typeof data === "string" ? data : (data as { url?: string })?.url;
  if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
  return null;
}
