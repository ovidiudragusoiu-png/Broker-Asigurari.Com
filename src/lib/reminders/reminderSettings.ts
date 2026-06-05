import { prisma } from "@/lib/db/prisma";
import { REMINDER_DAY_OFFSETS } from "@/lib/reminders/expiryDates";

const SETTINGS_ID = "default";

export interface ReminderSettingsData {
  reminderDayOffsets: number[];
  remindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  smsRemindersEnabled: boolean;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export const DEFAULT_REMINDER_DAY_OFFSETS = [...REMINDER_DAY_OFFSETS];

export function formatReminderDayOffsets(offsets: number[]): string {
  return [...offsets].sort((a, b) => b - a).join(", ");
}

export function parseReminderDayOffsetsInput(input: string): number[] {
  const parts = input
    .split(/[,;\s]+/)
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 365);

  const unique = [...new Set(parts)];
  if (unique.length === 0) {
    throw new Error("Introdu cel puțin o zi validă (1–365).");
  }
  if (unique.length > 10) {
    throw new Error("Maximum 10 zile de reminder permise.");
  }

  return unique.sort((a, b) => b - a);
}

function parseStoredOffsets(raw: string): number[] {
  try {
    return parseReminderDayOffsetsInput(raw);
  } catch {
    return DEFAULT_REMINDER_DAY_OFFSETS;
  }
}

function toSettingsData(row: {
  reminderDayOffsets: string;
  remindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  smsRemindersEnabled: boolean;
  updatedAt: Date;
  updatedByEmail: string | null;
}): ReminderSettingsData {
  return {
    reminderDayOffsets: parseStoredOffsets(row.reminderDayOffsets),
    remindersEnabled: row.remindersEnabled,
    emailRemindersEnabled: row.emailRemindersEnabled,
    smsRemindersEnabled: row.smsRemindersEnabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedByEmail: row.updatedByEmail,
  };
}

function getDefaultReminderSettings(): ReminderSettingsData {
  return {
    reminderDayOffsets: DEFAULT_REMINDER_DAY_OFFSETS,
    remindersEnabled: true,
    emailRemindersEnabled: true,
    smsRemindersEnabled: true,
    updatedAt: null,
    updatedByEmail: null,
  };
}

export async function getReminderSettings(): Promise<ReminderSettingsData> {
  if (typeof prisma.reminderSettings?.findUnique !== "function") {
    return getDefaultReminderSettings();
  }

  try {
    const existing = await prisma.reminderSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (existing) {
      return toSettingsData(existing);
    }

    const created = await prisma.reminderSettings.create({
      data: {
        id: SETTINGS_ID,
        reminderDayOffsets: formatReminderDayOffsets(DEFAULT_REMINDER_DAY_OFFSETS),
      },
    });

    return toSettingsData(created);
  } catch (error) {
    console.error("[ReminderSettings] Using defaults:", error);
    return getDefaultReminderSettings();
  }
}

export async function updateReminderSettings(
  input: {
    reminderDayOffsets: string;
    remindersEnabled: boolean;
    emailRemindersEnabled: boolean;
    smsRemindersEnabled: boolean;
  },
  updatedByEmail: string
): Promise<ReminderSettingsData> {
  const offsets = parseReminderDayOffsetsInput(input.reminderDayOffsets);

  const row = await prisma.reminderSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      reminderDayOffsets: formatReminderDayOffsets(offsets),
      remindersEnabled: input.remindersEnabled,
      emailRemindersEnabled: input.emailRemindersEnabled,
      smsRemindersEnabled: input.smsRemindersEnabled,
      updatedByEmail,
    },
    update: {
      reminderDayOffsets: formatReminderDayOffsets(offsets),
      remindersEnabled: input.remindersEnabled,
      emailRemindersEnabled: input.emailRemindersEnabled,
      smsRemindersEnabled: input.smsRemindersEnabled,
      updatedByEmail,
    },
  });

  return toSettingsData(row);
}
