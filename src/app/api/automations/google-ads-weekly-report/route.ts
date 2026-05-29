import { NextRequest, NextResponse } from "next/server";
import { loadGoogleAdsReportConfig, runWeeklyGoogleAdsReport } from "@/lib/google-ads-reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const secret = process.env.GOOGLE_ADS_REPORT_CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return authHeader === `Bearer ${secret}` || headerSecret === secret;
}

async function handleRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = loadGoogleAdsReportConfig();
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const result = await runWeeklyGoogleAdsReport({ config, sendEmail: !dryRun });

    return NextResponse.json({
      ok: true,
      dryRun,
      emailId: result.emailId,
      recommendationCount: result.recommendationCount,
      subject: result.report.subject,
      dateRange: result.data.windows.last7Days,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
