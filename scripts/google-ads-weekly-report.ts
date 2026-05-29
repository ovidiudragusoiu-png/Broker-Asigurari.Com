import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { loadGoogleAdsReportConfig, runWeeklyGoogleAdsReport } from "../src/lib/google-ads-reporting";

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
} else {
  loadEnv();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const config = loadGoogleAdsReportConfig();
  const result = await runWeeklyGoogleAdsReport({ config, sendEmail: !dryRun });

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        emailId: result.emailId,
        recommendationCount: result.recommendationCount,
        subject: result.report.subject,
        dateRange: result.data.windows.last7Days,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("\n--- Report preview ---\n");
    console.log(result.report.text);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
