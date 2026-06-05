import { prisma } from "@/lib/db/prisma";
import { daysUntilExpiry, matchesReminderWindow } from "@/lib/reminders/expiryDates";
import {
  formatReminderDayOffsets,
  getReminderSettings,
  type ReminderSettingsData,
} from "@/lib/reminders/reminderSettings";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import { isSmsConfigured } from "@/lib/sms/twilio";

export interface ReminderHistoryRow {
  id: string;
  policyNumber: string | null;
  productType: string;
  productLabel: string;
  email: string;
  reminderDays: number;
  channel: string;
  success: boolean;
  errorMessage: string | null;
  sentAt: string;
}

export interface UpcomingReminderRow {
  policyDbId: string;
  policyNumber: string | null;
  productType: string;
  productLabel: string;
  email: string;
  endDate: string | null;
  reminderDays: number;
  daysUntilExpiry: number;
}

export async function fetchRecentReminderHistory(
  limit = 50
): Promise<ReminderHistoryRow[]> {
  const rows = await prisma.policyExpiryReminder.findMany({
    orderBy: { sentAt: "desc" },
    take: limit,
    include: {
      policy: {
        select: {
          policyNumber: true,
          productType: true,
          email: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    policyNumber: row.policy.policyNumber,
    productType: row.policy.productType,
    productLabel: getProductTypeConfig(row.policy.productType).label,
    email: row.policy.email,
    reminderDays: row.reminderDays,
    channel: row.channel,
    success: row.success,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt.toISOString(),
  }));
}

export async function fetchUpcomingReminders(
  today = new Date()
): Promise<UpcomingReminderRow[]> {
  const settings = await getReminderSettings();
  if (!settings.remindersEnabled) {
    return [];
  }

  const policies = await prisma.policy.findMany({
    where: {
      endDate: { not: null },
      email: { not: "" },
    },
    select: {
      id: true,
      policyNumber: true,
      productType: true,
      email: true,
      endDate: true,
    },
  });

  const upcoming: UpcomingReminderRow[] = [];

  for (const policy of policies) {
    for (const reminderDays of settings.reminderDayOffsets) {
      if (!matchesReminderWindow(policy.endDate, reminderDays, today)) {
        continue;
      }

      const remaining = daysUntilExpiry(policy.endDate, today);
      if (remaining === null) continue;

      upcoming.push({
        policyDbId: policy.id,
        policyNumber: policy.policyNumber,
        productType: policy.productType,
        productLabel: getProductTypeConfig(policy.productType).label,
        email: policy.email,
        endDate: policy.endDate,
        reminderDays,
        daysUntilExpiry: remaining,
      });
    }
  }

  return upcoming.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

export interface ReminderSystemStatus extends ReminderSettingsData {
  reminderDaysInput: string;
  timezone: string;
  cronSchedule: string;
  siteUrl: string | null;
  emailConfigured: boolean;
  smsConfigured: boolean;
  cronSecretConfigured: boolean;
}

export async function getReminderSystemStatus(): Promise<ReminderSystemStatus> {
  const settings = await getReminderSettings();

  return {
    ...settings,
    reminderDaysInput: formatReminderDayOffsets(settings.reminderDayOffsets),
    timezone: "Europe/Bucharest",
    cronSchedule: "0 6 * * * (06:00 UTC zilnic)",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
    emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    smsConfigured: isSmsConfigured(),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
  };
}
