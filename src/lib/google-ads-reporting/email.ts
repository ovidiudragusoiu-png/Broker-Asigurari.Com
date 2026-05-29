import { Resend } from "resend";
import type { GoogleAdsReportConfig, RenderedReport } from "./types";

export interface EmailDeliveryResult {
  provider: "resend";
  id?: string;
}

export async function sendWeeklyReportEmail(
  config: GoogleAdsReportConfig,
  report: RenderedReport,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: config.senderEmail,
    to: config.emailRecipient,
    subject: report.subject,
    text: report.text,
    html: report.html,
    attachments: [
      {
        filename: "google-ads-campaign-performance.csv",
        content: Buffer.from(report.csv, "utf8"),
        content_type: "text/csv",
      },
    ],
    tags: [
      {
        name: "automation",
        value: "google-ads-weekly-report",
      },
    ],
  });

  if (response.error) {
    throw new Error(`Resend email delivery failed: ${response.error.message}`);
  }

  return {
    provider: "resend",
    id: response.data?.id,
  };
}
