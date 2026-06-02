export const SITE_ACCESS_COOKIE = "site-access-granted";
export const SITE_ACCESS_PATH = "/under-development";
export const SITE_ACCESS_API_PATH = "/api/site-access";
export const SITE_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const textEncoder = new TextEncoder();

/** Trim and strip optional surrounding quotes from .env values. */
function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  let normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized || null;
}

/** Cookie options for site-access; Secure only on HTTPS (works on http://LAN-IP in dev). */
export function siteAccessCookieOptions(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SITE_ACCESS_COOKIE_MAX_AGE,
  };
}

export function isSitePasswordGateEnabled(): boolean {
  return (
    normalizeEnvValue(process.env.SITE_PREVIEW_MODE) === "true" &&
    Boolean(getSitePreviewPassword())
  );
}

export function getSitePreviewPassword(): string | null {
  return normalizeEnvValue(process.env.SITE_PREVIEW_PASSWORD);
}

function getSiteAccessHmacKey(): string {
  return (
    normalizeEnvValue(process.env.JWT_SECRET) ||
    getSitePreviewPassword() ||
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

/** Trim user input; env password is already trimmed in getSitePreviewPassword(). */
export function normalizeSiteAccessPassword(input: string): string {
  return input.trim();
}

export function isSiteAccessPasswordValid(
  provided: string,
  expected: string
): boolean {
  return secretsMatch(normalizeSiteAccessPassword(provided), expected);
}

export async function hasValidSiteAccessCookie(
  cookieValue: string | undefined,
  password: string
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await siteAccessCookieValue(password);
  return secretsMatch(cookieValue, expected);
}
