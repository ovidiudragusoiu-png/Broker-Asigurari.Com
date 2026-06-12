import { analyzePerformance } from "./analysis";
import { generateAiRecommendations } from "./aiRecommendations";
import { loadGoogleAdsCredentials, loadGoogleAdsReportConfig } from "./config";
import { fetchPerformanceSnapshot } from "./dataFetcher";
import { getWeeklyReportDateRanges } from "./dates";
import { sendReportEmail } from "./emailReport";
import { createGoogleAdsCustomer } from "./googleAdsClient";
import { logger, logRecommendations } from "./logger";
import { renderWeeklyReport } from "./reportRenderer";
import type { RenderedReport } from "./types";

export async function runWeeklyGoogleAdsReport(options: { sendEmail?: boolean } = {}): Promise<RenderedReport> {
  const shouldSendEmail = options.sendEmail !== false;
  const config = loadGoogleAdsReportConfig();
  const credentials = loadGoogleAdsCredentials();
  const customer = createGoogleAdsCustomer(config, credentials);
  const dateRanges = getWeeklyReportDateRanges(new Date(), config.timezone);

  logger.info("Starting Google Ads weekly report run", {
    customerId: config.googleAdsCustomerId,
    dateRange: dateRanges.last7Days,
    automaticChangesAllowed: config.automaticChangesAllowed,
  });

  if (!config.automaticChangesAllowed) {
    logger.info("Safety mode active: no Google Ads account changes will be applied");
  }

  const [last7Days, previous7Days, monthToDate] = await Promise.all([
    fetchPerformanceSnapshot(customer, config, dateRanges.last7Days),
    fetchPerformanceSnapshot(customer, config, dateRanges.previous7Days),
    dateRanges.monthToDate ? fetchPerformanceSnapshot(customer, config, dateRanges.monthToDate) : Promise.resolve(undefined),
  ]);

  const data = {
    customerId: config.googleAdsCustomerId,
    dateRanges,
    last7Days,
    previous7Days,
    monthToDate,
  };

  const analysis = analyzePerformance(data, config);
  const aiResult = await generateAiRecommendations(data, analysis, config);
  const report = renderWeeklyReport(data, analysis, aiResult, config);

  await logRecommendations(analysis.recommendations, dateRanges.generatedAt);

  if (shouldSendEmail) {
    await sendReportEmail(report, config);
    logger.info("Google Ads weekly report email sent", { recipient: config.emailRecipient });
  } else {
    logger.info("Email sending skipped by CLI option");
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyGoogleAdsReport({ sendEmail: !process.argv.includes("--no-email") })
    .then((report) => {
      if (process.argv.includes("--print")) {
        process.stdout.write(`${report.text}\n`);
      }
    })
    .catch((error) => {
      logger.error("Google Ads weekly report failed", error);
      process.exitCode = 1;
    });
}
