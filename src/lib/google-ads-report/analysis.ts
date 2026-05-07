import { getEmptyMetrics } from "./dataFetcher";
import type {
  AdGroupPerformance,
  AdPerformance,
  AnalysisResult,
  CampaignPerformance,
  DevicePerformance,
  KeywordPerformance,
  LocationPerformance,
  MetricDelta,
  PerformanceComparison,
  PerformanceMetrics,
  Recommendation,
  RecommendationArea,
  ReportConfig,
  SearchTermPerformance,
  TimePerformance,
} from "./types";

const cascoIntentTerms = [
  "casco",
  "asigurare auto facultativa",
  "asigurare facultativa auto",
  "calculator casco",
  "oferta casco",
  "pret casco",
  "asigurare masina",
  "asigurare masina noua",
];

const irrelevantSearchIntentPatterns = [
  "rca",
  "asigurare obligatorie",
  "locuinta",
  "casa",
  "pad",
  "travel",
  "calatorie",
  "malpraxis",
  "sanatate",
  "job",
  "locuri de munca",
  "salariu",
  "gratis",
  "model cerere",
  "pdf",
  "telefon",
  "laptop",
  "service auto",
  "anvelope",
  "vigneta",
  "rovigneta",
];

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function weightedNullableRatio(items: PerformanceMetrics[], key: keyof PerformanceMetrics): number | null {
  const weighted = items.reduce(
    (total, item) => {
      const value = item[key];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return total;
      }

      const weight = item.impressions || item.cost || 1;
      return {
        value: total.value + value * weight,
        weight: total.weight + weight,
      };
    },
    { value: 0, weight: 0 },
  );

  return weighted.weight > 0 ? weighted.value / weighted.weight : null;
}

export function calculateTotals(items: PerformanceMetrics[]): PerformanceMetrics {
  if (!items.length) {
    return getEmptyMetrics();
  }

  const totals = items.reduce(
    (accumulator, item) => ({
      cost: accumulator.cost + item.cost,
      impressions: accumulator.impressions + item.impressions,
      clicks: accumulator.clicks + item.clicks,
      conversions: accumulator.conversions + item.conversions,
    }),
    { cost: 0, impressions: 0, clicks: 0, conversions: 0 },
  );

  return {
    cost: round(totals.cost),
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr: ratio(totals.clicks, totals.impressions),
    averageCpc: ratio(totals.cost, totals.clicks),
    conversions: round(totals.conversions, 2),
    conversionRate: ratio(totals.conversions, totals.clicks),
    costPerConversion: totals.conversions > 0 ? ratio(totals.cost, totals.conversions) : null,
    searchImpressionShare: weightedNullableRatio(items, "searchImpressionShare"),
    lostImpressionShareBudget: weightedNullableRatio(items, "lostImpressionShareBudget"),
    lostImpressionShareRank: weightedNullableRatio(items, "lostImpressionShareRank"),
  };
}

function metricDelta(current: number, previous: number): MetricDelta {
  return {
    current,
    previous,
    delta: current - previous,
    deltaPercent: previous === 0 ? null : (current - previous) / previous,
  };
}

function cpaForDelta(metrics: PerformanceMetrics): number {
  return metrics.costPerConversion ?? 0;
}

function fmtCurrency(value: number | null): string {
  return value === null ? "n/a" : `${round(value)} RON`;
}

function fmtPercent(value: number | null): string {
  return value === null ? "n/a" : `${round(value * 100, 1)}%`;
}

function recommendation(
  id: string,
  area: RecommendationArea,
  entity: string,
  issue: string,
  recommendationText: string,
  confidence: Recommendation["confidence"],
  evidence: string[],
  config: ReportConfig,
): Recommendation {
  return {
    id,
    area,
    entity,
    issue,
    recommendation: recommendationText,
    confidence,
    evidence,
    automaticChangeAllowed: config.automaticChangesAllowed,
  };
}

