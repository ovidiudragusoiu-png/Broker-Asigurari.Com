import { NextRequest, NextResponse } from "next/server";
import { logAudit, getClientInfo } from "@/lib/audit/logger";

export async function POST(request: NextRequest) {
  try {
    const { ipAddress, userAgent } = getClientInfo(request);
    const data = await request.json();

    await logAudit({
      action: "DOCUMENT_DOWNLOADED",
      productType: data.productType || undefined,
      orderHash: data.orderHash || undefined,
      offerId: data.offerId ? Number(data.offerId) : undefined,
      policyId: data.policyId ? Number(data.policyId) : undefined,
      email: data.email || undefined,
      ipAddress,
      userAgent,
      payload: { docType: data.docType, docId: data.docId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Never fail the client
  }
}
