import { Resend } from "resend";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";
import { formatPolicyDateRo, parsePolicyEndDate } from "@/lib/reminders/expiryDates";

const BROKER_CC = ["office@sigur.ai"];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function getProductLabel(productType: string): string {
  return getProductTypeConfig(productType).label;
}

function urgencyColor(days: number): string {
  if (days <= 1) return "#dc2626";
  if (days <= 7) return "#d97706";
  return "#2563EB";
}

function buildExpiryReminderHtml(params: {
  firstName?: string | null;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  startDate: string | null;
  endDate: string | null;
  reminderDays: number;
  renewUrl: string;
  hasAttachment: boolean;
}): string {
  const greeting = params.firstName?.trim()
    ? `Bună, ${params.firstName.trim()}!`
    : "Bună!";
  const productLabel = getProductLabel(params.productType);
  const endFormatted = formatPolicyDateRo(parsePolicyEndDate(params.endDate));
  const startFormatted = formatPolicyDateRo(parsePolicyEndDate(params.startDate));
  const policyRef = params.policyNumber || "polița ta";
  const accent = urgencyColor(params.reminderDays);

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9">${label}</td>
      <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9">${value}</td>
    </tr>`;

  const rows = [
    detailRow("Tip asigurare", productLabel),
    params.policyNumber ? detailRow("Număr poliță", params.policyNumber) : "",
    params.vendorName ? detailRow("Asigurator", params.vendorName) : "",
    startFormatted !== "—" && endFormatted !== "—"
      ? detailRow("Valabilitate", `${startFormatted} — ${endFormatted}`)
      : detailRow("Data expirării", endFormatted),
    detailRow(
      "Zile rămase",
      params.reminderDays === 1 ? "1 zi" : `${params.reminderDays} zile`
    ),
  ].join("");

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="text-align:center;padding:32px 24px;background:${accent};border-radius:16px 16px 0 0">
    <div style="font-size:36px;margin-bottom:12px">&#9200;</div>
    <h1 style="color:white;font-size:22px;margin:0 0 8px">Polița ta expiră în ${params.reminderDays === 1 ? "1 zi" : `${params.reminderDays} zile`}</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0">Reînnoiește la timp și rămâi protejat</p>
  </div>

  <div style="background:white;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">
      Îți reamintim că polița ta <strong>${productLabel}</strong> cu numărul
      <strong>${policyRef}</strong> expiră pe <strong>${endFormatted}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">${rows}</table>

    <div style="padding:16px;background:#eff6ff;border-radius:12px;border-left:4px solid #2563EB">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5">
        ${
          params.hasAttachment
            ? "Polița curentă este atașată acestui email pentru referință."
            : "Poți descărca polița din contul tău Sigur.Ai."
        }
      </p>
    </div>
  </div>

  <div style="background:white;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center">
    <a href="${params.renewUrl}"
       style="display:inline-block;background:#2563EB;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">
      Reînnoiește acum
    </a>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b">
      <a href="${runtimeAbsoluteUrl("/dashboard")}" style="color:#2563EB;text-decoration:none">Vezi polițele tale</a>
    </p>
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

export async function sendExpiryReminderEmail(params: {
  email: string;
  firstName?: string | null;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  startDate: string | null;
  endDate: string | null;
  reminderDays: number;
  renewUrl: string;
  attachment?: { filename: string; content: Buffer } | null;
}) {
  const productLabel = getProductLabel(params.productType);
  const policyRef = params.policyNumber ? ` — ${params.policyNumber}` : "";
  const html = buildExpiryReminderHtml({
    ...params,
    hasAttachment: Boolean(params.attachment),
  });

  const result = await getResend().emails.send({
    from: "Sigur.Ai <noreply@broker-asigurari.com>",
    to: [params.email],
    bcc: BROKER_CC,
    subject: `Polița ta ${productLabel}${policyRef} expiră în ${params.reminderDays === 1 ? "1 zi" : `${params.reminderDays} zile`}`,
    html,
    attachments: params.attachment ? [params.attachment] : undefined,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}
