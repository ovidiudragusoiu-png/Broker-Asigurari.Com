import type { Customer } from "google-ads-api";
import { reportLogger } from "./logger";
import type {
  AdGroupPerformance,
  AdPerformance,
  CampaignPerformance,
  DateRange,
  GoogleAdsReportConfig,
  KeywordPerformance,
  MetricRow,
  NegativeKeyword,
  PerformanceDataset,
  SearchTermPerformance,
  SegmentPerformance,
} from "./types";

type GoogleAdsRow = Record<string, unknown>;

function getPath(row: GoogleAdsRow, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, row);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function micros(value: unknown): number {
  return toNumber(value) / 1_000_000;
}

function nullableMicros(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const amount = micros(value);
  return Number.isFinite(amount) ? amount : null;
}

function enumValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function campaignFilter(config: GoogleAdsReportConfig) {
  if (!config.campaignIds.length) {
    return "";
  }

  return `AND campaign.id IN (${config.campaignIds.map((id) => Number(id)).filter(Number.isFinite).join(",")})`;
}

function baseMetrics(row: GoogleAdsRow): Omit<MetricRow, "name"> {
  const clicks = toNumber(getPath(row, ["metrics.clicks"]));
  const conversions = toNumber(getPath(row, ["metrics.conversions"]));
  const conversionRateFromApi = toNumber(getPath(row, ["metrics.conversions_from_interactions_rate", "metrics.conversionsFromInteractionsRate"]));

  return {
    cost: micros(getPath(row, ["metrics.cost_micros", "metrics.costMicros"])),
    impressions: toNumber(getPath(row, ["metrics.impressions"])),
    clicks,
    ctr: toNumber(getPath(row, ["metrics.ctr"]), clicks > 0 ? clicks : 0),
    averageCpc: micros(getPath(row, ["metrics.average_cpc", "metrics.averageCpc"])),
    conversions,
    conversionRate: conversionRateFromApi || (clicks > 0 ? conversions / clicks : 0),
    costPerConversion: nullableMicros(getPath(row, ["metrics.cost_per_conversion", "metrics.costPerConversion"])),
  };
}

