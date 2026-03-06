import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

/**
 * Validates an email domain by checking for MX (mail exchange) records.
 * This confirms the domain can actually receive email.
 * POST { email: "user@domain.com" } → { valid: true/false, suggestion?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ valid: false, reason: "invalid_format" });
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || domain.length < 3 || !domain.includes(".")) {
      return NextResponse.json({ valid: false, reason: "invalid_domain" });
    }

    // Check MX records (does this domain accept email?)
    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        return NextResponse.json({ valid: false, reason: "no_mx_records" });
      }
      return NextResponse.json({ valid: true });
    } catch (dnsErr) {
      const code = (dnsErr as NodeJS.ErrnoException).code;
      // ENOTFOUND = domain doesn't exist, ENODATA = no MX records
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "SERVFAIL") {
        return NextResponse.json({ valid: false, reason: "domain_not_found" });
      }
      // DNS timeout or transient error — don't block the user
      console.warn("[EmailValidate] DNS error for", domain, code);
      return NextResponse.json({ valid: true, reason: "dns_timeout" });
    }
  } catch {
    // If anything fails, don't block the user
    return NextResponse.json({ valid: true });
  }
}
