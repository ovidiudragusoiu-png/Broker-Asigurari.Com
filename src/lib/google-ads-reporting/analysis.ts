import type {
  AnalysisResult,
  GoogleAdsReportConfig,
  MetricRow,
  PerformanceDataset,
  Recommendation,
  SearchTermPerformance,
  WeeklyGoogleAdsData,
} from "./types";

function safeCpa(row: MetricRow) {
  return row.costPerConversion ?? (row.conversions > 0 ? row.cost / row.conversions : null);
}

function isPoorCpa(row: MetricRow, targetCpa: number) {
  const cpa = safeCpa(row);
  return cpa !== null && cpa > targetCpa * 1.5;
}

function metricSummary(row: MetricRow) {
  return {
    cost: Number(row.cost.toFixed(2)),
    clicks: row.clicks,
    conversions: Number(row.conversions.toFixed(2)),
    conversionRate: Number((row.conversionRate * 100).toFixed(2)),
    costPerConversion: safeCpa(row) === null ? null : Number(safeCpa(row)!.toFixed(2)),
  };
}

function safetyNote(config: GoogleAdsReportConfig) {
  return config.automaticChangesAllowed
    ? "Automatic changes are enabled, but this module only reports recommendations until a mutation workflow is explicitly added."
    : "Automatic changes are disabled. Review and approve before changing campaigns, bids, budgets, or negatives.";
}

function recommendation(
  config: GoogleAdsReportConfig,
  details: Omit<Recommendation, "safetyNote">,
): Recommendation {
  return {
    ...details,
    safetyNote: safetyNote(config),
  };
}

function sortByCost<T extends MetricRow>(rows: T[]) {
  return [...rows].sort((a, b) => b.cost - a.cost);
}

function sortByConversions<T extends MetricRow>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const cpaA = safeCpa(a) ?? Number.POSITIVE_INFINITY;
    const cpaB = safeCpa(b) ?? Number.POSITIVE_INFINITY;
    return b.conversions - a.conversions || cpaA - cpaB || b.clicks - a.clicks;
  });
}

