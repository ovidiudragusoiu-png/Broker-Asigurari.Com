import { Resend } from "resend";
import type { DntSummaryRow } from "@/lib/email/dntSummaryFormatters";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDntSummaryHtml(params: {
  firstName?: string | null;
  productType: string;
  rows: DntSummaryRow[];
  submittedAt: Date;
}): string {
  const greeting = params.firstName?.trim()
    ? `Bună, ${escapeHtml(params.firstName.trim())}!`
    : "Bună!";
  const productLabel = getProductTypeConfig(params.productType).label;
  const calculatorHref = getProductTypeConfig(params.productType).calculatorHref;
  const continueUrl = runtimeAbsoluteUrl(calculatorHref);
  const submittedLabel = params.submittedAt.toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    dateStyle: "long",
    timeStyle: "short",
  });

  const tableRows = params.rows
    .map(
      (row) => `
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;vertical-align:top;width:55%">${escapeHtml(row.question)}</td>
      <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;vertical-align:top">${escapeHtml(row.answer)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="text-align:center;padding:32px 24px;background:#2563EB;border-radius:16px 16px 0 0">
    <h1 style="color:white;font-size:22px;margin:0 0 8px">Opțiunile tale DNT</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0">${escapeHtml(productLabel)}</p>
  </div>

  <div style="background:white;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">
      Acest email confirmă opțiunile selectate la pasul DNT pentru asigurarea
      <strong>${escapeHtml(productLabel)}</strong>, la data de
      <strong>${escapeHtml(submittedLabel)}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Întrebare</th>
          <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">Opțiunea aleasă</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b">
      Păstrează acest email pentru referință. Dacă ai întrebări, ne poți contacta la
      <a href="mailto:office@sigur.ai" style="color:#2563EB;text-decoration:none">office@sigur.ai</a>
      sau la telefon 0720 38 55 51.
    </p>
  </div>

  <div style="background:white;padding:0 24px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center">
    <a href="${continueUrl}"
       style="display:inline-block;background:#2563EB;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;margin-top:8px">
      Continuă pe Sigur.Ai
    </a>
  </div>

  <div style="padding:20px 24px;text-align:center;border-radius:0 0 16px 16px;background:white;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8">
      Sigur.Ai prin FLETHO LLC SRL &middot; Autorizată ASF &middot; RAJ506943
    </p>
    <p style="margin:0;font-size:11px;color:#cbd5e1">
      0720 38 55 51 &middot; office@sigur.ai
    </p>
  </div>

</div>
</body>
</html>`;
}

export async function sendDntSummaryEmail(params: {
  email: string;
  firstName?: string | null;
  productType: string;
  rows: DntSummaryRow[];
}): Promise<void> {
  const productLabel = getProductTypeConfig(params.productType).label;
  const subject = `Sigur.ai - Optiunile tale DNT - ${productLabel}`;
  const html = buildDntSummaryHtml({
    firstName: params.firstName,
    productType: params.productType,
    rows: params.rows,
    submittedAt: new Date(),
  });

  const result = await getResend().emails.send({
    from: "Sigur.Ai <noreply@broker-asigurari.com>",
    to: params.email,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export { buildDntSummaryHtml };
