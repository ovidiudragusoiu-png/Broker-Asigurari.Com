import { Resend } from "resend";
import type { GoogleAdsReportConfig, RenderedReport } from "./types";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes("your-") || key.includes("your_")) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(key);
}

function formatSender(senderEmail: string): string {
  if (senderEmail.includes("<")) {
    return senderEmail;
  }
  return `Google Ads Reports <${senderEmail}>`;
}

export async function sendReportEmail(report: RenderedReport, config: GoogleAdsReportConfig) {
  const result = await getResendClient().emails.send({
    from: formatSender(config.senderEmail),
    to: [config.emailRecipient],
    subject: report.subject,
    html: report.html,
    text: report.text,
    attachments: [
      {
        filename: `google-ads-weekly-report-${new Date().toISOString().slice(0, 10)}.csv`,
        content: Buffer.from(report.csv, "utf8"),
      },
    ],
  });

  if (result.error) {
    throw new Error(`Resend failed to send Google Ads report: ${result.error.message}`);
  }

  return result.data;
}
