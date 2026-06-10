import { NextRequest, NextResponse } from "next/server";
import { getClientInfo } from "@/lib/audit/logger";
import { fetchOfferDocumentUrl } from "@/lib/documents/documentAccess";
import {
  findCheckoutSession,
  isCheckoutSessionUsable,
} from "@/lib/portal/checkoutSession";
import { documentOfferQuerySchema } from "@/lib/validation/schemas";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function takeRateToken(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const { ipAddress } = getClientInfo(request);
  if (!takeRateToken(ipAddress)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = documentOfferQuerySchema.safeParse({
    offerId: request.nextUrl.searchParams.get("offerId"),
    orderHash: request.nextUrl.searchParams.get("orderHash"),
    sessionToken: request.nextUrl.searchParams.get("sessionToken") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri invalizi." }, { status: 400 });
  }

  const { offerId, orderHash, sessionToken } = parsed.data;

  if (sessionToken) {
    const session = await findCheckoutSession(sessionToken);
    if (
      !session ||
      !isCheckoutSessionUsable(session, orderHash, offerId)
    ) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }
  }

  try {
    const url = await fetchOfferDocumentUrl(offerId, orderHash);
    if (!url) {
      return NextResponse.json(
        { error: "Documentul nu este disponibil." },
        { status: 404 }
      );
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Eroare la descărcarea documentului." },
      { status: 502 }
    );
  }
}