function normalizeTerm(term: string) {
  return term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const cascoIntentTokens = [
  "casco",
  "asigurare casco",
  "calcul casco",
  "calculator casco",
  "oferta casco",
  "pret casco",
  "polita casco",
  "casco online",
];

const poorIntentTokens = [
  "rca",
  "asigurare obligatorie",
  "rovinieta",
  "itp",
  "talon",
  "impozit",
  "amenda",
  "lege",
  "forum",
  "job",
  "locuri de munca",
  "salariu",
  "pdf",
  "download",
  "model",
  "gratis",
  "gratuit",
  "dauna",
  "constatare",
  "reparatii",
  "piese",
  "service auto",
];

function hasCascoIntent(term: string) {
  const normalized = normalizeTerm(term);
  return cascoIntentTokens.some((token) => normalized.includes(token));
}

function hasPoorCascoIntent(term: string) {
  const normalized = normalizeTerm(term);
  return poorIntentTokens.some((token) => normalized.includes(token)) && !hasCascoIntent(term);
}

function isExistingNegative(term: string, dataset: PerformanceDataset) {
  const normalized = normalizeTerm(term);
  return dataset.existingNegativeKeywords.some((negative) => normalizeTerm(negative.text) === normalized);
}

function total(rows: MetricRow[]): MetricRow {
  const cost = rows.reduce((sum, row) => sum + row.cost, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);

  return {
    name: "Total",
    cost,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    averageCpc: clicks > 0 ? cost / clicks : 0,
    conversions,
    conversionRate: clicks > 0 ? conversions / clicks : 0,
    costPerConversion: conversions > 0 ? cost / conversions : null,
  };
}

function detectCampaignIssues(config: GoogleAdsReportConfig, dataset: PerformanceDataset): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const campaign of dataset.campaigns) {
    if (campaign.cost >= config.maximumAllowedSpendWithoutConversion && campaign.conversions < 1) {
      recommendations.push(
        recommendation(config, {
          category: "Campaign",
          title: `High spend with no conversions: ${campaign.name}`,
          finding: `${campaign.name} spent ${campaign.cost.toFixed(2)} ${config.currencyCode} in the last 7 days without recorded leads.`,
          recommendation:
            "Review search terms and keyword bids immediately. Reduce bids or pause the waste drivers, and confirm conversion tracking before increasing spend.",
          confidence: "High",
          impact: "High",
          relatedEntity: campaign.name,
          metrics: metricSummary(campaign),
        }),
      );
    } else if (campaign.conversions > 0 && isPoorCpa(campaign, config.targetCpa)) {
      recommendations.push(
        recommendation(config, {
          category: "Campaign",
          title: `CPA above target: ${campaign.name}`,
          finding: `${campaign.name} is generating leads, but the cost per lead is above the ${config.targetCpa} ${config.currencyCode} target.`,
          recommendation:
            "Tighten match types, move budget toward exact high-intent CASCO queries, and test landing-page messaging around fast quote and trusted broker support.",
          confidence: "Medium",
          impact: "High",
          relatedEntity: campaign.name,
          metrics: metricSummary(campaign),
        }),
      );
    }

    if ((campaign.lostImpressionShareBudget ?? 0) >= 0.2 && campaign.conversions >= config.minimumConversionThreshold) {
      recommendations.push(
        recommendation(config, {
          category: "Budget",
          title: `Budget-limited profitable campaign: ${campaign.name}`,
          finding: `${campaign.name} is losing ${(campaign.lostImpressionShareBudget! * 100).toFixed(
            1,
          )}% search impression share due to budget while producing leads.`,
          recommendation:
            "Consider increasing budget only if recent cost per lead remains near target and lead quality is acceptable for CASCO quote requests.",
          confidence: safeCpa(campaign) !== null && safeCpa(campaign)! <= config.targetCpa ? "High" : "Medium",
          impact: "High",
          relatedEntity: campaign.name,
          metrics: {
            ...metricSummary(campaign),
            lostImpressionShareBudget: Number(((campaign.lostImpressionShareBudget ?? 0) * 100).toFixed(2)),
          },
        }),
      );
    }

    if ((campaign.lostImpressionShareRank ?? 0) >= 0.25) {
      recommendations.push(
        recommendation(config, {
          category: "Bid/targeting",
          title: `Ad rank is limiting reach: ${campaign.name}`,
          finding: `${campaign.name} is losing ${(campaign.lostImpressionShareRank! * 100).toFixed(
            1,
          )}% search impression share due to rank.`,
          recommendation:
            "Improve Quality Score by aligning keywords, CASCO-focused ad copy, and the landing page. Raise bids selectively for exact high-intent terms if CPA supports it.",
          confidence: "Medium",
          impact: "Medium",
          relatedEntity: campaign.name,
          metrics: {
            ...metricSummary(campaign),
            lostImpressionShareRank: Number(((campaign.lostImpressionShareRank ?? 0) * 100).toFixed(2)),
          },
        }),
      );
    }
  }

  return recommendations;
}

function detectKeywordIssues(config: GoogleAdsReportConfig, dataset: PerformanceDataset): Recommendation[] {
  return sortByCost(dataset.keywords)
    .filter(
      (keyword) =>
        keyword.cost >= config.maximumAllowedSpendWithoutConversion / 2 &&
        (keyword.conversions < 1 || isPoorCpa(keyword, config.targetCpa)),
    )
    .slice(0, 12)
    .map((keyword) =>
      recommendation(config, {
        category: "Keyword",
        title: `Keyword needs bid or match-type review: ${keyword.keywordText}`,
        finding:
          keyword.conversions < 1
            ? `The keyword "${keyword.keywordText}" spent ${keyword.cost.toFixed(2)} ${config.currencyCode} with no leads.`
            : `The keyword "${keyword.keywordText}" is above the target cost per lead.`,
        recommendation:
          "Reduce bids, use stricter match types, or move the keyword into a tightly themed CASCO ad group with ad copy that matches quote intent.",
        confidence: keyword.conversions < 1 ? "High" : "Medium",
        impact: "Medium",
        relatedEntity: keyword.keywordText,
        metrics: metricSummary(keyword),
      }),
    );
}