function hasPoorCpa(metrics: PerformanceMetrics, config: ReportConfig): boolean {
  return metrics.costPerConversion !== null && metrics.costPerConversion > config.thresholds.targetCpa;
}

function hasHighSpendNoConversions(metrics: PerformanceMetrics, config: ReportConfig): boolean {
  return metrics.cost >= config.thresholds.maximumSpendWithoutConversion && metrics.conversions < 1;
}

function strongCpa(metrics: PerformanceMetrics, config: ReportConfig): boolean {
  return metrics.conversions >= config.thresholds.minimumConversionThreshold && metrics.costPerConversion !== null
    ? metrics.costPerConversion <= config.thresholds.targetCpa
    : false;
}

function lowCtr(metrics: PerformanceMetrics, config: ReportConfig): boolean {
  return metrics.clicks >= config.thresholds.minimumClicksForCtrReview && metrics.ctr < config.thresholds.lowCtrThreshold;
}

function weakConversionRate(metrics: PerformanceMetrics, config: ReportConfig): boolean {
  return (
    metrics.cost >= config.thresholds.minimumCostForSegmentationReview &&
    metrics.conversionRate < config.thresholds.poorConversionRateThreshold
  );
}

function searchTermHasCascoIntent(term: string): boolean {
  const normalized = term.toLowerCase();
  return cascoIntentTerms.some((intentTerm) => normalized.includes(intentTerm));
}

function searchTermHasIrrelevantIntent(term: string): boolean {
  const normalized = term.toLowerCase();
  return irrelevantSearchIntentPatterns.some((pattern) => normalized.includes(pattern));
}

function campaignRecommendations(campaigns: CampaignPerformance[], config: ReportConfig): Recommendation[] {
  return campaigns.flatMap((campaign) => {
    const recommendations: Recommendation[] = [];

    if (hasHighSpendNoConversions(campaign, config)) {
      recommendations.push(
        recommendation(
          `campaign-high-spend-no-conv-${campaign.campaignId}`,
          "Campaign",
          campaign.campaignName,
          "High spend with no recorded leads.",
          "Review search terms, keywords, match types, and landing page intent before adding more budget. Reduce bids or pause waste-heavy segments if the pattern continues.",
          "High",
          [
            `Cost: ${fmtCurrency(campaign.cost)}`,
            `Conversions: ${campaign.conversions}`,
            `Target CPA: ${fmtCurrency(config.thresholds.targetCpa)}`,
          ],
          config,
        ),
      );
    }

    if (hasPoorCpa(campaign, config)) {
      recommendations.push(
        recommendation(
          `campaign-high-cpa-${campaign.campaignId}`,
          "Campaign",
          campaign.campaignName,
          "Cost per lead is above target.",
          "Tighten queries toward CASCO quote intent, reduce bids on expensive keywords, and send traffic to the CASCO landing page with a direct quote message.",
          "Medium",
          [
            `CPA: ${fmtCurrency(campaign.costPerConversion)}`,
            `Target CPA: ${fmtCurrency(config.thresholds.targetCpa)}`,
            `Conversion rate: ${fmtPercent(campaign.conversionRate)}`,
          ],
          config,
        ),
      );
    }

    if (campaign.lostImpressionShareBudget !== null && campaign.lostImpressionShareBudget >= 0.1 && strongCpa(campaign, config)) {
      recommendations.push(
        recommendation(
          `campaign-budget-upside-${campaign.campaignId}`,
          "Budget",
          campaign.campaignName,
          "Profitable campaign is losing search impression share because of budget.",
          "Consider increasing the daily budget gradually so more qualified CASCO searches can enter the auction.",
          "High",
          [
            `CPA: ${fmtCurrency(campaign.costPerConversion)}`,
            `Lost impression share due to budget: ${fmtPercent(campaign.lostImpressionShareBudget)}`,
          ],
          config,
        ),
      );
    }

    if (campaign.lostImpressionShareRank !== null && campaign.lostImpressionShareRank >= 0.2) {
      recommendations.push(
        recommendation(
          `campaign-rank-loss-${campaign.campaignId}`,
          "Campaign",
          campaign.campaignName,
          "Campaign is losing impression share because of low ad rank.",
          "Improve Quality Score by aligning CASCO keywords, ad copy, and the landing page promise. Review bids for high-intent terms such as calculator CASCO and oferta CASCO.",
          "Medium",
          [`Lost impression share due to rank: ${fmtPercent(campaign.lostImpressionShareRank)}`],
          config,
        ),
      );
    }

    if (campaign.ctr >= 0.05 && weakConversionRate(campaign, config)) {
      recommendations.push(
        recommendation(
          `campaign-landing-page-review-${campaign.campaignId}`,
          "Landing page",
          campaign.campaignName,
          "Search traffic clicks the ads, but few visitors become leads.",
          `Review the CASCO landing page (${config.targetLandingPage}), form friction, mobile speed, and quote promise. Make the first step clearly about fast CASCO calculation in Romania.`,
          "Medium",
          [`CTR: ${fmtPercent(campaign.ctr)}`, `Conversion rate: ${fmtPercent(campaign.conversionRate)}`],
          config,
        ),
      );
    }

    return recommendations;
  });
}

