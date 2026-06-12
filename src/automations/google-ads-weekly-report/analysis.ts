import type {
  AnalysisResult,
  CampaignPerformance,
  GoogleAdsPerformanceSnapshot,
  GoogleAdsReportConfig,
  PerformanceMetrics,
  Recommendation,
} from "./types";

const CASCO_INTENT_TERMS = [
  "casco",
  "asigurare casco",
  "calculator casco",
  "oferta casco",
  "pret casco",
  "polita casco",
  "asigurare auto facultativa",
];

const IRRELEVANT_OR_LOW_INTENT_TERMS = [
  "rca",
  "pad",
  "locuinta",
  "casa",
  "sanatate",
  "viata",
  "malpraxis",
  "travel",
  "calatorie",
  "job",
  "locuri de munca",
  "salariu",
  "gratis",
  "pdf",
  "lege",
  "amenda",
  "despagubire",
  "dosar dauna",
];

function sumMetrics(items: PerformanceMetrics[]): PerformanceMetrics {
  const costRon = items.reduce((sum, item) => sum + item.costRon, 0);
  const impressions = items.reduce((sum, item) => sum + item.impressions, 0);
  const clicks = items.reduce((sum, item) => sum + item.clicks, 0);
  const conversions = items.reduce((sum, item) => sum + item.conversions, 0);

  return {
    costRon,
    impressions,
    clicks,
    conversions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    averageCpcRon: clicks > 0 ? costRon / clicks : 0,
    conversionRate: clicks > 0 ? conversions / clicks : 0,
    costPerConversionRon: conversions > 0 ? costRon / conversions : null,
  };
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return `${value.toFixed(2)} RON`;
}

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function sortByConversionsThenCpa(a: CampaignPerformance, b: CampaignPerformance) {
  if (b.conversions !== a.conversions) {
    return b.conversions - a.conversions;
  }
  return (a.costPerConversionRon ?? Number.MAX_SAFE_INTEGER) - (b.costPerConversionRon ?? Number.MAX_SAFE_INTEGER);
}

function sortByCostDescending(a: PerformanceMetrics, b: PerformanceMetrics) {
  return b.costRon - a.costRon;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function isStrongCampaign(campaign: CampaignPerformance, config: GoogleAdsReportConfig) {
  return (
    campaign.conversions >= config.minimumConversionThreshold &&
    campaign.costPerConversionRon !== null &&
    campaign.costPerConversionRon <= config.targetCpaRon
  );
}

function pushRecommendation(recommendations: Recommendation[], recommendation: Recommendation) {
  const duplicate = recommendations.some(
    (existing) =>
      existing.category === recommendation.category &&
      existing.entityName === recommendation.entityName &&
      existing.title === recommendation.title,
  );

  if (!duplicate) {
    recommendations.push(recommendation);
  }
}

function analyzeCampaigns(
  snapshot: GoogleAdsPerformanceSnapshot,
  previous: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const campaign of snapshot.campaigns) {
    if (campaign.costRon >= config.maximumAllowedSpendWithoutConversionRon && campaign.conversions === 0) {
      pushRecommendation(recommendations, {
        category: "Campaign",
        title: "High spend with no CASCO leads",
        entityName: campaign.campaignName,
        finding: `${campaign.campaignName} spent ${money(campaign.costRon)} with zero conversions.`,
        recommendation:
          "Review search terms, bids, and landing-page intent before adding more budget. Reduce bids or pause only after manual approval if spend remains inefficient.",
        confidence: "High",
        impact: "High",
        supportingMetric: `Spend ${money(campaign.costRon)}, conversions 0`,
      });
    }

    if (
      campaign.costPerConversionRon !== null &&
      campaign.costPerConversionRon > config.targetCpaRon * 1.5 &&
      campaign.conversions < config.minimumConversionThreshold
    ) {
      pushRecommendation(recommendations, {
        category: "Campaign",
        title: "Cost per lead is above target",
        entityName: campaign.campaignName,
        finding: `${campaign.campaignName} CPA is ${money(campaign.costPerConversionRon)} versus a target of ${money(config.targetCpaRon)}.`,
        recommendation:
          "Tighten match types, shift budget toward exact CASCO intent terms, and review whether the ad promises match the CASCO calculator page.",
        confidence: "Medium",
        impact: "High",
        supportingMetric: `CPA ${money(campaign.costPerConversionRon)}`,
      });
    }

    if ((campaign.lostImpressionShareBudget ?? 0) >= 0.15 && isStrongCampaign(campaign, config)) {
      pushRecommendation(recommendations, {
        category: "Budget",
        title: "Profitable campaign is limited by budget",
        entityName: campaign.campaignName,
        finding: `${campaign.campaignName} is within target CPA and lost ${percent(campaign.lostImpressionShareBudget)} of eligible search impressions due to budget.`,
        recommendation:
          "Increase budget gradually after manual review so profitable CASCO searches are not capped during high-intent hours.",
        confidence: "High",
        impact: "High",
        supportingMetric: `CPA ${money(campaign.costPerConversionRon)}, budget lost IS ${percent(campaign.lostImpressionShareBudget)}`,
      });
    }

    if ((campaign.lostImpressionShareRank ?? 0) >= 0.3) {
      pushRecommendation(recommendations, {
        category: "Bids",
        title: "Search impression share lost due to rank",
        entityName: campaign.campaignName,
        finding: `${campaign.campaignName} lost ${percent(campaign.lostImpressionShareRank)} of eligible impressions due to ad rank.`,
        recommendation:
          "Improve Quality Score by aligning CASCO keywords, ad copy, and the casco landing page. Review bids only for terms that already show qualified lead intent.",
        confidence: "Medium",
        impact: "Medium",
        supportingMetric: `Rank lost IS ${percent(campaign.lostImpressionShareRank)}`,
      });
    }
  }

  const previousSummary = sumMetrics(previous.campaigns);
  const currentSummary = sumMetrics(snapshot.campaigns);
  const conversionsDropped = previousSummary.conversions >= 2 && currentSummary.conversions <= previousSummary.conversions * 0.5;
  const clicksStable = currentSummary.clicks >= previousSummary.clicks * 0.7;

  if (conversionsDropped && clicksStable) {
    pushRecommendation(recommendations, {
      category: "Conversion Tracking",
      title: "Conversions dropped while traffic stayed stable",
      finding: `Conversions fell from ${previousSummary.conversions.toFixed(1)} to ${currentSummary.conversions.toFixed(1)} while clicks stayed near the prior week.`,
      recommendation:
        "Audit the CASCO form submission event, thank-you page, Google Tag Manager tags, and lead delivery. Also check whether the landing page changed or the form has validation errors.",
      confidence: "High",
      impact: "High",
      supportingMetric: `Clicks ${currentSummary.clicks} vs ${previousSummary.clicks}`,
    });
  }
}

