import { prisma } from "@/lib/db/prisma";
import {
  fetchPolicyPdfBuffer,
  isEuroinsVendor,
  sanitizePdfFilename,
} from "@/lib/documents/fetchPolicyPdf";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";
import {
  buildExpiryReminderSms,
  isSmsConfigured,
  sendSms,
} from "@/lib/sms/twilio";
import {
  daysUntilExpiry,
  formatPolicyDateRo,
  matchesReminderWindow,
  parsePolicyEndDate,
} from "@/lib/reminders/expiryDates";
import {
  getReminderSettings,
  type ReminderSettingsData,
} from "@/lib/reminders/reminderSettings";
import { sendExpiryReminderEmail } from "@/lib/reminders/expiryReminderEmail";

export interface ReminderRunResult {
  scanned: number;
  emailSent: number;
  emailSkipped: number;
  emailFailed: number;
  smsSent: number;
  smsSkipped: number;
  smsFailed: number;
  errors: string[];
}

type PolicyRow = {
  id: string;
  userId: string | null;
  email: string;
  orderHash: string;
  policyId: number;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  startDate: string | null;
  endDate: string | null;
};

async function resolveFirstName(
  policy: PolicyRow
): Promise<string | null> {
  if (policy.userId) {
    const user = await prisma.user.findUnique({
      where: { id: policy.userId },
      select: { firstName: true },
    });
    if (user?.firstName) return user.firstName;
  }
  const user = await prisma.user.findUnique({
    where: { email: policy.email.toLowerCase().trim() },
    select: { firstName: true },
  });
  return user?.firstName ?? null;
}

async function resolvePhone(policy: PolicyRow): Promise<string | null> {
  if (policy.userId) {
    const user = await prisma.user.findUnique({
      where: { id: policy.userId },
      select: { phone: true },
    });
    if (user?.phone?.trim()) return user.phone.trim();
  }
  const user = await prisma.user.findUnique({
    where: { email: policy.email.toLowerCase().trim() },
    select: { phone: true },
  });
  return user?.phone?.trim() ?? null;
}

async function wasReminderSent(
  policyDbId: string,
  reminderDays: number,
  channel: "email" | "sms"
): Promise<boolean> {
  const existing = await prisma.policyExpiryReminder.findUnique({
    where: {
      policyDbId_reminderDays_channel: {
        policyDbId,
        reminderDays,
        channel,
      },
    },
  });
  return existing?.success === true;
}

async function recordReminder(params: {
  policyDbId: string;
  reminderDays: number;
  channel: "email" | "sms";
  recipient: string;
  success: boolean;
  errorMessage?: string;
}) {
  await prisma.policyExpiryReminder.upsert({
    where: {
      policyDbId_reminderDays_channel: {
        policyDbId: params.policyDbId,
        reminderDays: params.reminderDays,
        channel: params.channel,
      },
    },
    create: {
      policyDbId: params.policyDbId,
      reminderDays: params.reminderDays,
      channel: params.channel,
      recipient: params.recipient,
      success: params.success,
      errorMessage: params.errorMessage ?? null,
    },
    update: {
      recipient: params.recipient,
      success: params.success,
      errorMessage: params.errorMessage ?? null,
      sentAt: new Date(),
    },
  });
}

async function processPolicyReminder(
  policy: PolicyRow,
  reminderDays: number,
  dryRun: boolean,
  result: ReminderRunResult,
  settings: ReminderSettingsData,
  options?: { skipDedup?: boolean }
) {
  const renewPath = getProductTypeConfig(policy.productType).calculatorHref;
  const renewUrl = runtimeAbsoluteUrl(renewPath);
  const productLabel = getProductTypeConfig(policy.productType).label;
  const endFormatted = formatPolicyDateRo(parsePolicyEndDate(policy.endDate));

  // Email
  if (!settings.emailRemindersEnabled) {
    result.emailSkipped++;
  } else if (
    !options?.skipDedup &&
    (await wasReminderSent(policy.id, reminderDays, "email"))
  ) {
    result.emailSkipped++;
  } else if (dryRun) {
    result.emailSent++;
  } else {
    try {
      let attachment: { filename: string; content: Buffer } | null = null;
      if (!isEuroinsVendor(policy.vendorName)) {
        const pdf = await fetchPolicyPdfBuffer({
          policyId: policy.policyId,
          orderHash: policy.orderHash,
          email: policy.email,
          productType: policy.productType,
          filename: sanitizePdfFilename(
            policy.policyNumber || `polita-${policy.policyId}`,
            "pdf"
          ),
        });
        if (pdf) {
          attachment = { filename: pdf.filename, content: pdf.buffer };
        }
      }

      await sendExpiryReminderEmail({
        email: policy.email,
        firstName: await resolveFirstName(policy),
        productType: policy.productType,
        policyNumber: policy.policyNumber,
        vendorName: policy.vendorName,
        startDate: policy.startDate,
        endDate: policy.endDate,
        reminderDays,
        renewUrl,
        attachment,
      });

      await recordReminder({
        policyDbId: policy.id,
        reminderDays,
        channel: "email",
        recipient: policy.email,
        success: true,
      });
      result.emailSent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed";
      result.errors.push(`email:${policy.id}:${reminderDays}d:${message}`);
      await recordReminder({
        policyDbId: policy.id,
        reminderDays,
        channel: "email",
        recipient: policy.email,
        success: false,
        errorMessage: message,
      });
      result.emailFailed++;
    }
  }

  // SMS (optional — only when Twilio is configured and user has phone)
  const phone = await resolvePhone(policy);
  const smsAlreadySent = await wasReminderSent(policy.id, reminderDays, "sms");

  if (!settings.smsRemindersEnabled) {
    result.smsSkipped++;
  } else if (!phone) {
    result.smsSkipped++;
  } else if (
    !options?.skipDedup &&
    smsAlreadySent
  ) {
    result.smsSkipped++;
  } else if (!isSmsConfigured()) {
    result.smsSkipped++;
  } else if (dryRun) {
    result.smsSent++;
  } else {
    const smsBody = buildExpiryReminderSms({
      policyNumber: policy.policyNumber,
      productLabel,
      reminderDays,
      endDateFormatted: endFormatted,
      renewUrl,
    });
    const smsResult = await sendSms({ to: phone, body: smsBody });

    if (smsResult.sent) {
      await recordReminder({
        policyDbId: policy.id,
        reminderDays,
        channel: "sms",
        recipient: phone,
        success: true,
      });
      result.smsSent++;
    } else if (smsResult.skipped) {
      result.smsSkipped++;
    } else {
      const message = smsResult.error || "SMS failed";
      result.errors.push(`sms:${policy.id}:${reminderDays}d:${message}`);
      await recordReminder({
        policyDbId: policy.id,
        reminderDays,
        channel: "sms",
        recipient: phone,
        success: false,
        errorMessage: message,
      });
      result.smsFailed++;
    }
  }
}

