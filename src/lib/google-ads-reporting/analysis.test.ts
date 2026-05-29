import { describe, expect, it } from "vitest";
import { analyzePerformance } from "./analysis";
import type { GoogleAdsReportConfig, PerformanceDataset, WeeklyGoogleAdsData } from "./types";

const config: GoogleAdsReportConfig = {
  googleAdsCustomerId: "1234567890",
  campaignIds: [],
  emailRecipient: "marketing@example.com",
  senderEmail: "Reports <reports@example.com>",
  reportDay: "monday",
  reportTime: "08:00",
  timezone: "Europe/Bucharest",
  targetCpa: 150,
  minimumConversionThreshold: 2,
  maximumAllowedSpendWithoutConversion: 300,
  automaticChangesAllowed: false,
  cascoLandingPageUrl: "https://www.sigur.ai/casco",
  currencyCode: "RON",
};

function emptyDataset(): PerformanceDataset {
  return {
    dateRange: { start: "2026-05-25", end: "2026-05-31" },
    campaigns: [],
    searchTerms: [],
    keywords: [],
    adGroups: [],
    ads: [],
    devices: [],
    locations: [],
    dayHours: [],
    existingNegativeKeywords: [],
  };
}

describe("analyzePerformance", () => {
  it("flags wasted spend, budget opportunity, and CASCO negative keyword candidates", () => {
    const last7Days: PerformanceDataset = {
      ...emptyDataset(),
      campaigns: [
        {
          id: "1",
          name: "CASCO Search - Waste",
          status: "ENABLED",
          budget: 100,
          cost: 350,
          impressions: 1000,
          clicks: 80,
          ctr: 0.08,
          averageCpc: 4.38,
          conversions: 0,
          conversionRate: 0,
          costPerConversion: null,
          searchImpressionShare: 0.4,
          lostImpressionShareBudget: 0.05,
          lostImpressionShareRank: 0.35,
        },
        {
          id: "2",
          name: "CASCO Search - Profitable",
          status: "ENABLED",
          budget: 100,
          cost: 240,
          impressions: 1200,
          clicks: 100,
          ctr: 0.083,
          averageCpc: 2.4,
          conversions: 4,
          conversionRate: 0.04,
          costPerConversion: 60,
          searchImpressionShare: 0.45,
          lostImpressionShareBudget: 0.3,
          lostImpressionShareRank: 0.1,
        },
      ],
      searchTerms: [
        {
          name: "rca ieftin online",
          searchTerm: "rca ieftin online",
          campaignName: "CASCO Search - Waste",
          adGroupName: "CASCO",
          cost: 120,
          impressions: 400,
          clicks: 30,
          ctr: 0.075,
          averageCpc: 4,
          conversions: 0,
          conversionRate: 0,
          costPerConversion: null,
        },
      ],
    };
    const data: WeeklyGoogleAdsData = {
      windows: {
        generatedAt: "2026-06-01T05:00:00.000Z",
        timezone: "Europe/Bucharest",
        last7Days: { start: "2026-05-25", end: "2026-05-31" },
        previous7Days: { start: "2026-05-18", end: "2026-05-24" },
      },
      last7Days,
      previous7Days: {
        ...emptyDataset(),
        campaigns: [
          {
            ...last7Days.campaigns[1],
            conversions: 4,
          },
        ],
      },
    };

    const result = analyzePerformance(config, data);

    expect(result.underperformingCampaigns.map((campaign) => campaign.name)).toContain("CASCO Search - Waste");
    expect(result.budgetRecommendations.map((item) => item.relatedEntity)).toContain("CASCO Search - Profitable");
    expect(result.negativeKeywordSuggestions.map((item) => item.relatedEntity)).toContain("rca ieftin online");
    expect(result.recommendations.every((item) => item.safetyNote?.includes("Automatic changes are disabled"))).toBe(true);
  });
});
