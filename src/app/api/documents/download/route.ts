import { NextRequest, NextResponse } from "next/server";
import { insuretechFetch } from "@/lib/api/insuretech";
import { logAudit, hashSha256, getClientInfo } from "@/lib/audit/logger";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "offer" | "policy" | null;
  const id = searchParams.get("id");
  const orderHash = searchParams.get("orderHash");
  const productType = searchParams.get("productType");

  if (!type || !id || !orderHash || !["offer", "policy"].includes(type)) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // Get document URL from InsureTech
    const endpoint =
      type === "offer"
        ? `/online/offers/${numId}/document/v3?orderHash=${orderHash}`
        : `/online/policies/${numId}/document/v3?orderHash=${orderHash}`;

    // Retry once if InsureTech is slow to respond
    let data: { url: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        data = await insuretechFetch<{ url: string }>(endpoint);
        if (data?.url) break;
      } catch (err) {
        if (attempt === 1) throw err;
        // Brief pause before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!data?.url) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const parsed = new URL(data.url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid document URL" }, { status: 400 });
    }

    // Fetch the actual PDF with retry
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(data.url, {
        signal: AbortSignal.timeout(45_000),
      });
      if (response.ok) break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    if (!response?.ok) {
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // SHA-256 hash for tamper detection
    const pdfHash = hashSha256(pdfBuffer);

    // Audit log
    const { ipAddress, userAgent } = getClientInfo(request);
    await logAudit({
      action: "DOCUMENT_DOWNLOADED",
      productType: productType || undefined,
      orderHash,
      offerId: type === "offer" ? numId : undefined,
      policyId: type === "policy" ? numId : undefined,
      ipAddress,
      userAgent,
      pdfHash,
    });

    const filename = type === "offer" ? `oferta-${numId}.pdf` : `polita-${numId}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const statusCode = (err as { status?: number }).status;
    console.error(`[DocumentDownload] Error (${statusCode || "?"}):`, msg, err);
    return NextResponse.json(
      { error: "Failed to process document", detail: msg, apiStatus: statusCode },
      { status: 500 }
    );
  }
}
