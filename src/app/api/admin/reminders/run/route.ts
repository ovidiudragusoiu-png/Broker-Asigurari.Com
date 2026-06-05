import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { processExpiryReminders } from "@/lib/reminders/processExpiryReminders";

export const maxDuration = 300;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      dryRun?: boolean;
      policyNumber?: string;
      asOf?: string;
    };

    const dryRun = body.dryRun ?? false;
    const policyNumber = body.policyNumber?.trim() || undefined;
    const asOfRaw = body.asOf?.trim();
    const today = asOfRaw ? new Date(`${asOfRaw}T12:00:00`) : new Date();

    if (asOfRaw && Number.isNaN(today.getTime())) {
      return NextResponse.json(
        { error: "Invalid asOf date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const result = await processExpiryReminders({
      dryRun,
      today,
      policyNumber,
    });

    console.log(
      `[Admin] Reminder run by ${admin.email}`,
      JSON.stringify({ dryRun, policyNumber, ...result })
    );

    return NextResponse.json({
      ok: true,
      dryRun,
      asOf: asOfRaw ?? today.toISOString().slice(0, 10),
      policyNumber: policyNumber ?? null,
      ...result,
    });
  } catch (error) {
    console.error("[Admin] Reminder run failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Run failed",
      },
      { status: 500 }
    );
  }
}