function detectAdGroupIssues(config: GoogleAdsReportConfig, dataset: PerformanceDataset): Recommendation[] {
  return sortByCost(dataset.adGroups)
    .filter(
      (adGroup) =>
        adGroup.cost >= config.maximumAllowedSpendWithoutConversion / 2 &&
        (adGroup.conversions < 1 || isPoorCpa(adGroup, config.targetCpa)),
    )
    .slice(0, 10)
    .map((adGroup) =>
      recommendation(config, {
        category: "Ad group",
        title: `Ad group needs restructuring: ${adGroup.name}`,
        finding:
          adGroup.conversions < 1
            ? `${adGroup.name} spent ${adGroup.cost.toFixed(2)} ${config.currencyCode} with no leads.`
            : `${adGroup.name} is generating leads above the target cost per lead.`,
        recommendation:
          "Split high-intent CASCO keywords into tighter ad groups, remove weak themes, and align each ad group with CASCO quote-focused headlines and landing-page intent.",
        confidence: adGroup.conversions < 1 ? "High" : "Medium",
        impact: "Medium",
        relatedEntity: adGroup.name,
        metrics: metricSummary(adGroup),
      }),
    );
}

function detectNegativeKeywordOpportunities(
  config: GoogleAdsReportConfig,
  dataset: PerformanceDataset,
): Recommendation[] {
  return sortByCost(dataset.searchTerms)
    .filter((term) => !isExistingNegative(term.searchTerm, dataset))
    .filter(
      (term) =>
        hasPoorCascoIntent(term.searchTerm) ||
        (term.cost >= config.maximumAllowedSpendWithoutConversion / 3 && term.conversions < 1 && !hasCascoIntent(term.searchTerm)),
    )
    .slice(0, 20)
    .map((term: SearchTermPerformance) =>
      recommendation(config, {
        category: "Search term",
        title: `Negative keyword candidate: ${term.searchTerm}`,
        finding: `The search term "${term.searchTerm}" does not show strong CASCO quote intent and spent ${term.cost.toFixed(
          2,
        )} ${config.currencyCode} with ${term.conversions.toFixed(1)} conversions.`,
        recommendation:
          "Add this as a negative keyword after human review, preferably at campaign level if it is irrelevant to CASCO insurance leads across the account.",
        confidence: hasPoorCascoIntent(term.searchTerm) ? "High" : "Medium",
        impact: "Medium",
        relatedEntity: term.searchTerm,
        metrics: metricSummary(term),
      }),
    );
}

function detectSegmentIssues(
  config: GoogleAdsReportConfig,
  rows: MetricRow[],
  category: "Bid/targeting",
  entityLabel: string,
  recommendationText: string,
) {
  return sortByCost(rows)
    .filter(
      (row) =>
        row.cost >= config.maximumAllowedSpendWithoutConversion / 2 &&
        (row.conversions < 1 || isPoorCpa(row, config.targetCpa)),
    )
    .slice(0, 8)
    .map((row) =>
      recommendation(config, {
        category,
        title: `${entityLabel} is inefficient: ${row.name}`,
        finding:
          row.conversions < 1
            ? `${row.name} spent ${row.cost.toFixed(2)} ${config.currencyCode} without leads.`
            : `${row.name} is above the target cost per lead.`,
        recommendation: recommendationText,
        confidence: row.conversions < 1 ? "High" : "Medium",
        impact: "Medium",
        relatedEntity: row.name,
        metrics: metricSummary(row),
      }),
    );
}

function detectAdAndLandingPageIssues(config: GoogleAdsReportConfig, dataset: PerformanceDataset): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const ad of dataset.ads) {
    if (ad.impressions >= 500 && ad.ctr < 0.03) {
      recommendations.push(
        recommendation(config, {
          category: "Ad copy",
          title: `Low ad CTR: ${ad.name}`,
          finding: `${ad.name} has ${(ad.ctr * 100).toFixed(2)}% CTR after ${ad.impressions} impressions.`,
          recommendation:
            "Test new headlines focused on CASCO benefits: fast online quote, trusted insurance brokers, online calculation, damage coverage, and simple comparison.",
          confidence: "Medium",
          impact: "Medium",
          relatedEntity: ad.name,
          metrics: metricSummary(ad),
        }),
      );
    }

    if (ad.clicks >= 30 && ad.ctr >= 0.05 && ad.conversionRate < 0.02) {
      recommendations.push(
        recommendation(config, {
          category: "Landing page",
          title: `Good clicks but weak conversion: ${ad.name}`,
          finding: `${ad.name} attracts clicks, but fewer than 2% become leads.`,
          recommendation: `Review ${config.cascoLandingPageUrl} for message match, form friction, mobile speed, trust signals, and clear CASCO quote expectations.`,
          confidence: "Medium",
          impact: "High",
          relatedEntity: ad.name,
          metrics: metricSummary(ad),
        }),
      );
    }
  }

  return recommendations;
}

