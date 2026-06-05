/**
 * Optional SMS via Twilio (https://www.twilio.com).
 * Romania: use an alphanumeric sender ID if approved, or a Twilio number with SMS capability.
 * Alternative local providers: SMSLink.ro, SendSMS.ro — swap this module when credentials exist.
 */

export interface SmsSendResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
}

function normalizeRomanianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("40") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+4${digits}`;
  if (digits.length === 9 && digits.startsWith("7")) return `+40${digits}`;
  return null;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { sent: false, skipped: true, error: "SMS not configured" };
  }

  const to = normalizeRomanianPhone(params.to);
  if (!to) {
    return { sent: false, skipped: false, error: "Invalid phone number" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: params.body,
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { sent: false, skipped: false, error: text.slice(0, 200) };
    }

    return { sent: true, skipped: false };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

export function buildExpiryReminderSms(params: {
  policyNumber: string | null;
  productLabel: string;
  reminderDays: number;
  endDateFormatted: string;
  renewUrl: string;
}): string {
  const ref = params.policyNumber || params.productLabel;
  const when =
    params.reminderDays === 1
      ? "maine"
      : `in ${params.reminderDays} zile (${params.endDateFormatted})`;
  return `Sigur.Ai: Polita ${ref} expira ${when}. Reinnoieste acum: ${params.renewUrl}`;
}
