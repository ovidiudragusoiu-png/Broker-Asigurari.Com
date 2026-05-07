import cron, { type ScheduledTask } from "node-cron";
import { loadReportConfig } from "./config";
import { buildCronExpression } from "./dateRanges";
import { logger } from "./logger";
import { runWeeklyGoogleAdsReport } from "./runWeeklyReport";

interface SchedulerOptions {
  configPath?: string;
  runImmediately?: boolean;
}

export async function startWeeklyReportScheduler(options: SchedulerOptions = {}): Promise<ScheduledTask> {
  const config = await loadReportConfig(options.configPath);
  const cronExpression = buildCronExpression(config.schedule.dayOfWeek, config.schedule.time);

  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await runWeeklyGoogleAdsReport({ configPath: options.configPath });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Scheduled Google Ads weekly report failed.", { message });
      }
    },
    {
      name: "google-ads-weekly-report",
      timezone: config.schedule.timezone,
      noOverlap: true,
    },
  );

  logger.info("Google Ads weekly report scheduler started.", {
    cronExpression,
    timezone: config.schedule.timezone,
  });

  if (options.runImmediately) {
    await task.execute();
  }

  return task;
}
