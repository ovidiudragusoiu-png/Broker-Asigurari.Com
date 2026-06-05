import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { sendManualPolicyReminder } from "@/lib/reminders/processExpiryReminders";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const { policyId } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
    };

    const result = await sendManualPolicyReminder({
      policyDbId: policyId,
      dryRun: body.dryRun ?? false,
    });

    const sent = result.emailSent > 0 || result.smsSent > 0;
    const failed = result.emailFailed > 0 || result.smsFailed > 0;

    if (!body.dryRun && !sent && !failed && result.errors.length > 0) {
      return NextResponse.json(
        { ok: false, error: result.errors[0], ...result },
        { status: 400 }
      );
    }

    console.log(
      `[Admin] Manual reminder by ${admin.email} for policy ${policyId}`,
      JSON.stringify(result)
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Trimiterea a eșuat.",
      },
      { status: 400 }
    );
  }
}
