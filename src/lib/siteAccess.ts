export const SITE_ACCESS_COOKIE = "site-access-granted";
export const SITE_ACCESS_PATH = "/under-development";
export const SITE_ACCESS_API_PATH = "/api/site-access";
export const SITE_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const textEncoder = new TextEncoder();

export function isSitePasswordGateEnabled(): boolean {
  return (
    process.env.SITE_PREVIEW_MODE === "true" &&
    Boolean(process.env.SITE_PREVIEW_PASSWORD?.trim())
  );
}

export function getSitePreviewPassword(): string | null {
  const password = process.env.SITE_PREVIEW_PASSWORD?.trim();
  return password || null;
}

function getSiteAccessHmacKey(): string {
  return (
    process.env.JWT_SECRET?.trim() ||
    process.env.SITE_PREVIEW_PASSWORD?.trim() ||
    "site-access"
  );
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    textEncoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string compare (Edge-safe, no Node crypto). */
export function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function siteAccessCookieValue(password: string): Promise<string> {
  return hmacSha256Hex(getSiteAccessHmacKey(), password);
}

export function isSiteAccessPasswordValid(
  provided: string,
  expected: string
): boolean {
  return secretsMatch(provided, expected);
}

export async function hasValidSiteAccessCookie(
  cookieValue: string | undefined,
  password: string
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await siteAccessCookieValue(password);
  return secretsMatch(cookieValue, expected);
}