function analyzeKeywords(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const keyword of snapshot.keywords) {
    if (keyword.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.6 && keyword.conversions === 0) {
      pushRecommendation(recommendations, {
        category: "Keyword",
        title: "Keyword spent without leads",
        entityName: keyword.keywordText,
        finding: `"${keyword.keywordText}" spent ${money(keyword.costRon)} without generating a CASCO lead.`,
        recommendation:
          "Lower the bid, narrow the match type, or pause after manual approval if the search terms are not aligned with CASCO quote intent.",
        confidence: "High",
        impact: "High",
        supportingMetric: `Spend ${money(keyword.costRon)}, conversions 0`,
      });
    }

    if (
      keyword.qualityScore !== null &&
      keyword.qualityScore !== undefined &&
      !Number.isNaN(keyword.qualityScore) &&
      keyword.qualityScore <= 4 &&
      keyword.costRon > 0
    ) {
      pushRecommendation(recommendations, {
        category: "Keyword",
        title: "Low Quality Score",
        entityName: keyword.keywordText,
        finding: `"${keyword.keywordText}" has a Quality Score of ${keyword.qualityScore}.`,
        recommendation:
          "Rewrite ad copy around CASCO benefits, fast online calculation, and trusted brokers, then ensure the keyword appears naturally on the landing page.",
        confidence: "Medium",
        impact: "Medium",
        supportingMetric: `Quality Score ${keyword.qualityScore}`,
      });
    }
  }
}

