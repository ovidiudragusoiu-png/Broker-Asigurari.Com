import { analyzePerformance } from "./analysis";
import { generateAiRecommendations } from "./aiRecommendations";
import { buildWeeklyDateWindows } from "./dateWindows";
import { fetchPerformanceDataset } from "./fetchPerformanceData";
import { createGoogleAdsCustomer } from "./googleAdsClient";
import { reportLogger } from "./logger";
import { renderWeeklyReport } from "./reportRenderer";
import type { GoogleAdsReportConfig, RenderedReport, WeeklyGoogleAdsData } from "./types";
import { sendWeeklyReportEmail } from "./email";

export interface RunWeeklyReportOptions {
  config: GoogleAdsReportConfig;
  referenceDate?: Date;
  sendEmail?: boolean;
}

export interface WeeklyReportRunResult {
  report: RenderedReport;
  data: WeeklyGoogleAdsData;
  emailId?: string;
  recommendationCount: number;
}

export async function runWeeklyGoogleAdsReport({
  config,
  referenceDate,
  sendEmail = true,
}: RunWeeklyReportOptions): Promise<WeeklyReportRunResult> {
  reportLogger.info("Starting weekly Google Ads report", {
    customerId: config.googleAdsCustomerId,
    campaignIds: config.campaignIds,
    timezone: config.timezone,
    automaticChangesAllowed: config.automaticChangesAllowed,
  });

  const windows = buildWeeklyDateWindows(config.timezone, referenceDate);
  const customer = createGoogleAdsCustomer(config);

  const last7Days = await fetchPerformanceDataset(customer, config, windows.last7Days);
  const previous7Days = await fetchPerformanceDataset(customer, config, windows.previous7Days);
  const monthToDate = windows.monthToDate
    ? await fetchPerformanceDataset(customer, config, windows.monthToDate)
    : undefined;

  const data: WeeklyGoogleAdsData = {
    windows,
    last7Days,
    previous7Days,
    monthToDate,
  };
  const analysis = analyzePerformance(config, data);
  const ai = await generateAiRecommendations(config, data, analysis);
  const report = renderWeeklyReport(config, data, analysis, ai);
  const allRecommendations = [...analysis.recommendations, ...ai.recommendations];

  for (const item of allRecommendations) {
    reportLogger.info("Google Ads recommendation logged", {
      category: item.category,
      title: item.title,
      confidence: item.confidence,
      impact: item.impact,
      relatedEntity: item.relatedEntity,
    });
  }

  let emailId: string | undefined;
  if (sendEmail) {
    const email = await sendWeeklyReportEmail(config, report);
    emailId = email.id;
    reportLogger.info("Weekly Google Ads report email sent", { provider: email.provider, id: email.id });
  } else {
    reportLogger.info("Weekly Google Ads report email skipped by option");
  }

  return {
    report,
    data,
    emailId,
    recommendationCount: allRecommendations.length,
  };
}
