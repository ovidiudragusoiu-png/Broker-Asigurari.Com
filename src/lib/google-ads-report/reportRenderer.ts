import type {
  AiRecommendationResult,
  AnalysisResult,
  CampaignPerformance,
  PerformanceComparison,
  PerformanceMetrics,
  Recommendation,
  ReportConfig,
} from "./types";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function currency(value: number | null): string {
  return value === null ? "n/a" : `${round(value)} RON`;
}

function percent(value: number | null): string {
  return value === null ? "n/a" : `${round(value * 100, 1)}%`;
}

function numberText(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : round(value, 2).toLocaleString("en-US");
}

function deltaText(current: number, previous: number, isPercent = false): string {
  const delta = current - previous;
  const deltaPercent = previous === 0 ? null : delta / previous;
  const value = isPercent ? percent(delta) : numberText(delta);
  const direction = delta > 0 ? "+" : "";
  const relative = deltaPercent === null ? "no previous baseline" : `${direction}${percent(deltaPercent)}`;
  return `${direction}${value} (${relative})`;
}

function renderMetrics(metrics: PerformanceMetrics): string {
  return [
    `Cost: ${currency(metrics.cost)}`,
    `Impressions: ${numberText(metrics.impressions)}`,
    `Clicks: ${numberText(metrics.clicks)}`,
    `CTR: ${percent(metrics.ctr)}`,
    `Avg. CPC: ${currency(metrics.averageCpc)}`,
    `Conversions: ${numberText(metrics.conversions)}`,
    `Conversion rate: ${percent(metrics.conversionRate)}`,
    `Cost per conversion: ${currency(metrics.costPerConversion)}`,
    `Search impression share: ${percent(metrics.searchImpressionShare)}`,
    `Lost IS budget: ${percent(metrics.lostImpressionShareBudget)}`,
    `Lost IS rank: ${percent(metrics.lostImpressionShareRank)}`,
  ].join(" | ");
}

function renderCampaignTable(campaigns: CampaignPerformance[]): string {
  if (!campaigns.length) {
    return "No campaigns matched this section.";
  }

  const rows = campaigns.map(
    (campaign) =>
      `| ${campaign.campaignName} | ${campaign.campaignStatus} | ${currency(campaign.budget)} | ${currency(
        campaign.cost,
      )} | ${numberText(campaign.conversions)} | ${currency(campaign.costPerConversion)} | ${percent(
        campaign.conversionRate,
      )} | ${percent(campaign.lostImpressionShareBudget)} | ${percent(campaign.lostImpressionShareRank)} |`,
  );

  return [
    "| Campaign | Status | Budget | Cost | Conversions | CPA | Conv. rate | Lost IS budget | Lost IS rank |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
  ].join("\n");
}

function renderRecommendations(recommendations: Recommendation[], emptyText: string): string {
  if (!recommendations.length) {
    return emptyText;
  }

  return recommendations
    .map((item, index) => {
      const evidence = item.evidence.length ? `\n  Evidence: ${item.evidence.join("; ")}` : "";
      const safety = item.automaticChangeAllowed
        ? "Manual approval setting allows changes, but this report module only logs recommendations."
        : "No automatic change will be made.";
      return `${index + 1}. [${item.confidence}] ${item.entity}: ${item.issue}\n  Recommendation: ${
        item.recommendation
      }${evidence}\n  Safety: ${safety}`;
    })
    .join("\n\n");
}

function recommendationsByArea(recommendations: Recommendation[], areas: Recommendation["area"][]): Recommendation[] {
  return recommendations.filter((item) => areas.includes(item.area));
}

function topSearchTerms(comparison: PerformanceComparison): string {
  const terms = comparison.current.searchTerms.slice(0, 15);
  if (!terms.length) {
    return "No search term data was returned for this period.";
  }

  return [
    "| Search term | Campaign | Cost | Clicks | Conversions | CPA |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...terms.map(
      (term) =>
        `| ${term.searchTerm} | ${term.campaignName} | ${currency(term.cost)} | ${numberText(
          term.clicks,
        )} | ${numberText(term.conversions)} | ${currency(term.costPerConversion)} |`,
    ),
  ].join("\n");
}

function priorityPlan(recommendations: Recommendation[]): string {
  const sorted = [...recommendations].sort((a, b) => {
    const confidenceRank = { High: 0, Medium: 1, Low: 2 };
    return confidenceRank[a.confidence] - confidenceRank[b.confidence];
  });

  if (!sorted.length) {
    return "1. Keep monitoring campaign volume, CPA, conversion tracking, and search terms next week.";
  }

  return sorted
    .slice(0, 7)
    .map((item, index) => `${index + 1}. [${item.confidence}] ${item.entity}: ${item.recommendation}`)
    .join("\n");
}

function executiveSummary(
  analysis: AnalysisResult,
  aiResult: AiRecommendationResult,
  allRecommendations: Recommendation[],
): string {
  const current = analysis.totals.current;
  const previous = analysis.totals.previous;
  const highPriorityCount = allRecommendations.filter((item) => item.confidence === "High").length;

  return [
    `Last week produced ${numberText(current.conversions)} conversions at ${currency(
      current.costPerConversion,
    )} cost per conversion from ${currency(current.cost)} spend.`,
    `Compared with the previous 7 days, conversions changed by ${deltaText(
      current.conversions,
      previous.conversions,
    )} and cost per conversion changed by ${deltaText(
      current.costPerConversion ?? 0,
      previous.costPerConversion ?? 0,
    )}.`,
    `${highPriorityCount} high-confidence recommendations need review this week.`,
    aiResult.narrative,
  ]
    .filter(Boolean)
    .join(" ");
}

