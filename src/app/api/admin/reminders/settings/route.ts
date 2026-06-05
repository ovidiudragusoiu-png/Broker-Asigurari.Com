import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import {
  getReminderSettings,
  updateReminderSettings,
} from "@/lib/reminders/reminderSettings";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const settings = await getReminderSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      reminderDayOffsets?: string;
      remindersEnabled?: boolean;
      emailRemindersEnabled?: boolean;
      smsRemindersEnabled?: boolean;
    };

    const current = await getReminderSettings();

    const settings = await updateReminderSettings(
      {
        reminderDayOffsets:
          body.reminderDayOffsets ??
          current.reminderDayOffsets.join(", "),
        remindersEnabled: body.remindersEnabled ?? current.remindersEnabled,
        emailRemindersEnabled:
          body.emailRemindersEnabled ?? current.emailRemindersEnabled,
        smsRemindersEnabled:
          body.smsRemindersEnabled ?? current.smsRemindersEnabled,
      },
      admin.email
    );

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nu s-au putut salva setările.",
      },
      { status: 400 }
    );
  }
}
