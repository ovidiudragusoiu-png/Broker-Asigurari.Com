import { analyzePerformance } from "./analysis";
import { generateAiRecommendations } from "./aiRecommendations";
import { loadAnthropicCredentials, loadGoogleAdsCredentials, loadReportConfig } from "./config";
import { buildWeeklyDateRanges } from "./dateRanges";
import { fetchPerformanceDataset } from "./dataFetcher";
import { sendReportEmail } from "./email";
import { createGoogleAdsCustomer } from "./googleAdsClient";
import { logger } from "./logger";
import { buildCsvAttachment, renderWeeklyReport } from "./reportRenderer";
import type { PerformanceComparison, ReportConfig, WeeklyReportResult } from "./types";

interface RunWeeklyReportOptions {
  configPath?: string;
  now?: Date;
  sendEmail?: boolean;
}

async function fetchComparison(config: ReportConfig, now: Date): Promise<PerformanceComparison> {
  const dateRanges = buildWeeklyDateRanges(now, config.schedule.timezone);
  const customer = createGoogleAdsCustomer(config, loadGoogleAdsCredentials());
  const [current, previous, monthToDate] = await Promise.all([
    fetchPerformanceDataset(customer, config, dateRanges.current),
    fetchPerformanceDataset(customer, config, dateRanges.previous),
    dateRanges.monthToDate ? fetchPerformanceDataset(customer, config, dateRanges.monthToDate) : Promise.resolve(undefined),
  ]);

  return {
    current,
    previous,
    monthToDate,
  };
}

function reportSubject(comparison: PerformanceComparison): string {
  return `Google Ads Weekly Performance Report - ${comparison.current.dateRange.startDate} to ${comparison.current.dateRange.endDate}`;
}

export async function runWeeklyGoogleAdsReport(options: RunWeeklyReportOptions = {}): Promise<WeeklyReportResult> {
  const config = await loadReportConfig(options.configPath);
  const now = options.now || new Date();

  logger.info("Starting Google Ads weekly performance report.", {
    customerId: config.googleAdsCustomerId,
    campaignCount: config.campaignIds.length,
    timezone: config.schedule.timezone,
  });

  const comparison = await fetchComparison(config, now);
  const analysis = analyzePerformance(comparison, config);
  const aiResult = await generateAiRecommendations(
    comparison,
    analysis,
    config,
    loadAnthropicCredentials(),
  );
  const markdownReport = renderWeeklyReport(comparison, analysis, aiResult, config);
  const subject = reportSubject(comparison);
  const csvAttachment = config.attachCsv
    ? {
        filename: `google-ads-performance-${comparison.current.dateRange.startDate}-to-${comparison.current.dateRange.endDate}.csv`,
        content: buildCsvAttachment(comparison),
      }
    : undefined;

  [...analysis.recommendations, ...aiResult.recommendations].forEach((item) => {
    logger.info("Google Ads recommendation logged.", {
      id: item.id,
      area: item.area,
      entity: item.entity,
      confidence: item.confidence,
      automaticChangeAllowed: item.automaticChangeAllowed,
    });
  });

  if (options.sendEmail !== false) {
    await sendReportEmail({
      subject,
      markdownReport,
      config,
      csvAttachment,
    });
  } else {
    logger.info("Email delivery skipped for Google Ads weekly report.");
  }

  logger.info("Finished Google Ads weekly performance report.", {
    subject,
    recommendationCount: analysis.recommendations.length + aiResult.recommendations.length,
  });

  return {
    subject,
    markdownReport,
    csvAttachment,
    analysis,
  };
}
