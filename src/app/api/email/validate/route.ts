import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";
import { validateBody, emailValidateSchema } from "@/lib/validation/schemas";

/**
 * Validates an email domain by checking for MX (mail exchange) records.
 * This confirms the domain can actually receive email.
 * POST { email: "user@domain.com" } → { valid: true/false, suggestion?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, emailValidateSchema);
    if ("error" in parsed) return NextResponse.json({ valid: false, reason: "invalid_format" });
    const { email } = parsed.data;

    if (!email.includes("@")) {
      return NextResponse.json({ valid: false, reason: "invalid_format" });
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || domain.length < 3 || !domain.includes(".")) {
      return NextResponse.json({ valid: false, reason: "invalid_domain" });
    }

    // Check MX records first, then fall back to A record (RFC 5321 §5)
    try {
      const records = await dns.resolveMx(domain);
      if (records && records.length > 0) {
        return NextResponse.json({ valid: true });
      }
    } catch {
      // MX lookup failed — fall through to A record check
    }

    // Fallback: if domain has an A/AAAA record it can still receive mail
    try {
      await dns.resolve4(domain);
      return NextResponse.json({ valid: true });
    } catch {
      // No A record either
    }

    try {
      await dns.resolve6(domain);
      return NextResponse.json({ valid: true });
    } catch {
      // No AAAA record either
    }

    // No MX, A, or AAAA — domain likely doesn't exist
    return NextResponse.json({ valid: false, reason: "domain_not_found" });
  } catch {
    // If anything fails, don't block the user
    return NextResponse.json({ valid: true });
  }
}
