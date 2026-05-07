import "dotenv/config";
import { logger } from "../src/lib/google-ads-report/logger";
import { runWeeklyGoogleAdsReport } from "../src/lib/google-ads-report/runWeeklyReport";
import { startWeeklyReportScheduler } from "../src/lib/google-ads-report/scheduler";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const configPathIndex = process.argv.indexOf("--config");
  const configPath = configPathIndex >= 0 ? process.argv[configPathIndex + 1] : undefined;
  const schedule = hasFlag("--schedule");
  const dryRun = hasFlag("--dry-run") || process.env.GOOGLE_ADS_REPORT_DRY_RUN === "true";

  if (schedule) {
    await startWeeklyReportScheduler({
      configPath,
      runImmediately: hasFlag("--run-immediately"),
    });
    return;
  }

  const result = await runWeeklyGoogleAdsReport({
    configPath,
    sendEmail: !dryRun,
  });

  if (dryRun) {
    console.log(result.markdownReport);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Google Ads weekly report command failed.", { message });
  process.exitCode = 1;
});
