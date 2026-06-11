/**
 * Validates payment redirect URLs returned by InsureTech.
 *
 * @see docs/insuretech-rca.txt §6 — production payment page varies by broker;
 * staging: `{apiHost}/online/broker/payments/pub/pay?token=...`
 * production (broker): e.g. `maxygo.insuretech.ro/api/v1/public/payments/link?token=...`
 */

const KNOWN_PSP_HOSTS = new Set([
  "maxygo.insuretech.ro",
  "pay.insuretech.ro",
  "secure.euplatesc.ro",
  "secure.mobilpay.ro",
  "mobilpay.ro",
]);

function extraHostsFromEnv(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ALLOWED_PAYMENT_HOSTS ||
    process.env.ALLOWED_PAYMENT_HOSTS ||
    "";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function isInsuretechPaymentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "insuretech.ro" || host.endsWith(".insuretech.ro");
}

function isInsuretechPaymentPath(pathname: string): boolean {
  return (
    pathname.includes("/broker/payments/") ||
    pathname.includes("/public/payments/") ||
    pathname.includes("/payments/link")
  );
}

export function isAllowedPaymentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (KNOWN_PSP_HOSTS.has(host) || extraHostsFromEnv().includes(host)) {
      return true;
    }

    if (isInsuretechPaymentHost(host)) {
      return host === "pay.insuretech.ro" || isInsuretechPaymentPath(parsed.pathname);
    }

    return false;
  } catch {
    return false;
  }
}

export function assertAllowedPaymentUrl(url: string): void {
  if (!isAllowedPaymentUrl(url)) {
    throw new Error("URL plata invalid");
  }
}