function detectConversionDrop(config: GoogleAdsReportConfig, data: WeeklyGoogleAdsData): Recommendation[] {
  const current = total(data.last7Days.campaigns);
  const previous = total(data.previous7Days.campaigns);

  if (previous.conversions >= config.minimumConversionThreshold && current.conversions <= previous.conversions * 0.5) {
    return [
      recommendation(config, {
        category: "Conversion tracking",
        title: "Conversions dropped sharply week over week",
        finding: `Conversions fell from ${previous.conversions.toFixed(1)} to ${current.conversions.toFixed(
          1,
        )} while clicks changed from ${previous.clicks} to ${current.clicks}.`,
        recommendation:
          "Check conversion tracking, thank-you page events, form submissions, CRM lead ingestion, and landing-page availability before making aggressive bid cuts.",
        confidence: current.clicks >= previous.clicks * 0.7 ? "High" : "Medium",
        impact: "High",
        relatedEntity: "Account",
        metrics: {
          currentConversions: Number(current.conversions.toFixed(2)),
          previousConversions: Number(previous.conversions.toFixed(2)),
          currentClicks: current.clicks,
          previousClicks: previous.clicks,
        },
      }),
    ];
  }

  return [];
}

export function analyzePerformance(config: GoogleAdsReportConfig, data: WeeklyGoogleAdsData): AnalysisResult {
  const dataset = data.last7Days;
  const bestCampaigns = sortByConversions(dataset.campaigns)
    .filter((campaign) => campaign.conversions >= config.minimumConversionThreshold)
    .slice(0, 5);
  const underperformingCampaigns = sortByCost(dataset.campaigns)
    .filter((campaign) => campaign.conversions < 1 || isPoorCpa(campaign, config.targetCpa))
    .slice(0, 5);

  const campaignRecommendations = detectCampaignIssues(config, dataset);
  const adGroupRecommendations = detectAdGroupIssues(config, dataset);
  const keywordRecommendations = detectKeywordIssues(config, dataset);
  const negativeKeywordSuggestions = detectNegativeKeywordOpportunities(config, dataset);
  const deviceRecommendations = detectSegmentIssues(
    config,
    dataset.devices,
    "Bid/targeting",
    "Device segment",
    "Adjust device bid modifiers or split device performance analysis before increasing budget.",
  );
  const locationRecommendations = detectSegmentIssues(
    config,
    dataset.locations,
    "Bid/targeting",
    "Location segment",
    "Reduce bids or exclude poor locations after confirming lead quality and sales coverage for Romanian CASCO quotes.",
  );
  const scheduleRecommendations = detectSegmentIssues(
    config,
    dataset.dayHours,
    "Bid/targeting",
    "Day/hour segment",
    "Use ad scheduling or bid adjustments to reduce spend in inefficient periods and concentrate budget when lead quality is stronger.",
  );
  const adAndLandingPageRecommendations = detectAdAndLandingPageIssues(config, dataset);
  const conversionTrackingNotes = detectConversionDrop(config, data);

  const recommendations = [
    ...campaignRecommendations,
    ...adGroupRecommendations,
    ...keywordRecommendations,
    ...negativeKeywordSuggestions,
    ...deviceRecommendations,
    ...locationRecommendations,
    ...scheduleRecommendations,
    ...adAndLandingPageRecommendations,
    ...conversionTrackingNotes,
  ];

  return {
    recommendations,
    bestCampaigns,
    underperformingCampaigns,
    negativeKeywordSuggestions,
    budgetRecommendations: recommendations.filter((item) => item.category === "Budget"),
    bidAndTargetingRecommendations: recommendations.filter((item) => item.category === "Bid/targeting"),
    adCopyRecommendations: recommendations.filter((item) => item.category === "Ad copy"),
    landingPageNotes: recommendations.filter((item) => item.category === "Landing page"),
    conversionTrackingNotes,
    priorityActions: [...recommendations]
      .sort((a, b) => {
        const impactScore = { High: 3, Medium: 2, Low: 1 };
        const confidenceScore = { High: 3, Medium: 2, Low: 1 };
        return (
          impactScore[b.impact] - impactScore[a.impact] ||
          confidenceScore[b.confidence] - confidenceScore[a.confidence]
        );
      })
      .slice(0, 7),
  };
}