function keywordRecommendations(keywords: KeywordPerformance[], config: ReportConfig): Recommendation[] {
  return keywords
    .filter((keyword) => hasHighSpendNoConversions(keyword, config) || weakConversionRate(keyword, config))
    .slice(0, 25)
    .map((keyword) =>
      recommendation(
        `keyword-review-${keyword.criterionId}`,
        "Keyword",
        keyword.keywordText,
        hasHighSpendNoConversions(keyword, config)
          ? "Keyword has high spend and no leads."
          : "Keyword has weak conversion efficiency.",
        "Lower bids, narrow match type, or move the keyword into a tighter CASCO ad group with copy focused on fast online quote and trusted brokers.",
        hasHighSpendNoConversions(keyword, config) ? "High" : "Medium",
        [
          `Campaign: ${keyword.campaignName}`,
          `Ad group: ${keyword.adGroupName}`,
          `Cost: ${fmtCurrency(keyword.cost)}`,
          `Conversions: ${keyword.conversions}`,
          `Conversion rate: ${fmtPercent(keyword.conversionRate)}`,
        ],
        config,
      ),
    );
}

function searchTermRecommendations(searchTerms: SearchTermPerformance[], config: ReportConfig): Recommendation[] {
  return searchTerms
    .filter((term) => {
      if (term.searchTerm === "Unknown search term") {
        return false;
      }

      return (
        searchTermHasIrrelevantIntent(term.searchTerm) ||
        (hasHighSpendNoConversions(term, config) && !searchTermHasCascoIntent(term.searchTerm))
      );
    })
    .slice(0, 30)
    .map((term) => {
      const irrelevantIntent = searchTermHasIrrelevantIntent(term.searchTerm);
      return recommendation(
        `negative-term-${term.campaignId}-${term.adGroupId}-${term.searchTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        "Search term",
        term.searchTerm,
        irrelevantIntent
          ? "Search term appears unrelated to CASCO insurance lead intent."
          : "Search term spent meaningfully without generating leads.",
        "Review and add as a negative keyword if it is not a qualified CASCO insurance query. Prefer phrase/exact negatives so valuable insurance searches are not blocked.",
        irrelevantIntent ? "High" : "Medium",
        [
          `Campaign: ${term.campaignName}`,
          `Ad group: ${term.adGroupName}`,
          `Cost: ${fmtCurrency(term.cost)}`,
          `Conversions: ${term.conversions}`,
        ],
        config,
      );
    });
}

function adGroupRecommendations(adGroups: AdGroupPerformance[], config: ReportConfig): Recommendation[] {
  return adGroups
    .filter((adGroup) => hasHighSpendNoConversions(adGroup, config) || weakConversionRate(adGroup, config))
    .slice(0, 20)
    .map((adGroup) =>
      recommendation(
        `ad-group-review-${adGroup.adGroupId}`,
        "Ad group",
        adGroup.adGroupName,
        "Ad group is using budget inefficiently.",
        "Split mixed intent into tighter CASCO themes, remove broad low-intent queries, and align headlines with the exact keyword promise.",
        hasHighSpendNoConversions(adGroup, config) ? "High" : "Medium",
        [
          `Campaign: ${adGroup.campaignName}`,
          `Cost: ${fmtCurrency(adGroup.cost)}`,
          `Conversions: ${adGroup.conversions}`,
          `CPA: ${fmtCurrency(adGroup.costPerConversion)}`,
        ],
        config,
      ),
    );
}

function adRecommendations(ads: AdPerformance[], config: ReportConfig): Recommendation[] {
  return ads
    .filter((ad) => lowCtr(ad, config))
    .slice(0, 20)
    .map((ad) =>
      recommendation(
        `ad-low-ctr-${ad.adId}`,
        "Ad",
        `${ad.adGroupName} / ${ad.adId}`,
        "Ad has low CTR for its impression volume.",
        "Test new headlines focused on CASCO benefits: calcul online rapid, oferta in cateva minute, brokeri de incredere, acoperire pentru masina noua, and simple next step on sigur.ai/casco.",
        "Medium",
        [
          `Campaign: ${ad.campaignName}`,
          `CTR: ${fmtPercent(ad.ctr)}`,
          `Impressions: ${ad.impressions}`,
          `Current headline sample: ${ad.headlines.slice(0, 2).join(" | ") || "n/a"}`,
        ],
        config,
      ),
    );
}

function segmentRecommendations(
  items: Array<DevicePerformance | LocationPerformance | TimePerformance>,
  config: ReportConfig,
  area: RecommendationArea,
  labelFor: (item: DevicePerformance | LocationPerformance | TimePerformance) => string,
  recommendationText: string,
): Recommendation[] {
  return items
    .filter((item) => hasHighSpendNoConversions(item, config) || hasPoorCpa(item, config))
    .slice(0, 20)
    .map((item) =>
      recommendation(
        `${area.toLowerCase().replace(/\s+/g, "-")}-${labelFor(item).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        area,
        labelFor(item),
        "Segment has inefficient spend.",
        recommendationText,
        hasHighSpendNoConversions(item, config) ? "High" : "Medium",
        [
          `Cost: ${fmtCurrency(item.cost)}`,
          `Conversions: ${item.conversions}`,
          `CPA: ${fmtCurrency(item.costPerConversion)}`,
        ],
        config,
      ),
    );
}

function conversionTrackingRecommendations(
  current: PerformanceMetrics,
  previous: PerformanceMetrics,
  config: ReportConfig,
): Recommendation[] {
  const conversionsDropped =
    previous.conversions >= config.thresholds.minimumConversionThreshold &&
    current.conversions <= previous.conversions * 0.25;
  const clicksStillPresent = current.clicks >= previous.clicks * 0.5 || current.clicks >= config.thresholds.minimumClicksForCtrReview;

  if (!conversionsDropped || !clicksStillPresent) {
    return [];
  }

  return [
    recommendation(
      "conversion-tracking-drop",
      "Conversion tracking",
      "Account conversion volume",
      "Conversions dropped sharply while traffic continued.",
      "Check Google Ads conversion actions, tag firing, CRM lead import, form submission events, consent banner behavior, and recent landing page changes before making major bidding decisions.",
      "High",
      [
        `Current conversions: ${current.conversions}`,
        `Previous conversions: ${previous.conversions}`,
        `Current clicks: ${current.clicks}`,
        `Previous clicks: ${previous.clicks}`,
      ],
      config,
    ),
  ];
}

function bestCampaigns(campaigns: CampaignPerformance[], config: ReportConfig): CampaignPerformance[] {
  return [...campaigns]
    .filter((campaign) => campaign.conversions >= config.thresholds.minimumConversionThreshold)
    .sort((a, b) => {
      const aCpa = a.costPerConversion ?? Number.POSITIVE_INFINITY;
      const bCpa = b.costPerConversion ?? Number.POSITIVE_INFINITY;
      return aCpa - bCpa || b.conversions - a.conversions;
    })
    .slice(0, 5);
}

function underperformingCampaigns(campaigns: CampaignPerformance[], config: ReportConfig): CampaignPerformance[] {
  return [...campaigns]
    .filter((campaign) => hasHighSpendNoConversions(campaign, config) || hasPoorCpa(campaign, config))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
}

export function analyzePerformance(comparison: PerformanceComparison, config: ReportConfig): AnalysisResult {
  const currentTotals = calculateTotals(comparison.current.campaigns);
  const previousTotals = calculateTotals(comparison.previous.campaigns);
  const monthToDateTotals = comparison.monthToDate ? calculateTotals(comparison.monthToDate.campaigns) : undefined;
  const negativeKeywordSuggestions = searchTermRecommendations(comparison.current.searchTerms, config);
  const conversionTrackingNotes = conversionTrackingRecommendations(currentTotals, previousTotals, config);

  const recommendations = [
    ...campaignRecommendations(comparison.current.campaigns, config),
    ...keywordRecommendations(comparison.current.keywords, config),
    ...negativeKeywordSuggestions,
    ...adGroupRecommendations(comparison.current.adGroups, config),
    ...adRecommendations(comparison.current.ads, config),
    ...segmentRecommendations(
      comparison.current.devices,
      config,
      "Device",
      (item) => ("device" in item ? item.device : "Unknown device"),
      "Consider device bid adjustments or device-specific landing page fixes. For mobile, verify that the CASCO quote form is fast and easy to complete.",
    ),
    ...segmentRecommendations(
      comparison.current.locations,
      config,
      "Location",
      (item) => ("locationName" in item ? item.locationName : "Unknown location"),
      "Reduce bids or exclude areas that repeatedly spend above target without CASCO leads. Reallocate budget toward locations with qualified lead volume.",
    ),
    ...segmentRecommendations(
      comparison.current.days,
      config,
      "Schedule",
      (item) => ("dayOfWeek" in item && item.dayOfWeek ? item.dayOfWeek : "Unknown day"),
      "Use ad scheduling to reduce exposure on inefficient days and keep budget available for stronger lead windows.",
    ),
    ...segmentRecommendations(
      comparison.current.hours,
      config,
      "Schedule",
      (item) => ("hour" in item && item.hour !== undefined ? `${item.hour}:00` : "Unknown hour"),
      "Use hourly bid adjustments to reduce wasted spend and focus on periods when qualified CASCO leads are more likely.",
    ),
    ...conversionTrackingNotes,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      current: currentTotals,
      previous: previousTotals,
      monthToDate: monthToDateTotals,
    },
    weekOverWeek: {
      cost: metricDelta(currentTotals.cost, previousTotals.cost),
      clicks: metricDelta(currentTotals.clicks, previousTotals.clicks),
      conversions: metricDelta(currentTotals.conversions, previousTotals.conversions),
      conversionRate: metricDelta(currentTotals.conversionRate, previousTotals.conversionRate),
      costPerConversion: metricDelta(cpaForDelta(currentTotals), cpaForDelta(previousTotals)),
    },
    bestCampaigns: bestCampaigns(comparison.current.campaigns, config),
    underperformingCampaigns: underperformingCampaigns(comparison.current.campaigns, config),
    recommendations,
    negativeKeywordSuggestions,
    conversionTrackingNotes,
  };
}