export function renderWeeklyReport(
  comparison: PerformanceComparison,
  analysis: AnalysisResult,
  aiResult: AiRecommendationResult,
  config: ReportConfig,
): string {
  const allRecommendations = [...analysis.recommendations, ...aiResult.recommendations];
  const budgetRecommendations = recommendationsByArea(allRecommendations, ["Budget"]);
  const bidTargetingRecommendations = recommendationsByArea(allRecommendations, [
    "Campaign",
    "Keyword",
    "Ad group",
    "Device",
    "Location",
    "Schedule",
  ]);
  const adCopyRecommendations = recommendationsByArea(allRecommendations, ["Ad"]);
  const landingPageRecommendations = recommendationsByArea(allRecommendations, ["Landing page", "Conversion tracking"]);

  return `# Weekly Google Ads Performance Report

Date range: ${comparison.current.dateRange.startDate} to ${comparison.current.dateRange.endDate}
Account: ${config.googleAdsCustomerId}
Focus: CASCO insurance lead generation in Romania
Landing page: ${config.targetLandingPage}
Automatic changes allowed: ${config.automaticChangesAllowed ? "yes" : "no"}

## 1. Executive Summary

${executiveSummary(analysis, aiResult, allRecommendations)}

## 2. Key Metrics

${renderMetrics(analysis.totals.current)}

${analysis.totals.monthToDate ? `Month to date: ${renderMetrics(analysis.totals.monthToDate)}\n` : ""}
## 3. Week-over-Week Comparison

| Metric | Last 7 days | Previous 7 days | Change |
| --- | ---: | ---: | ---: |
| Cost | ${currency(analysis.totals.current.cost)} | ${currency(analysis.totals.previous.cost)} | ${deltaText(
    analysis.totals.current.cost,
    analysis.totals.previous.cost,
  )} |
| Clicks | ${numberText(analysis.totals.current.clicks)} | ${numberText(
    analysis.totals.previous.clicks,
  )} | ${deltaText(analysis.totals.current.clicks, analysis.totals.previous.clicks)} |
| Conversions | ${numberText(analysis.totals.current.conversions)} | ${numberText(
    analysis.totals.previous.conversions,
  )} | ${deltaText(analysis.totals.current.conversions, analysis.totals.previous.conversions)} |
| Conversion rate | ${percent(analysis.totals.current.conversionRate)} | ${percent(
    analysis.totals.previous.conversionRate,
  )} | ${deltaText(
    analysis.totals.current.conversionRate,
    analysis.totals.previous.conversionRate,
    true,
  )} |
| Cost per conversion | ${currency(analysis.totals.current.costPerConversion)} | ${currency(
    analysis.totals.previous.costPerConversion,
  )} | ${deltaText(
    analysis.totals.current.costPerConversion ?? 0,
    analysis.totals.previous.costPerConversion ?? 0,
  )} |

## 4. Best Performing Campaigns

${renderCampaignTable(analysis.bestCampaigns)}

## 5. Underperforming Campaigns

${renderCampaignTable(analysis.underperformingCampaigns)}

## 6. Search Terms Review

${topSearchTerms(comparison)}

## 7. Negative Keyword Suggestions

${renderRecommendations(
    analysis.negativeKeywordSuggestions,
    "No clear negative keyword suggestions were detected from the returned search terms.",
  )}

## 8. Budget Recommendations

${renderRecommendations(
    budgetRecommendations,
    "No budget increases are recommended until campaigns show stronger CPA and conversion consistency.",
  )}

## 9. Bid and Targeting Recommendations

${renderRecommendations(
    bidTargetingRecommendations,
    "No major bid or targeting issues were detected from this week's data.",
  )}

## 10. Ad Copy Recommendations

${renderRecommendations(
    adCopyRecommendations,
    "No low-CTR ads met the review threshold. Continue testing CASCO headlines around fast quote, online calculation, trusted brokers, and clear benefits.",
  )}

## 11. Landing Page / Conversion Tracking Notes

${renderRecommendations(
    landingPageRecommendations,
    "No immediate landing page or conversion tracking issue was detected. Continue checking that CASCO form submissions and imported leads are counted correctly.",
  )}

## 12. Priority Action Plan for This Week

${priorityPlan(allRecommendations)}

---

Safety note: this automation only reports and recommends. It does not pause campaigns, change budgets, change bids, or add negative keywords. Every recommendation above includes a confidence level for manual review.
`;
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildCsvAttachment(comparison: PerformanceComparison): string {
  const rows: Array<Array<string | number | null | undefined>> = [
    [
      "section",
      "entity",
      "campaign",
      "cost",
      "impressions",
      "clicks",
      "ctr",
      "conversions",
      "conversion_rate",
      "cost_per_conversion",
    ],
  ];

  comparison.current.campaigns.forEach((campaign) => {
    rows.push([
      "campaign",
      campaign.campaignName,
      campaign.campaignName,
      campaign.cost,
      campaign.impressions,
      campaign.clicks,
      campaign.ctr,
      campaign.conversions,
      campaign.conversionRate,
      campaign.costPerConversion,
    ]);
  });

  comparison.current.keywords.forEach((keyword) => {
    rows.push([
      "keyword",
      keyword.keywordText,
      keyword.campaignName,
      keyword.cost,
      keyword.impressions,
      keyword.clicks,
      keyword.ctr,
      keyword.conversions,
      keyword.conversionRate,
      keyword.costPerConversion,
    ]);
  });

  comparison.current.searchTerms.forEach((term) => {
    rows.push([
      "search_term",
      term.searchTerm,
      term.campaignName,
      term.cost,
      term.impressions,
      term.clicks,
      term.ctr,
      term.conversions,
      term.conversionRate,
      term.costPerConversion,
    ]);
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
