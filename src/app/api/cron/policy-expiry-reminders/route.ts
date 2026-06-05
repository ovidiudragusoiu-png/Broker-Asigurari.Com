import { NextResponse } from "next/server";
import { processExpiryReminders } from "@/lib/reminders/processExpiryReminders";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const dryRun = params.get("dryRun") === "1";
    const asOfRaw = params.get("asOf");
    const today = asOfRaw ? new Date(`${asOfRaw}T12:00:00`) : new Date();

    if (asOfRaw && Number.isNaN(today.getTime())) {
      return NextResponse.json(
        { error: "Invalid asOf date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const policyNumber = params.get("policy")?.trim() || undefined;
    const result = await processExpiryReminders({ dryRun, today, policyNumber });

    console.log("[ExpiryReminders]", JSON.stringify(result));

    return NextResponse.json({
      ok: true,
      dryRun,
      asOf: asOfRaw ?? today.toISOString().slice(0, 10),
      policyNumber: policyNumber ?? null,
      ...result,
    });
  } catch (error) {
    console.error("[ExpiryReminders] Cron failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Cron failed",
      },
      { status: 500 }
    );
  }
}