function analyzeSearchTerms(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
): Recommendation[] {
  const negativeSuggestions: Recommendation[] = [];

  for (const term of snapshot.searchTerms) {
    const normalized = term.searchTerm.toLowerCase();
    const looksRelevant = includesAny(normalized, CASCO_INTENT_TERMS);
    const looksIrrelevant = includesAny(normalized, IRRELEVANT_OR_LOW_INTENT_TERMS) && !normalized.includes("casco");
    const spentWithoutLead = term.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.4 && term.conversions === 0;

    if (looksIrrelevant || spentWithoutLead) {
      const recommendation: Recommendation = {
        category: "Search Terms",
        title: "Negative keyword opportunity",
        entityName: term.searchTerm,
        finding: looksIrrelevant
          ? `"${term.searchTerm}" appears unrelated to CASCO lead generation.`
          : `"${term.searchTerm}" spent ${money(term.costRon)} without a lead.`,
        recommendation:
          "Add this as an exact or phrase negative keyword after reviewing the raw query to avoid blocking valid CASCO quote searches.",
        confidence: looksIrrelevant ? "High" : "Medium",
        impact: spentWithoutLead ? "High" : "Medium",
        supportingMetric: `Spend ${money(term.costRon)}, conversions ${term.conversions}`,
      };
      negativeSuggestions.push(recommendation);
      pushRecommendation(recommendations, recommendation);
    }

    if (looksRelevant && term.conversions >= config.minimumConversionThreshold && term.costPerConversionRon !== null) {
      pushRecommendation(recommendations, {
        category: "Keyword",
        title: "Promote high-intent CASCO search term",
        entityName: term.searchTerm,
        finding: `"${term.searchTerm}" generated ${term.conversions.toFixed(1)} leads at ${money(term.costPerConversionRon)} CPA.`,
        recommendation:
          "Add this query as an exact-match keyword in a dedicated CASCO ad group with ad copy tailored to online calculation and fast broker follow-up.",
        confidence: "High",
        impact: "Medium",
        supportingMetric: `CPA ${money(term.costPerConversionRon)}`,
      });
    }
  }

  return negativeSuggestions;
}

function analyzeAds(snapshot: GoogleAdsPerformanceSnapshot, recommendations: Recommendation[]) {
  for (const ad of snapshot.ads) {
    if (ad.impressions >= 500 && ad.ctr < 0.03) {
      pushRecommendation(recommendations, {
        category: "Ad Copy",
        title: "Low CTR ad",
        entityName: `${ad.campaignName} / ${ad.adGroupName} / ad ${ad.adId}`,
        finding: `Ad ${ad.adId} has ${percent(ad.ctr)} CTR after ${ad.impressions} impressions.`,
        recommendation:
          "Test headlines focused on CASCO benefits: online calculator, fast quote, broker support, flexible coverage, and trusted Romanian insurers.",
        confidence: "Medium",
        impact: "Medium",
        supportingMetric: `CTR ${percent(ad.ctr)}`,
      });
    }

    if (ad.adStrength && ["POOR", "AVERAGE"].includes(ad.adStrength.toUpperCase())) {
      pushRecommendation(recommendations, {
        category: "Ad Copy",
        title: "Ad strength needs improvement",
        entityName: `${ad.campaignName} / ${ad.adGroupName} / ad ${ad.adId}`,
        finding: `Ad strength is ${ad.adStrength}.`,
        recommendation:
          "Add more distinct CASCO headlines and descriptions covering price comparison, fast online quote, claim support, and trusted broker advice.",
        confidence: "Medium",
        impact: "Low",
        supportingMetric: `Ad strength ${ad.adStrength}`,
      });
    }
  }
}

function analyzeAdGroups(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const adGroup of snapshot.adGroups) {
    if (adGroup.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.7 && adGroup.conversions === 0) {
      pushRecommendation(recommendations, {
        category: "Campaign",
        title: "Weak ad group performance",
        entityName: `${adGroup.campaignName} / ${adGroup.adGroupName}`,
        finding: `${adGroup.adGroupName} spent ${money(adGroup.costRon)} with no conversions.`,
        recommendation:
          "Split out high-intent CASCO keywords, remove broad low-intent themes, and ensure each ad group has tightly matched ad copy.",
        confidence: "High",
        impact: "High",
        supportingMetric: `Spend ${money(adGroup.costRon)}, conversions 0`,
      });
    }
  }
}

function analyzeDevices(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const device of snapshot.devices) {
    if (
      device.costPerConversionRon !== null &&
      device.costPerConversionRon > config.targetCpaRon * 1.5 &&
      device.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.5
    ) {
      pushRecommendation(recommendations, {
        category: "Targeting",
        title: "Device CPA is inefficient",
        entityName: `${device.campaignName} / ${device.device}`,
        finding: `${device.device} traffic has ${money(device.costPerConversionRon)} CPA.`,
        recommendation:
          "Reduce device bid modifiers after manual review, and compare form completion quality on mobile versus desktop for the CASCO page.",
        confidence: "Medium",
        impact: "Medium",
        supportingMetric: `Device CPA ${money(device.costPerConversionRon)}`,
      });
    }
  }
}