async function safeQuery<T>(
  customer: Customer,
  queryName: string,
  query: string,
  mapper: (row: GoogleAdsRow) => T,
): Promise<T[]> {
  try {
    reportLogger.info(`Fetching Google Ads ${queryName}`);
    const rows = await customer.query<GoogleAdsRow[]>(query);
    return rows.map(mapper);
  } catch (error) {
    reportLogger.warn(`Google Ads ${queryName} query failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function dateClause(range: DateRange) {
  return `segments.date BETWEEN '${range.start}' AND '${range.end}'`;
}

function campaignIdentity(row: GoogleAdsRow) {
  return {
    campaignId: String(getPath(row, ["campaign.id"]) || ""),
    campaignName: String(getPath(row, ["campaign.name"]) || "Unknown campaign"),
  };
}

function adGroupIdentity(row: GoogleAdsRow) {
  return {
    adGroupId: String(getPath(row, ["ad_group.id", "adGroup.id"]) || ""),
    adGroupName: String(getPath(row, ["ad_group.name", "adGroup.name"]) || "Unknown ad group"),
  };
}

export async function fetchPerformanceDataset(
  customer: Customer,
  config: GoogleAdsReportConfig,
  range: DateRange,
): Promise<PerformanceDataset> {
  const commonWhere = `${dateClause(range)} AND campaign.status != 'REMOVED' ${campaignFilter(config)}`;

  const campaigns = await safeQuery<CampaignPerformance>(
    customer,
    "campaign performance",
    `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share
      FROM campaign
      WHERE ${commonWhere}
      ORDER BY metrics.cost_micros DESC
    `,
    (row) => ({
      id: String(getPath(row, ["campaign.id"]) || ""),
      name: String(getPath(row, ["campaign.name"]) || "Unknown campaign"),
      status: enumValue(getPath(row, ["campaign.status"])) || "UNKNOWN",
      budget: micros(getPath(row, ["campaign_budget.amount_micros", "campaignBudget.amountMicros"])),
      ...baseMetrics(row),
      searchImpressionShare: toNumber(getPath(row, ["metrics.search_impression_share", "metrics.searchImpressionShare"]), NaN),
      lostImpressionShareBudget: toNumber(
        getPath(row, ["metrics.search_budget_lost_impression_share", "metrics.searchBudgetLostImpressionShare"]),
        NaN,
      ),
      lostImpressionShareRank: toNumber(
        getPath(row, ["metrics.search_rank_lost_impression_share", "metrics.searchRankLostImpressionShare"]),
        NaN,
      ),
    }),
  );

  const searchTerms = await safeQuery<SearchTermPerformance>(
    customer,
    "search terms",
    `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        search_term_view.search_term,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM search_term_view
      WHERE ${commonWhere}
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `,
    (row) => ({
      name: String(getPath(row, ["search_term_view.search_term", "searchTermView.searchTerm"]) || "Unknown search term"),
      searchTerm: String(getPath(row, ["search_term_view.search_term", "searchTermView.searchTerm"]) || ""),
      ...campaignIdentity(row),
      ...adGroupIdentity(row),
      ...baseMetrics(row),
    }),
  );

  const keywords = await safeQuery<KeywordPerformance>(
    customer,
    "keywords",
    `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.criterion_id,
        ad_group_criterion.status,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM keyword_view
      WHERE ${commonWhere}
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 250
    `,
    (row) => {
      const keywordText = String(getPath(row, ["ad_group_criterion.keyword.text", "adGroupCriterion.keyword.text"]) || "");
      return {
        id: String(getPath(row, ["ad_group_criterion.criterion_id", "adGroupCriterion.criterionId"]) || ""),
        name: keywordText || "Unknown keyword",
        keywordText,
        matchType: enumValue(getPath(row, ["ad_group_criterion.keyword.match_type", "adGroupCriterion.keyword.matchType"])),
        status: enumValue(getPath(row, ["ad_group_criterion.status", "adGroupCriterion.status"])),
        qualityScore: toNumber(
          getPath(row, ["ad_group_criterion.quality_info.quality_score", "adGroupCriterion.qualityInfo.qualityScore"]),
          NaN,
        ),
        ...campaignIdentity(row),
        ...adGroupIdentity(row),
        ...baseMetrics(row),
      };
    },
  );

  const adGroups = await safeQuery<AdGroupPerformance>(
    customer,
    "ad groups",
    `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group.status,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM ad_group
      WHERE ${commonWhere}
        AND ad_group.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 250
    `,
    (row) => ({
      id: String(getPath(row, ["ad_group.id", "adGroup.id"]) || ""),
      name: String(getPath(row, ["ad_group.name", "adGroup.name"]) || "Unknown ad group"),
      status: enumValue(getPath(row, ["ad_group.status", "adGroup.status"])),
      ...campaignIdentity(row),
      ...baseMetrics(row),
    }),
  );

  const ads = await safeQuery<AdPerformance>(
    customer,
    "ads",
    `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM ad_group_ad
      WHERE ${commonWhere}
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 250
    `,
    (row) => {
      const adId = String(getPath(row, ["ad_group_ad.ad.id", "adGroupAd.ad.id"]) || "");
      const finalUrls = getPath(row, ["ad_group_ad.ad.final_urls", "adGroupAd.ad.finalUrls"]);

      return {
        adId,
        name: `Ad ${adId}`,
        status: enumValue(getPath(row, ["ad_group_ad.status", "adGroupAd.status"])),
        adType: enumValue(getPath(row, ["ad_group_ad.ad.type", "adGroupAd.ad.type"])),
        finalUrls: Array.isArray(finalUrls) ? finalUrls.map(String) : [],
        ...campaignIdentity(row),
        ...adGroupIdentity(row),
        ...baseMetrics(row),
      };
    },
  );

  const devices = await safeQuery<SegmentPerformance>(
    customer,
    "device performance",
    `
      SELECT
        campaign.id,
        campaign.name,
        segments.device,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM campaign
      WHERE ${commonWhere}
      ORDER BY metrics.cost_micros DESC
    `,
    (row) => {
      const segment = enumValue(getPath(row, ["segments.device"])) || "Unknown device";
      return {
        name: segment,
        segment,
        ...campaignIdentity(row),
        ...baseMetrics(row),
      };
    },
  );

  const locations = await safeQuery<SegmentPerformance>(
    customer,
    "location performance",
    `
      SELECT
        campaign.id,
        campaign.name,
        user_location_view.country_criterion_id,
        user_location_view.targeting_location,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM user_location_view
      WHERE ${commonWhere}
      ORDER BY metrics.cost_micros DESC
      LIMIT 250
    `,
    (row) => {
      const locationId = String(
        getPath(row, ["user_location_view.country_criterion_id", "userLocationView.countryCriterionId"]) || "Unknown",
      );
      const targeting = enumValue(getPath(row, ["user_location_view.targeting_location", "userLocationView.targetingLocation"]));
      const segment = targeting ? `${locationId} (${targeting})` : locationId;

      return {
        name: segment,
        segment,
        ...campaignIdentity(row),
        ...baseMetrics(row),
      };
    },
  );

  const dayHours = await safeQuery<SegmentPerformance>(
    customer,
    "day and hour performance",
    `
      SELECT
        campaign.id,
        campaign.name,
        segments.day_of_week,
        segments.hour,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM campaign
      WHERE ${commonWhere}
      ORDER BY metrics.cost_micros DESC
      LIMIT 500
    `,
    (row) => {
      const day = enumValue(getPath(row, ["segments.day_of_week", "segments.dayOfWeek"])) || "Unknown day";
      const hour = String(getPath(row, ["segments.hour"]) ?? "Unknown hour");
      const segment = `${day} ${hour}:00`;

      return {
        name: segment,
        segment,
        ...campaignIdentity(row),
        ...baseMetrics(row),
      };
    },
  );

  const existingNegativeKeywords = await fetchExistingNegativeKeywords(customer, config);

  return {
    dateRange: range,
    campaigns,
    searchTerms,
    keywords,
    adGroups,
    ads,
    devices,
    locations,
    dayHours,
    existingNegativeKeywords,
  };
}

async function fetchExistingNegativeKeywords(customer: Customer, config: GoogleAdsReportConfig): Promise<NegativeKeyword[]> {
  const campaignNegatives = await safeQuery<NegativeKeyword>(
    customer,
    "campaign negative keywords",
    `
      SELECT
        campaign.id,
        campaign_criterion.keyword.text,
        campaign_criterion.keyword.match_type
      FROM campaign_criterion
      WHERE campaign_criterion.negative = TRUE
        AND campaign_criterion.type = 'KEYWORD'
        ${campaignFilter(config)}
      LIMIT 500
    `,
    (row) => ({
      scope: "campaign",
      campaignId: String(getPath(row, ["campaign.id"]) || ""),
      text: String(getPath(row, ["campaign_criterion.keyword.text", "campaignCriterion.keyword.text"]) || ""),
      matchType: enumValue(getPath(row, ["campaign_criterion.keyword.match_type", "campaignCriterion.keyword.matchType"])),
    }),
  );

  const adGroupNegatives = await safeQuery<NegativeKeyword>(
    customer,
    "ad group negative keywords",
    `
      SELECT
        campaign.id,
        ad_group.id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type
      FROM ad_group_criterion
      WHERE ad_group_criterion.negative = TRUE
        AND ad_group_criterion.type = 'KEYWORD'
        ${campaignFilter(config)}
      LIMIT 500
    `,
    (row) => ({
      scope: "ad_group",
      campaignId: String(getPath(row, ["campaign.id"]) || ""),
      adGroupId: String(getPath(row, ["ad_group.id", "adGroup.id"]) || ""),
      text: String(getPath(row, ["ad_group_criterion.keyword.text", "adGroupCriterion.keyword.text"]) || ""),
      matchType: enumValue(getPath(row, ["ad_group_criterion.keyword.match_type", "adGroupCriterion.keyword.matchType"])),
    }),
  );

  return [...campaignNegatives, ...adGroupNegatives].filter((negative) => negative.text);
}
