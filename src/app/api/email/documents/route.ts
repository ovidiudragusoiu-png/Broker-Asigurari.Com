import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { insuretechFetch } from "@/lib/api/insuretech";
import { logAudit, hashSha256 } from "@/lib/audit/logger";
import { validateBody, emailDocumentsSchema, type EmailDocumentsData } from "@/lib/validation/schemas";

export const maxDuration = 60;

const BROKER_CC = ["bucuresti@broker-asigurari.com", "office@sigur.ai"];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

async function fetchPdfBuffer(
  docType: "offer" | "policy",
  id: number,
  orderHash: string,
  auditContext: { email?: string; productType?: string },
  filenameOverride?: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const endpoint =
      docType === "offer"
        ? `/online/offers/${id}/document/v3?orderHash=${orderHash}`
        : `/online/policies/${id}/document/v3?orderHash=${orderHash}`;

    const data = await insuretechFetch<{ url: string }>(endpoint);
    if (!data?.url) return null;

    const parsed = new URL(data.url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const response = await fetch(data.url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // SHA-256 hash of original PDF for tamper detection
    const pdfHash = hashSha256(pdfBuffer);

    // Log document with hash for anti-fraud audit trail
    await logAudit({
      action: "DOCUMENT_EMAILED",
      productType: auditContext.productType,
      orderHash,
      offerId: docType === "offer" ? id : undefined,
      policyId: docType === "policy" ? id : undefined,
      email: auditContext.email,
      pdfHash,
    });

    return {
      buffer: pdfBuffer,
      filename:
        filenameOverride ??
        (docType === "offer" ? `oferta-${id}.pdf` : `polita-${id}.pdf`),
    };
  } catch (err) {
    console.error(`[DocumentEmail] Failed to fetch ${docType} ${id}:`, err);
    return null;
  }
}

function sanitizePdfFilename(label: string, suffix: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "supliment"}-${suffix}.pdf`;
}

function getProductLabel(productType: string): string {
  const labels: Record<string, string> = {
    RCA: "RCA",
    TRAVEL: "de Călătorie",
    HOUSE: "de Locuință",
    PAD: "PAD",
    MALPRAXIS: "Malpraxis",
    CASCO: "CASCO",
  };
  return labels[productType?.toUpperCase()] || "de asigurare";
}

function buildEmailHtml(
  data: EmailDocumentsData,
  hasAttachments: boolean,
  isEuroins = false,
  addonCount = 0
): string {
  const productLabel = getProductLabel(data.productType);
  const dateRange =
    data.startDate && data.endDate
      ? `${data.startDate.split("T")[0]} &mdash; ${data.endDate.split("T")[0]}`
      : null;

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">${label}</td>
      <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9">${value}</td>
    </tr>`;

  const rows = [
    data.policyNumber ? detailRow("Numar polita", data.policyNumber) : "",
    data.vendorName ? detailRow("Asigurator", data.vendorName) : "",
    dateRange ? detailRow("Valabilitate", dateRange) : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="text-align:center;padding:32px 24px;background:#2563EB;border-radius:16px 16px 0 0">
    <div style="font-size:40px;margin-bottom:12px">&#10003;</div>
    <h1 style="color:white;font-size:22px;margin:0 0 8px">Polita ta ${productLabel} a fost emisa!</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0">Iti multumim ca ai ales Sigur.Ai</p>
  </div>

  <div style="background:white;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    ${rows ? `<table style="width:100%;border-collapse:collapse">${rows}</table>` : ""}

    <div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:12px;border-left:4px solid #2563EB">
      <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600">
        ${hasAttachments
          ? addonCount > 0
            ? "Documentele politei RCA, ofertei si produselor suplimentare atasate sunt incluse in acest email."
            : "Documentele politei si ofertei sunt atasate acestui email."
          : isEuroins
            ? "Polita a fost emisa automat de asigurator. Veti primi documentele direct de la asigurator."
            : "Documentele vor fi disponibile pentru descarcare din contul tau pe sigur.ai."}
      </p>
    </div>
  </div>

  <div style="background:white;padding:0 24px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center">
    <a href="https://sigur.ai/dashboard"
       style="display:inline-block;background:#2563EB;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;margin-top:8px">
      Vezi politele tale
    </a>
  </div>

  <div style="padding:20px 24px;text-align:center;border-radius:0 0 16px 16px;background:white;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8">
      Sigur.Ai prin FLETHO LLC SRL &middot; Autorizata ASF &middot; RAJ506943
    </p>
    <p style="margin:0;font-size:11px;color:#cbd5e1">
      0720 38 55 51 &middot; office@sigur.ai
    </p>
  </div>

</div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, emailDocumentsSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    // Euroins auto-creates the policy and blocks all document endpoints.
    // Skip PDF fetch entirely to avoid errors; send notification-only email.
    const isEuroins = data.vendorName?.toLowerCase().includes("euroins");

    let attachments: { filename: string; content: Buffer }[] = [];

    if (!isEuroins) {
      // Fetch documents in parallel (with PDF protection + hash logging)
      const ctx = { email: data.email, productType: data.productType };
      const promises: Promise<{ buffer: Buffer; filename: string } | null>[] = [
        fetchPdfBuffer("offer", data.offerId, data.orderHash, ctx),
      ];
      if (data.policyId) {
        promises.push(fetchPdfBuffer("policy", data.policyId, data.orderHash, ctx));
      }
      if (data.padPolicyId) {
        promises.push(
          fetchPdfBuffer("policy", data.padPolicyId, data.orderHash, ctx)
        );
      }
      for (const addon of data.additionalDocuments ?? []) {
        const label = addon.label?.trim() || `Supliment ${addon.offerId}`;
        if (addon.policyId) {
          promises.push(
            fetchPdfBuffer(
              "policy",
              addon.policyId,
              data.orderHash,
              ctx,
              sanitizePdfFilename(label, "polita")
            )
          );
        } else {
          promises.push(
            fetchPdfBuffer(
              "offer",
              addon.offerId,
              data.orderHash,
              ctx,
              sanitizePdfFilename(label, "oferta")
            )
          );
        }
      }

      const results = await Promise.allSettled(promises);
      attachments = results
        .filter(
          (r): r is PromiseFulfilledResult<{ buffer: Buffer; filename: string }> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => ({
          filename: r.value.filename,
          content: r.value.buffer,
        }));
    }

    const productLabel = getProductLabel(data.productType);
    const addonCount = data.additionalDocuments?.length ?? 0;
    const html = buildEmailHtml(data, attachments.length > 0, isEuroins, addonCount);

    const result = await getResend().emails.send({
      from: `Sigur.Ai <noreply@broker-asigurari.com>`,
      to: [data.email],
      bcc: BROKER_CC,
      subject: `Polita ta ${productLabel}${data.policyNumber ? ` — ${data.policyNumber}` : ""}`,
      html,
      attachments,
    });

    console.log(
      "[DocumentEmail] Sent to",
      data.email,
      "attachments:",
      attachments.length
    );

    if (result.error) {
      console.error("[DocumentEmail] Resend error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DocumentEmail] Error:", err);
    return NextResponse.json(
      { error: "Failed to send document email" },
      { status: 500 }
    );
  }
}
