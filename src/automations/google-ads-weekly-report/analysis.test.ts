import { analyzePerformance } from "./analysis";
import { getWeeklyReportDateRanges } from "./dates";
import type { GoogleAdsPerformanceSnapshot, GoogleAdsReportConfig, PerformanceMetrics } from "./types";

const baseConfig: GoogleAdsReportConfig = {
  googleAdsCustomerId: "1234567890",
  campaignIds: [],
  emailRecipient: "marketing@example.com",
  senderEmail: "reports@example.com",
  reportDay: "Monday",
  reportTime: "08:00",
  timezone: "Europe/Bucharest",
  targetCpaRon: 120,
  minimumConversionThreshold: 2,
  maximumAllowedSpendWithoutConversionRon: 250,
  automaticChangesAllowed: false,
  landingPageUrl: "https://www.sigur.ai/casco",
  currencyCode: "RON",
  ai: {
    enabled: true,
    model: "claude-sonnet-4-5",
  },
};

function metrics(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
  return {
    costRon: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    averageCpcRon: 0,
    conversions: 0,
    conversionRate: 0,
    costPerConversionRon: null,
    ...overrides,
  };
}

function snapshot(overrides: Partial<GoogleAdsPerformanceSnapshot> = {}): GoogleAdsPerformanceSnapshot {
  return {
    range: {
      label: "Last 7 days",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    },
    campaigns: [],
    keywords: [],
    searchTerms: [],
    adGroups: [],
    ads: [],
    devices: [],
    locations: [],
    time: [],
    ...overrides,
  };
}

describe("Google Ads weekly report date logic", () => {
  it("uses the last complete seven days for a Monday Bucharest run", () => {
    const ranges = getWeeklyReportDateRanges(new Date("2026-06-08T05:00:00.000Z"), "Europe/Bucharest");

    expect(ranges.last7Days).toMatchObject({
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    });
    expect(ranges.previous7Days).toMatchObject({
      startDate: "2026-05-25",
      endDate: "2026-05-31",
    });
    expect(ranges.monthToDate).toMatchObject({
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    });
  });
});

describe("Google Ads CASCO performance analysis", () => {
  it("recommends budget increases for profitable campaigns limited by budget", () => {
    const result = analyzePerformance(
      {
        last7Days: snapshot({
          campaigns: [
            {
              campaignId: "1",
              campaignName: "CASCO Search Exact",
              status: "ENABLED",
              budgetRon: 100,
              ...metrics({
                costRon: 450,
                clicks: 120,
                impressions: 3000,
                ctr: 0.04,
                averageCpcRon: 3.75,
                conversions: 5,
                conversionRate: 0.0417,
                costPerConversionRon: 90,
                lostImpressionShareBudget: 0.22,
                lostImpressionShareRank: 0.12,
              }),
            },
          ],
        }),
        previous7Days: snapshot(),
      },
      baseConfig,
    );

    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Budget",
          title: "Profitable campaign is limited by budget",
          confidence: "High",
        }),
      ]),
    );
  });

  it("suggests negatives for unrelated insurance search terms", () => {
    const result = analyzePerformance(
      {
        last7Days: snapshot({
          campaigns: [
            {
              campaignId: "1",
              campaignName: "CASCO Broad",
              status: "ENABLED",
              budgetRon: 100,
              ...metrics({ costRon: 300, clicks: 90, impressions: 2500, ctr: 0.036 }),
            },
          ],
          searchTerms: [
            {
              campaignId: "1",
              campaignName: "CASCO Broad",
              adGroupId: "10",
              adGroupName: "Insurance broad",
              searchTerm: "asigurare rca ieftina",
              status: "ADDED",
              ...metrics({ costRon: 80, clicks: 45, impressions: 900, ctr: 0.05 }),
            },
          ],
        }),
        previous7Days: snapshot(),
      },
      baseConfig,
    );

    expect(result.negativeKeywordSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityName: "asigurare rca ieftina",
          confidence: "High",
        }),
      ]),
    );
  });
});
