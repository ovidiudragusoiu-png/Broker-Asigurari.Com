import { NextRequest, NextResponse } from "next/server";
import { getClientInfo } from "@/lib/audit/logger";
import { getCurrentUser } from "@/lib/auth/session";
import {
  authorizePolicyDocumentAccess,
  fetchPolicyDocumentUrl,
} from "@/lib/documents/documentAccess";
import { documentPolicyQuerySchema } from "@/lib/validation/schemas";

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

  const parsed = documentPolicyQuerySchema.safeParse({
    policyId: request.nextUrl.searchParams.get("policyId"),
    orderHash: request.nextUrl.searchParams.get("orderHash"),
    offerId: request.nextUrl.searchParams.get("offerId") ?? undefined,
    sessionToken: request.nextUrl.searchParams.get("sessionToken") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri invalizi." }, { status: 400 });
  }

  const { policyId, orderHash, offerId, sessionToken } = parsed.data;
  const user = await getCurrentUser();

  const allowed = await authorizePolicyDocumentAccess({
    policyId,
    orderHash,
    offerId,
    sessionToken,
    userId: user?.id,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  try {
    const url = await fetchPolicyDocumentUrl(policyId, orderHash);
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
