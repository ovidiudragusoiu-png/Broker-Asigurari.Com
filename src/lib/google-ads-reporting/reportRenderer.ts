import { formatDateRange } from "./dateWindows";
import type {
  AiRecommendationResult,
  AnalysisResult,
  CampaignPerformance,
  GoogleAdsReportConfig,
  MetricRow,
  Recommendation,
  RenderedReport,
  WeeklyGoogleAdsData,
} from "./types";

function ccy(value: number | null | undefined, config: GoogleAdsReportConfig) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(2)} ${config.currencyCode}`;
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(2)}%`;
}

function total(rows: MetricRow[]): MetricRow {
  const cost = rows.reduce((sum, row) => sum + row.cost, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);

  return {
    name: "Total",
    cost,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    averageCpc: clicks > 0 ? cost / clicks : 0,
    conversions,
    conversionRate: clicks > 0 ? conversions / clicks : 0,
    costPerConversion: conversions > 0 ? cost / conversions : null,
  };
}

function delta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "0.0%" : "new activity";
  }

  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function renderRecommendationList(items: Recommendation[], emptyText: string) {
  if (!items.length) {
    return `- ${emptyText}`;
  }

  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\n   Finding: ${item.finding}\n   Recommendation: ${item.recommendation}\n   Confidence: ${item.confidence} | Impact: ${item.impact}${
          item.safetyNote ? `\n   Safety: ${item.safetyNote}` : ""
        }`,
    )
    .join("\n");
}

function renderCampaigns(campaigns: CampaignPerformance[], config: GoogleAdsReportConfig) {
  if (!campaigns.length) {
    return "- No campaigns matched this section.";
  }

  return campaigns
    .map(
      (campaign) =>
        `- ${campaign.name}: ${ccy(campaign.cost, config)} spend, ${campaign.clicks} clicks, ${campaign.conversions.toFixed(
          1,
        )} conversions, CPA ${ccy(campaign.costPerConversion, config)}, CVR ${pct(campaign.conversionRate)}`,
    )
    .join("\n");
}

function topSearchTerms(data: WeeklyGoogleAdsData, config: GoogleAdsReportConfig) {
  if (!data.last7Days.searchTerms.length) {
    return "- No search term rows were returned.";
  }

  return data.last7Days.searchTerms
    .slice(0, 10)
    .map(
      (term) =>
        `- "${term.searchTerm}" (${term.campaignName || "unknown campaign"}): ${ccy(term.cost, config)}, ${term.clicks} clicks, ${term.conversions.toFixed(
          1,
        )} conversions`,
    )
    .join("\n");
}

function executiveSummary(
  config: GoogleAdsReportConfig,
  data: WeeklyGoogleAdsData,
  analysis: AnalysisResult,
  ai: AiRecommendationResult,
) {
  const current = total(data.last7Days.campaigns);
  const previous = total(data.previous7Days.campaigns);
  const leadTrend = delta(current.conversions, previous.conversions);
  const cpaTrend =
    current.costPerConversion !== null && previous.costPerConversion !== null
      ? delta(current.costPerConversion, previous.costPerConversion)
      : "not available";
  const strongest = analysis.bestCampaigns[0]?.name || "No clear winner yet";
  const biggestRisk = analysis.priorityActions[0]?.title || "No urgent issue detected";

  return [
    `For ${formatDateRange(data.windows.last7Days)}, Google Ads generated ${current.conversions.toFixed(
      1,
    )} conversions from ${current.clicks} clicks at ${ccy(current.costPerConversion, config)} cost per lead.`,
    `Lead volume changed ${leadTrend} versus the previous 7 days. Cost per lead changed ${cpaTrend}.`,
    `Best current campaign signal: ${strongest}. Main priority: ${biggestRisk}.`,
    ai.summary ? `AI analyst note: ${ai.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function keyMetrics(config: GoogleAdsReportConfig, data: WeeklyGoogleAdsData) {
  const current = total(data.last7Days.campaigns);
  const mtd = data.monthToDate ? total(data.monthToDate.campaigns) : null;

  return [
    `- Cost: ${ccy(current.cost, config)}`,
    `- Impressions: ${current.impressions}`,
    `- Clicks: ${current.clicks}`,
    `- CTR: ${pct(current.ctr)}`,
    `- Average CPC: ${ccy(current.averageCpc, config)}`,
    `- Conversions: ${current.conversions.toFixed(1)}`,
    `- Conversion rate: ${pct(current.conversionRate)}`,
    `- Cost per conversion: ${ccy(current.costPerConversion, config)}`,
    mtd
      ? `- Month-to-date: ${ccy(mtd.cost, config)} spend, ${mtd.conversions.toFixed(1)} conversions, CPA ${ccy(
          mtd.costPerConversion,
          config,
        )}`
      : "- Month-to-date: not available yet",
  ].join("\n");
}

function weekOverWeek(config: GoogleAdsReportConfig, data: WeeklyGoogleAdsData) {
  const current = total(data.last7Days.campaigns);
  const previous = total(data.previous7Days.campaigns);

  return [
    `- Cost: ${ccy(current.cost, config)} vs ${ccy(previous.cost, config)} (${delta(current.cost, previous.cost)})`,
    `- Clicks: ${current.clicks} vs ${previous.clicks} (${delta(current.clicks, previous.clicks)})`,
    `- Conversions: ${current.conversions.toFixed(1)} vs ${previous.conversions.toFixed(1)} (${delta(
      current.conversions,
      previous.conversions,
    )})`,
    `- Conversion rate: ${pct(current.conversionRate)} vs ${pct(previous.conversionRate)} (${delta(
      current.conversionRate,
      previous.conversionRate,
    )})`,
    `- Cost per conversion: ${ccy(current.costPerConversion, config)} vs ${ccy(
      previous.costPerConversion,
      config,
    )} (${
      current.costPerConversion !== null && previous.costPerConversion !== null
        ? delta(current.costPerConversion, previous.costPerConversion)
        : "not available"
    })`,
  ].join("\n");
}

function htmlEscape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markdownToHtml(text: string) {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      if (line.startsWith("# ")) {
        return `<h1>${htmlEscape(line.slice(2))}</h1>`;
      }

      if (line.startsWith("## ")) {
        return `<h2>${htmlEscape(line.slice(3))}</h2>`;
      }

      if (line.startsWith("- ")) {
        return `<li>${htmlEscape(line.slice(2))}</li>`;
      }

      if (!line.trim()) {
        return "<br />";
      }

      return `<p>${htmlEscape(line)}</p>`;
    })
    .join("\n");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function campaignCsv(data: WeeklyGoogleAdsData, config: GoogleAdsReportConfig) {
  const rows = [
    [
      "date_range",
      "campaign",
      "status",
      "budget",
      "cost",
      "impressions",
      "clicks",
      "ctr",
      "average_cpc",
      "conversions",
      "conversion_rate",
      "cost_per_conversion",
      "search_impression_share",
      "lost_is_budget",
      "lost_is_rank",
      "currency",
    ],
    ...data.last7Days.campaigns.map((campaign) => [
      formatDateRange(data.windows.last7Days),
      campaign.name,
      campaign.status,
      campaign.budget,
      campaign.cost,
      campaign.impressions,
      campaign.clicks,
      campaign.ctr,
      campaign.averageCpc,
      campaign.conversions,
      campaign.conversionRate,
      campaign.costPerConversion,
      campaign.searchImpressionShare,
      campaign.lostImpressionShareBudget,
      campaign.lostImpressionShareRank,
      config.currencyCode,
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function renderWeeklyReport(
  config: GoogleAdsReportConfig,
  data: WeeklyGoogleAdsData,
  analysis: AnalysisResult,
  ai: AiRecommendationResult,
): RenderedReport {
  const recommendations = [...analysis.recommendations, ...ai.recommendations];
  const sections = [
    "# Weekly Google Ads Performance Report",
    `Date range: ${formatDateRange(data.windows.last7Days)}`,
    `Landing page focus: ${config.cascoLandingPageUrl}`,
    `Safety setting: automatic changes allowed = ${config.automaticChangesAllowed}`,
    "",
    "## 1. Executive Summary",
    executiveSummary(config, data, analysis, ai),
    "",
    "## 2. Key Metrics",
    keyMetrics(config, data),
    "",
    "## 3. Week-over-Week Comparison",
    weekOverWeek(config, data),
    "",
    "## 4. Best Performing Campaigns",
    renderCampaigns(analysis.bestCampaigns, config),
    "",
    "## 5. Underperforming Campaigns",
    renderCampaigns(analysis.underperformingCampaigns, config),
    "",
    "## 6. Search Terms Review",
    topSearchTerms(data, config),
    "",
    "## 7. Negative Keyword Suggestions",
    renderRecommendationList(
      analysis.negativeKeywordSuggestions,
      "No strong negative keyword candidates detected from the returned search terms.",
    ),
    "",
    "## 8. Budget Recommendations",
    renderRecommendationList(analysis.budgetRecommendations, "No budget increases are recommended this week."),
    "",
    "## 9. Bid and Targeting Recommendations",
    renderRecommendationList(
      analysis.bidAndTargetingRecommendations,
      "No major bid, device, location, or schedule issues detected this week.",
    ),
    "",
    "## 10. Ad Copy Recommendations",
    renderRecommendationList(
      analysis.adCopyRecommendations,
      "No low-CTR ad issues detected. Continue testing CASCO benefits, fast quote, trusted brokers, and online calculation messaging.",
    ),
    "",
    "## 11. Landing Page / Conversion Tracking Notes",
    renderRecommendationList(
      [...analysis.landingPageNotes, ...analysis.conversionTrackingNotes],
      "No landing-page or conversion-tracking red flags detected from the available data.",
    ),
    "",
    "## 12. Priority Action Plan for This Week",
    renderRecommendationList(
      [...analysis.priorityActions, ...ai.recommendations].slice(0, 10),
      "Keep monitoring and maintain current structure until more conversion data is available.",
    ),
    "",
    "## Recommendation Log",
    renderRecommendationList(recommendations, "No recommendations logged this week."),
  ];

  const text = sections.join("\n");
  const subject = `Google Ads Weekly Performance Report - ${formatDateRange(data.windows.last7Days)}`;

  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">${markdownToHtml(text)}</div>`,
    csv: campaignCsv(data, config),
  };
}
