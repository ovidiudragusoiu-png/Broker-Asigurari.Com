import { describe, expect, it } from "vitest";
import { analyzePerformance } from "./analysis";
import type {
  CampaignPerformance,
  DateRange,
  PerformanceComparison,
  PerformanceDataset,
  ReportConfig,
  SearchTermPerformance,
} from "./types";

const dateRange: DateRange = {
  label: "Last 7 days",
  startDate: "2026-04-27",
  endDate: "2026-05-03",
};

const config: ReportConfig = {
  googleAdsCustomerId: "1234567890",
  campaignIds: [],
  email: {
    recipient: "marketing@example.com",
    sender: "reports@example.com",
  },
  schedule: {
    dayOfWeek: "monday",
    time: "08:00",
    timezone: "Europe/Bucharest",
  },
  targetLandingPage: "https://www.sigur.ai/casco",
  businessContext: {
    country: "Romania",
    product: "CASCO insurance lead generation",
    goal: "Lower CPA and increase qualified leads.",
  },
  thresholds: {
    targetCpa: 120,
    minimumConversionThreshold: 1,
    maximumSpendWithoutConversion: 250,
    lowCtrThreshold: 0.03,
    poorConversionRateThreshold: 0.025,
    strongConversionRateThreshold: 0.07,
    minimumClicksForCtrReview: 100,
    minimumCostForSegmentationReview: 150,
  },
  automaticChangesAllowed: false,
  attachCsv: true,
  aiRecommendationsEnabled: false,
};

function campaign(overrides: Partial<CampaignPerformance>): CampaignPerformance {
  return {
    campaignId: "1",
    campaignName: "CASCO - Broad",
    campaignStatus: "ENABLED",
    budget: 100,
    cost: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    averageCpc: 0,
    conversions: 0,
    conversionRate: 0,
    costPerConversion: null,
    searchImpressionShare: null,
    lostImpressionShareBudget: null,
    lostImpressionShareRank: null,
    ...overrides,
  };
}

function searchTerm(overrides: Partial<SearchTermPerformance>): SearchTermPerformance {
  return {
    campaignId: "1",
    campaignName: "CASCO - Broad",
    adGroupId: "10",
    adGroupName: "CASCO broad",
    searchTerm: "rca ieftin online",
    cost: 80,
    impressions: 1000,
    clicks: 80,
    ctr: 0.08,
    averageCpc: 1,
    conversions: 0,
    conversionRate: 0,
    costPerConversion: null,
    searchImpressionShare: null,
    lostImpressionShareBudget: null,
    lostImpressionShareRank: null,
    ...overrides,
  };
}

function dataset(overrides: Partial<PerformanceDataset>): PerformanceDataset {
  return {
    dateRange,
    campaigns: [],
    adGroups: [],
    keywords: [],
    searchTerms: [],
    ads: [],
    devices: [],
    locations: [],
    days: [],
    hours: [],
    ...overrides,
  };
}

describe("analyzePerformance", () => {
  it("flags high-spend campaigns with no conversions", () => {
    const comparison: PerformanceComparison = {
      current: dataset({
        campaigns: [campaign({ cost: 300, clicks: 150, impressions: 3000 })],
      }),
      previous: dataset({
        campaigns: [campaign({ cost: 200, clicks: 120, impressions: 2600, conversions: 2, costPerConversion: 100 })],
      }),
    };

    const analysis = analyzePerformance(comparison, config);

    expect(analysis.recommendations.some((item) => item.id === "campaign-high-spend-no-conv-1")).toBe(true);
  });

  it("suggests irrelevant RCA search terms as negative keyword opportunities", () => {
    const comparison: PerformanceComparison = {
      current: dataset({
        campaigns: [campaign({ cost: 80, clicks: 80, impressions: 1000 })],
        searchTerms: [searchTerm({})],
      }),
      previous: dataset({ campaigns: [] }),
    };

    const analysis = analyzePerformance(comparison, config);

    expect(analysis.negativeKeywordSuggestions).toHaveLength(1);
    expect(analysis.negativeKeywordSuggestions[0].confidence).toBe("High");
  });
});
