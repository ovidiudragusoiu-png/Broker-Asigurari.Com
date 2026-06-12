import { analysisFormatters } from "./analysis";
import { formatDateRangeForSubject } from "./dates";
import type {
  AiRecommendationResult,
  AnalysisResult,
  CampaignPerformance,
  GoogleAdsReportConfig,
  GoogleAdsReportData,
  PerformanceMetrics,
  Recommendation,
  RenderedReport,
  SearchTermPerformance,
} from "./types";

const { money, percent } = analysisFormatters;

function delta(current: number, previous: number): string {
  if (previous === 0 && current === 0) {
    return "0.0%";
  }
  if (previous === 0) {
    return "+100.0%";
  }
  const value = (current - previous) / previous;
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function metricBlock(metrics: PerformanceMetrics): string {
  return [
    `Cost: ${money(metrics.costRon)}`,
    `Impressions: ${metrics.impressions.toLocaleString("ro-RO")}`,
    `Clicks: ${metrics.clicks.toLocaleString("ro-RO")}`,
    `CTR: ${percent(metrics.ctr)}`,
    `Average CPC: ${money(metrics.averageCpcRon)}`,
    `Conversions: ${metrics.conversions.toFixed(1)}`,
    `Conversion rate: ${percent(metrics.conversionRate)}`,
    `Cost per conversion: ${money(metrics.costPerConversionRon)}`,
  ].join("\n");
}

function recommendationLine(recommendation: Recommendation, index: number): string {
  const entity = recommendation.entityName ? ` (${recommendation.entityName})` : "";
  return `${index}. ${recommendation.title}${entity}
   Finding: ${recommendation.finding}
   Recommendation: ${recommendation.recommendation}
   Confidence: ${recommendation.confidence} | Impact: ${recommendation.impact}${
     recommendation.supportingMetric ? ` | Metric: ${recommendation.supportingMetric}` : ""
   }`;
}

function campaignLine(campaign: CampaignPerformance, index: number): string {
  return `${index}. ${campaign.campaignName} (${campaign.status}) - Cost ${money(campaign.costRon)}, Conversions ${campaign.conversions.toFixed(
    1,
  )}, CPA ${money(campaign.costPerConversionRon)}, Lost IS budget ${percent(campaign.lostImpressionShareBudget)}, Lost IS rank ${percent(
    campaign.lostImpressionShareRank,
  )}`;
}

function searchTermLine(term: SearchTermPerformance, index: number): string {
  return `${index}. "${term.searchTerm}" - ${term.campaignName} / ${term.adGroupName}: Cost ${money(term.costRon)}, Clicks ${
    term.clicks
  }, Conversions ${term.conversions.toFixed(1)}, CPA ${money(term.costPerConversionRon)}`;
}

function section(title: string, body: string): string {
  return `${title}\n${"-".repeat(title.length)}\n${body || "No notable findings for this section."}`;
}

function filterRecommendations(recommendations: Recommendation[], categories: Recommendation["category"][]) {
  return recommendations.filter((recommendation) => categories.includes(recommendation.category));
}

function renderRecommendationList(recommendations: Recommendation[], limit = 8): string {
  if (recommendations.length === 0) {
    return "No notable findings for this section.";
  }
  return recommendations.slice(0, limit).map(recommendationLine).join("\n\n");
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function renderCsv(data: GoogleAdsReportData): string {
  const rows: unknown[][] = [
    [
      "type",
      "date_range",
      "campaign",
      "ad_group",
      "entity",
      "status",
      "cost_ron",
      "impressions",
      "clicks",
      "ctr",
      "avg_cpc_ron",
      "conversions",
      "conversion_rate",
      "cost_per_conversion_ron",
    ],
  ];

  for (const campaign of data.last7Days.campaigns) {
    rows.push([
      "campaign",
      data.last7Days.range.label,
      campaign.campaignName,
      "",
      campaign.campaignId,
      campaign.status,
      campaign.costRon,
      campaign.impressions,
      campaign.clicks,
      campaign.ctr,
      campaign.averageCpcRon,
      campaign.conversions,
      campaign.conversionRate,
      campaign.costPerConversionRon ?? "",
    ]);
  }

  for (const keyword of data.last7Days.keywords) {
    rows.push([
      "keyword",
      data.last7Days.range.label,
      keyword.campaignName,
      keyword.adGroupName,
      keyword.keywordText,
      keyword.status,
      keyword.costRon,
      keyword.impressions,
      keyword.clicks,
      keyword.ctr,
      keyword.averageCpcRon,
      keyword.conversions,
      keyword.conversionRate,
      keyword.costPerConversionRon ?? "",
    ]);
  }

  for (const term of data.last7Days.searchTerms) {
    rows.push([
      "search_term",
      data.last7Days.range.label,
      term.campaignName,
      term.adGroupName,
      term.searchTerm,
      term.status || "",
      term.costRon,
      term.impressions,
      term.clicks,
      term.ctr,
      term.averageCpcRon,
      term.conversions,
      term.conversionRate,
      term.costPerConversionRon ?? "",
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderWeeklyReport(
  data: GoogleAdsReportData,
  analysis: AnalysisResult,
  aiResult: AiRecommendationResult,
  config: GoogleAdsReportConfig,
): RenderedReport {
  const last = analysis.accountSummary.last7Days;
  const previous = analysis.accountSummary.previous7Days;
  const subject = `Google Ads Weekly Performance Report - ${formatDateRangeForSubject(data.dateRanges.last7Days)}`;
  const budgetRecommendations = filterRecommendations(analysis.recommendations, ["Budget"]);
  const bidAndTargetingRecommendations = filterRecommendations(analysis.recommendations, ["Bids", "Targeting", "Keyword"]);
  const adCopyRecommendations = filterRecommendations(analysis.recommendations, ["Ad Copy"]);
  const landingPageRecommendations = filterRecommendations(analysis.recommendations, ["Landing Page", "Conversion Tracking"]);

  const text = [
    "Weekly Google Ads Performance Report",
    `Date range: ${data.dateRanges.last7Days.startDate} - ${data.dateRanges.last7Days.endDate}`,
    `Comparison: ${data.dateRanges.previous7Days.startDate} - ${data.dateRanges.previous7Days.endDate}`,
    `Generated: ${data.dateRanges.generatedAt} (${data.dateRanges.timezone})`,
    `Landing page focus: ${config.landingPageUrl}`,
    `Safety: automatic Google Ads changes are ${config.automaticChangesAllowed ? "configured as allowed, but this report run still applies no changes automatically." : "disabled. This automation reports and recommends only."}`,
    "",
    section(
      "1. Executive Summary",
      [
        `The account spent ${money(last.costRon)} in the last 7 days and generated ${last.conversions.toFixed(1)} conversions at ${money(
          last.costPerConversionRon,
        )} cost per conversion.`,
        `Week over week, cost changed ${delta(last.costRon, previous.costRon)}, conversions changed ${delta(
          last.conversions,
          previous.conversions,
        )}, and conversion rate changed ${delta(last.conversionRate, previous.conversionRate)}.`,
        `Main CASCO objective: prioritize qualified leads from high-intent searches such as "calculator casco", "oferta casco", and "asigurare casco" while cutting unrelated insurance spend.`,
        aiResult.narrative ? `\nAI interpretation:\n${aiResult.narrative}` : "",
      ].join("\n"),
    ),
    "",
    section(
      "2. Key Metrics",
      [
        metricBlock(last),
        analysis.accountSummary.monthToDate ? `\nMonth to date:\n${metricBlock(analysis.accountSummary.monthToDate)}` : "",
      ].join("\n"),
    ),
    "",
    section(
      "3. Week-over-Week Comparison",
      [
        `Cost: ${money(last.costRon)} vs ${money(previous.costRon)} (${delta(last.costRon, previous.costRon)})`,
        `Clicks: ${last.clicks.toLocaleString("ro-RO")} vs ${previous.clicks.toLocaleString("ro-RO")} (${delta(
          last.clicks,
          previous.clicks,
        )})`,
        `CTR: ${percent(last.ctr)} vs ${percent(previous.ctr)} (${delta(last.ctr, previous.ctr)})`,
        `Conversions: ${last.conversions.toFixed(1)} vs ${previous.conversions.toFixed(1)} (${delta(
          last.conversions,
          previous.conversions,
        )})`,
        `Conversion rate: ${percent(last.conversionRate)} vs ${percent(previous.conversionRate)} (${delta(
          last.conversionRate,
          previous.conversionRate,
        )})`,
        `CPA: ${money(last.costPerConversionRon)} vs ${money(previous.costPerConversionRon)}`,
      ].join("\n"),
    ),
    "",
    section(
      "4. Best Performing Campaigns",
      analysis.bestCampaigns.map(campaignLine).join("\n"),
    ),
    "",
    section(
      "5. Underperforming Campaigns",
      analysis.underperformingCampaigns.map(campaignLine).join("\n"),
    ),
    "",
    section(
      "6. Search Terms Review",
      data.last7Days.searchTerms.slice(0, 10).map(searchTermLine).join("\n"),
    ),
    "",
    section(
      "7. Negative Keyword Suggestions",
      renderRecommendationList(analysis.negativeKeywordSuggestions, 10),
    ),
    "",
    section("8. Budget Recommendations", renderRecommendationList(budgetRecommendations, 8)),
    "",
    section("9. Bid and Targeting Recommendations", renderRecommendationList(bidAndTargetingRecommendations, 10)),
    "",
    section("10. Ad Copy Recommendations", renderRecommendationList(adCopyRecommendations, 8)),
    "",
    section("11. Landing Page / Conversion Tracking Notes", renderRecommendationList(landingPageRecommendations, 8)),
    "",
    section(
      "12. Priority Action Plan for This Week",
      renderRecommendationList(analysis.recommendations, 7),
    ),
  ].join("\n");

  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827"><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(
      text,
    )}</pre></div>`,
    csv: renderCsv(data),
  };
}
