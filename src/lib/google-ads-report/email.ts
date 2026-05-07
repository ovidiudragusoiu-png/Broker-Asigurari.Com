import { Resend } from "resend";
import { logger } from "./logger";
import type { ReportConfig } from "./types";

interface EmailAttachment {
  filename: string;
  content: string;
}

interface SendReportEmailInput {
  subject: string;
  markdownReport: string;
  config: ReportConfig;
  csvAttachment?: EmailAttachment;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownEmailHtml(markdownReport: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${escapeHtml(markdownReport)}</pre>
    </div>
  `;
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<void> {
  const resend = new Resend(requiredEnv("RESEND_API_KEY"));
  const attachments = input.csvAttachment
    ? [
        {
          filename: input.csvAttachment.filename,
          content: Buffer.from(input.csvAttachment.content).toString("base64"),
        },
      ]
    : undefined;

  const { error } = await resend.emails.send({
    from: input.config.email.sender,
    to: input.config.email.recipient,
    subject: input.subject,
    text: input.markdownReport,
    html: markdownEmailHtml(input.markdownReport),
    attachments,
  });

  if (error) {
    logger.error("Failed to send Google Ads weekly report email.", { error });
    throw new Error(`Failed to send report email: ${error.message}`);
  }

  logger.info("Google Ads weekly report email sent.", {
    recipient: input.config.email.recipient,
    subject: input.subject,
    hasCsvAttachment: Boolean(input.csvAttachment),
  });
}
