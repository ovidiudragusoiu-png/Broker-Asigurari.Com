import cron from "node-cron";
import { loadGoogleAdsReportConfig } from "./config";
import { logger } from "./logger";
import { runWeeklyGoogleAdsReport } from "./runner";
import type { GoogleAdsReportConfig } from "./types";

const DAY_TO_CRON: Record<GoogleAdsReportConfig["reportDay"], number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function buildCronExpression(config: GoogleAdsReportConfig): string {
  const [hourText, minuteText] = config.reportTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("reportTime must be in HH:mm 24-hour format");
  }

  return `${minute} ${hour} * * ${DAY_TO_CRON[config.reportDay]}`;
}

export function startGoogleAdsWeeklyReportScheduler() {
  const config = loadGoogleAdsReportConfig();
  const cronExpression = buildCronExpression(config);

  logger.info("Starting Google Ads weekly report scheduler", {
    cronExpression,
    timezone: config.timezone,
    reportDay: config.reportDay,
    reportTime: config.reportTime,
  });

  cron.schedule(
    cronExpression,
    async () => {
      try {
        await runWeeklyGoogleAdsReport();
      } catch (error) {
        logger.error("Scheduled Google Ads report run failed", error);
      }
    },
    {
      timezone: config.timezone,
    },
  );

  if (process.argv.includes("--run-on-start")) {
    void runWeeklyGoogleAdsReport().catch((error) => {
      logger.error("Initial Google Ads report run failed", error);
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startGoogleAdsWeeklyReportScheduler();
}