function analyzeLocations(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const location of snapshot.locations) {
    if (location.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.5 && location.conversions === 0) {
      pushRecommendation(recommendations, {
        category: "Targeting",
        title: "Location spent without leads",
        entityName: `${location.campaignName} / ${location.location}`,
        finding: `${location.location} spent ${money(location.costRon)} without a conversion.`,
        recommendation:
          "Lower bids for this area or exclude it after checking whether the search intent is CASCO-related and whether lead quality is acceptable.",
        confidence: "Medium",
        impact: "Medium",
        supportingMetric: `Spend ${money(location.costRon)}, conversions 0`,
      });
    }
  }
}

function analyzeTimeSlots(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  for (const slot of snapshot.time) {
    if (slot.costRon >= config.maximumAllowedSpendWithoutConversionRon * 0.4 && slot.conversions === 0) {
      const hour = Number.isFinite(slot.hour) ? ` at ${slot.hour}:00` : "";
      pushRecommendation(recommendations, {
        category: "Targeting",
        title: "Inefficient day or hour",
        entityName: `${slot.campaignName} / ${slot.dayOfWeek}${hour}`,
        finding: `${slot.dayOfWeek}${hour} spent ${money(slot.costRon)} with no conversions.`,
        recommendation:
          "Apply an ad schedule bid reduction after manual review, especially if lead follow-up is unavailable during that time.",
        confidence: "Medium",
        impact: "Low",
        supportingMetric: `Spend ${money(slot.costRon)}, conversions 0`,
      });
    }
  }
}

function analyzeLandingPage(
  snapshot: GoogleAdsPerformanceSnapshot,
  config: GoogleAdsReportConfig,
  recommendations: Recommendation[],
) {
  const summary = sumMetrics(snapshot.campaigns);
  if (summary.clicks >= 50 && summary.ctr >= 0.05 && summary.conversionRate < 0.01) {
    pushRecommendation(recommendations, {
      category: "Landing Page",
      title: "Good CTR but weak conversion rate",
      entityName: config.landingPageUrl,
      finding: `CTR is ${percent(summary.ctr)}, but conversion rate is only ${percent(summary.conversionRate)}.`,
      recommendation:
        "Review the CASCO page message match, form friction, mobile speed, trust signals, phone/contact options, and whether the page clearly promises a fast online quote.",
      confidence: "Medium",
      impact: "High",
      supportingMetric: `CTR ${percent(summary.ctr)}, conversion rate ${percent(summary.conversionRate)}`,
    });
  }
}

export function analyzePerformance(
  data: {
    last7Days: GoogleAdsPerformanceSnapshot;
    previous7Days: GoogleAdsPerformanceSnapshot;
    monthToDate?: GoogleAdsPerformanceSnapshot;
  },
  config: GoogleAdsReportConfig,
): AnalysisResult {
  const recommendations: Recommendation[] = [];
  const previousSummary = sumMetrics(data.previous7Days.campaigns);
  const lastSummary = sumMetrics(data.last7Days.campaigns);

  analyzeCampaigns(data.last7Days, data.previous7Days, config, recommendations);
  analyzeKeywords(data.last7Days, config, recommendations);
  const negativeKeywordSuggestions = analyzeSearchTerms(data.last7Days, config, recommendations);
  analyzeAdGroups(data.last7Days, config, recommendations);
  analyzeAds(data.last7Days, recommendations);
  analyzeDevices(data.last7Days, config, recommendations);
  analyzeLocations(data.last7Days, config, recommendations);
  analyzeTimeSlots(data.last7Days, config, recommendations);
  analyzeLandingPage(data.last7Days, config, recommendations);

  const bestCampaigns = data.last7Days.campaigns
    .filter((campaign) => campaign.conversions > 0)
    .sort(sortByConversionsThenCpa)
    .slice(0, 5);

  const underperformingCampaigns = data.last7Days.campaigns
    .filter(
      (campaign) =>
        campaign.conversions === 0 ||
        (campaign.costPerConversionRon !== null && campaign.costPerConversionRon > config.targetCpaRon * 1.3),
    )
    .sort(sortByCostDescending)
    .slice(0, 5);

  return {
    accountSummary: {
      last7Days: lastSummary,
      previous7Days: previousSummary,
      monthToDate: data.monthToDate ? sumMetrics(data.monthToDate.campaigns) : undefined,
    },
    bestCampaigns,
    underperformingCampaigns,
    negativeKeywordSuggestions,
    recommendations: recommendations.sort((a, b) => {
      const impactWeight = { High: 3, Medium: 2, Low: 1 };
      return impactWeight[b.impact] - impactWeight[a.impact];
    }),
    conversionDropDetected: previousSummary.conversions >= 2 && lastSummary.conversions <= previousSummary.conversions * 0.5,
  };
}

export const analysisFormatters = {
  money,
  percent,
  sumMetrics,
};