export async function processExpiryReminders(options?: {
  dryRun?: boolean;
  today?: Date;
  policyNumber?: string;
}): Promise<ReminderRunResult> {
  const dryRun = options?.dryRun ?? false;
  const today = options?.today ?? new Date();
  const policyNumberFilter = options?.policyNumber?.trim();

  const result: ReminderRunResult = {
    scanned: 0,
    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,
    smsSent: 0,
    smsSkipped: 0,
    smsFailed: 0,
    errors: [],
  };

  const settings = await getReminderSettings();
  if (!settings.remindersEnabled) {
    return result;
  }

  const policies = await prisma.policy.findMany({
    where: {
      endDate: { not: null },
      email: { not: "" },
    },
    select: {
      id: true,
      userId: true,
      email: true,
      orderHash: true,
      policyId: true,
      productType: true,
      policyNumber: true,
      vendorName: true,
      startDate: true,
      endDate: true,
    },
  });

  for (const policy of policies) {
    if (
      policyNumberFilter &&
      policy.policyNumber?.trim() !== policyNumberFilter
    ) {
      continue;
    }

    for (const reminderDays of settings.reminderDayOffsets) {
      if (!matchesReminderWindow(policy.endDate, reminderDays, today)) {
        continue;
      }

      result.scanned++;
      await processPolicyReminder(policy, reminderDays, dryRun, result, settings);
    }
  }

  return result;
}

const POLICY_SELECT = {
  id: true,
  userId: true,
  email: true,
  orderHash: true,
  policyId: true,
  productType: true,
  policyNumber: true,
  vendorName: true,
  startDate: true,
  endDate: true,
} as const;

function resolveManualReminderDays(
  endDate: string | null,
  today = new Date()
): number {
  const remaining = daysUntilExpiry(endDate, today);
  if (remaining === null) return 30;
  if (remaining <= 0) return 1;
  return remaining;
}

export async function sendManualPolicyReminder(options: {
  policyDbId: string;
  dryRun?: boolean;
}): Promise<ReminderRunResult & { reminderDays: number }> {
  const dryRun = options.dryRun ?? false;
  const settings = await getReminderSettings();

  const policy = await prisma.policy.findUnique({
    where: { id: options.policyDbId },
    select: POLICY_SELECT,
  });

  if (!policy) {
    throw new Error("Polița nu a fost găsită.");
  }

  if (!policy.email?.trim()) {
    throw new Error("Polița nu are adresă de email.");
  }

  const reminderDays = resolveManualReminderDays(policy.endDate);
  const result: ReminderRunResult = {
    scanned: 1,
    emailSent: 0,
    emailSkipped: 0,
    emailFailed: 0,
    smsSent: 0,
    smsSkipped: 0,
    smsFailed: 0,
    errors: [],
  };

  await processPolicyReminder(
    policy,
    reminderDays,
    dryRun,
    result,
    settings,
    { skipDedup: true }
  );

  if (
    !dryRun &&
    result.emailSent === 0 &&
    result.smsSent === 0 &&
    result.emailFailed === 0 &&
    result.smsFailed === 0
  ) {
    if (!settings.emailRemindersEnabled && !settings.smsRemindersEnabled) {
      result.errors.push(
        "Reminder-ele email și SMS sunt dezactivate în setări."
      );
    } else if (!settings.emailRemindersEnabled) {
      result.errors.push("Reminder-ele email sunt dezactivate în setări.");
    }
  }

  return { ...result, reminderDays };
}

export async function getRemindersForPolicies(
  policyIds: string[]
): Promise<
  Record<string, { reminderDays: number; channel: string; sentAt: string }[]>
> {
  if (policyIds.length === 0) return {};

  const reminders = await prisma.policyExpiryReminder.findMany({
    where: {
      policyDbId: { in: policyIds },
      success: true,
    },
    orderBy: { sentAt: "desc" },
  });

  const map: Record<
    string,
    { reminderDays: number; channel: string; sentAt: string }[]
  > = {};

  for (const reminder of reminders) {
    const list = map[reminder.policyDbId] ?? [];
    list.push({
      reminderDays: reminder.reminderDays,
      channel: reminder.channel,
      sentAt: reminder.sentAt.toISOString(),
    });
    map[reminder.policyDbId] = list;
  }

  return map;
}
