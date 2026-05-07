import type { Customer } from "google-ads-api";
import { logger } from "./logger";
import type {
  AdGroupPerformance,
  AdPerformance,
  CampaignPerformance,
  DateRange,
  DevicePerformance,
  KeywordPerformance,
  LocationPerformance,
  PerformanceDataset,
  PerformanceMetrics,
  ReportConfig,
  SearchTermPerformance,
  TimePerformance,
} from "./types";

type GoogleAdsRow = Record<string, unknown>;

const emptyMetrics: PerformanceMetrics = {
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nested(row: GoogleAdsRow, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), row);
}

function numberAt(row: GoogleAdsRow, path: string[], fallback = 0): number {
  const value = nested(row, path);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function stringAt(row: GoogleAdsRow, path: string[], fallback = ""): string {
  const value = nested(row, path);
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function microsToCurrency(value: number): number {
  return value / 1_000_000;
}

function nullableRatio(row: GoogleAdsRow, path: string[]): number | null {
  const value = nested(row, path);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metricsFrom(row: GoogleAdsRow): PerformanceMetrics {
  const conversions = numberAt(row, ["metrics", "conversions"]);
  const cost = microsToCurrency(numberAt(row, ["metrics", "cost_micros"]));
  const averageCpc = microsToCurrency(numberAt(row, ["metrics", "average_cpc"]));
  const costPerConversionMicros = numberAt(row, ["metrics", "cost_per_conversion"]);
  const costPerConversion =
    conversions > 0 && costPerConversionMicros > 0 ? microsToCurrency(costPerConversionMicros) : null;

  return {
    cost,
    impressions: numberAt(row, ["metrics", "impressions"]),
    clicks: numberAt(row, ["metrics", "clicks"]),
    ctr: numberAt(row, ["metrics", "ctr"]),
    averageCpc,
    conversions,
    conversionRate: numberAt(row, ["metrics", "conversions_from_interactions_rate"]),
    costPerConversion,
    searchImpressionShare: nullableRatio(row, ["metrics", "search_impression_share"]),
    lostImpressionShareBudget: nullableRatio(row, ["metrics", "search_budget_lost_impression_share"]),
    lostImpressionShareRank: nullableRatio(row, ["metrics", "search_rank_lost_impression_share"]),
  };
}

function campaignFilter(config: ReportConfig): string {
  if (!config.campaignIds.length) {
    return "";
  }

  const ids = config.campaignIds.map((id) => id.replace(/\D/g, "")).filter(Boolean);
  return ids.length ? ` AND campaign.id IN (${ids.join(", ")})` : "";
}

function dateFilter(range: DateRange): string {
  return `segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`;
}

async function queryRows(
  customer: Customer,
  query: string,
  label: string,
  required = false,
): Promise<GoogleAdsRow[]> {
  try {
    return await customer.query<GoogleAdsRow[]>(query);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const meta = { label, message };
    if (required) {
      logger.error("Required Google Ads query failed.", meta);
      throw error;
    }

    logger.warn("Optional Google Ads query failed; continuing with empty data.", meta);
    return [];
  }
}

function textAssets(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (isRecord(item) && typeof item.text === "string" ? item.text : undefined))
    .filter((item): item is string => Boolean(item));
}

function mapCampaign(row: GoogleAdsRow): CampaignPerformance {
  return {
    ...metricsFrom(row),
    campaignId: stringAt(row, ["campaign", "id"]),
    campaignName: stringAt(row, ["campaign", "name"], "Unnamed campaign"),
    campaignStatus: stringAt(row, ["campaign", "status"], "UNKNOWN"),
    budget: microsToCurrency(numberAt(row, ["campaign_budget", "amount_micros"])) || null,
  };
}

function mapAdGroup(row: GoogleAdsRow): AdGroupPerformance {
  return {
    ...metricsFrom(row),
    campaignId: stringAt(row, ["campaign", "id"]),
    campaignName: stringAt(row, ["campaign", "name"], "Unnamed campaign"),
    adGroupId: stringAt(row, ["ad_group", "id"]),
    adGroupName: stringAt(row, ["ad_group", "name"], "Unnamed ad group"),
    adGroupStatus: stringAt(row, ["ad_group", "status"], "UNKNOWN"),
  };
}

function mapKeyword(row: GoogleAdsRow): KeywordPerformance {
  return {
    ...metricsFrom(row),
    campaignId: stringAt(row, ["campaign", "id"]),
    campaignName: stringAt(row, ["campaign", "name"], "Unnamed campaign"),
    adGroupId: stringAt(row, ["ad_group", "id"]),
    adGroupName: stringAt(row, ["ad_group", "name"], "Unnamed ad group"),
    criterionId: stringAt(row, ["ad_group_criterion", "criterion_id"]),
    keywordText: stringAt(row, ["ad_group_criterion", "keyword", "text"], "Unknown keyword"),
    matchType: stringAt(row, ["ad_group_criterion", "keyword", "match_type"], "UNKNOWN"),
    keywordStatus: stringAt(row, ["ad_group_criterion", "status"], "UNKNOWN"),
  };
}

function mapSearchTerm(row: GoogleAdsRow): SearchTermPerformance {
  return {
    ...metricsFrom(row),
    campaignId: stringAt(row, ["campaign", "id"]),
    campaignName: stringAt(row, ["campaign", "name"], "Unnamed campaign"),
    adGroupId: stringAt(row, ["ad_group", "id"]),
    adGroupName: stringAt(row, ["ad_group", "name"], "Unnamed ad group"),
    searchTerm: stringAt(row, ["search_term_view", "search_term"], "Unknown search term"),
  };
}

function mapAd(row: GoogleAdsRow): AdPerformance {
  const ad = nested(row, ["ad_group_ad", "ad"]);
  const responsiveSearchAd = isRecord(ad) ? ad.responsive_search_ad : undefined;
  const expandedTextAd = isRecord(ad) ? ad.expanded_text_ad : undefined;

  return {
    ...metricsFrom(row),
    campaignId: stringAt(row, ["campaign", "id"]),
    campaignName: stringAt(row, ["campaign", "name"], "Unnamed campaign"),
    adGroupId: stringAt(row, ["ad_group", "id"]),
    adGroupName: stringAt(row, ["ad_group", "name"], "Unnamed ad group"),
    adId: stringAt(row, ["ad_group_ad", "ad", "id"]),
    adStatus: stringAt(row, ["ad_group_ad", "status"], "UNKNOWN"),
    adType: stringAt(row, ["ad_group_ad", "ad", "type"], "UNKNOWN"),
    headlines: [
      ...textAssets(isRecord(responsiveSearchAd) ? responsiveSearchAd.headlines : undefined),
      stringAt(row, ["ad_group_ad", "ad", "expanded_text_ad", "headline_part1"]),
      stringAt(row, ["ad_group_ad", "ad", "expanded_text_ad", "headline_part2"]),
      stringAt(row, ["ad_group_ad", "ad", "expanded_text_ad", "headline_part3"]),
    ].filter(Boolean),
    descriptions: [
      ...textAssets(isRecord(responsiveSearchAd) ? responsiveSearchAd.descriptions : undefined),
      stringAt(row, ["ad_group_ad", "ad", "expanded_text_ad", "description"]),
      stringAt(row, ["ad_group_ad", "ad", "expanded_text_ad", "description2"]),
    ].filter(Boolean),
  };
}

function mapDevice(row: GoogleAdsRow): DevicePerformance {
  return {
    ...metricsFrom(row),
    device: stringAt(row, ["segments", "device"], "UNKNOWN"),
  };
}

function mapLocation(row: GoogleAdsRow): LocationPerformance {
  const city = stringAt(row, ["segments", "geo_target_city"]);
  const region = stringAt(row, ["segments", "geo_target_region"]);
  const mostSpecific = stringAt(row, ["segments", "geo_target_most_specific_location"]);

  return {
    ...metricsFrom(row),
    locationName: mostSpecific || city || region || "Unknown location",
    locationType: stringAt(row, ["geographic_view", "location_type"], "UNKNOWN"),
  };
}

function mapDay(row: GoogleAdsRow): TimePerformance {
  return {
    ...metricsFrom(row),
    dayOfWeek: stringAt(row, ["segments", "day_of_week"], "UNKNOWN"),
  };
}

function mapHour(row: GoogleAdsRow): TimePerformance {
  return {
    ...metricsFrom(row),
    hour: numberAt(row, ["segments", "hour"]),
  };
}

export async function fetchPerformanceDataset(
  customer: Customer,
  config: ReportConfig,
  range: DateRange,
): Promise<PerformanceDataset> {
  const campaignClause = campaignFilter(config);
  const dateClause = dateFilter(range);

  const campaignRows = await queryRows(
    customer,
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
      WHERE ${dateClause}
        AND campaign.status != 'REMOVED'
        ${campaignClause}
      ORDER BY metrics.cost_micros DESC
    `,
    "campaign performance",
    true,
  );

  const [adGroupRows, keywordRows, searchTermRows, adRows, deviceRows, locationRows, dayRows, hourRows] =
    await Promise.all([
      queryRows(
        customer,
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
          WHERE ${dateClause}
            AND ad_group.status != 'REMOVED'
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
          LIMIT 500
        `,
        "ad group performance",
      ),
      queryRows(
        customer,
        `
          SELECT
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            ad_group_criterion.criterion_id,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.status,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_from_interactions_rate,
            metrics.cost_per_conversion
          FROM keyword_view
          WHERE ${dateClause}
            AND ad_group_criterion.status != 'REMOVED'
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
          LIMIT 500
        `,
        "keyword performance",
      ),
      queryRows(
        customer,
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
          WHERE ${dateClause}
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
          LIMIT 500
        `,
        "search term performance",
      ),
      queryRows(
        customer,
        `
          SELECT
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            ad_group_ad.ad.id,
            ad_group_ad.status,
            ad_group_ad.ad.type,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.ad.expanded_text_ad.headline_part1,
            ad_group_ad.ad.expanded_text_ad.headline_part2,
            ad_group_ad.ad.expanded_text_ad.headline_part3,
            ad_group_ad.ad.expanded_text_ad.description,
            ad_group_ad.ad.expanded_text_ad.description2,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_from_interactions_rate,
            metrics.cost_per_conversion
          FROM ad_group_ad
          WHERE ${dateClause}
            AND ad_group_ad.status != 'REMOVED'
            ${campaignClause}
          ORDER BY metrics.impressions DESC
          LIMIT 500
        `,
        "ad performance",
      ),
      queryRows(
        customer,
        `
          SELECT
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
          WHERE ${dateClause}
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
        `,
        "device performance",
      ),
      queryRows(
        customer,
        `
          SELECT
            geographic_view.location_type,
            segments.geo_target_region,
            segments.geo_target_city,
            segments.geo_target_most_specific_location,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_from_interactions_rate,
            metrics.cost_per_conversion
          FROM geographic_view
          WHERE ${dateClause}
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
          LIMIT 500
        `,
        "location performance",
      ),
      queryRows(
        customer,
        `
          SELECT
            segments.day_of_week,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_from_interactions_rate,
            metrics.cost_per_conversion
          FROM campaign
          WHERE ${dateClause}
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
        `,
        "day performance",
      ),
      queryRows(
        customer,
        `
          SELECT
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
          WHERE ${dateClause}
            ${campaignClause}
          ORDER BY metrics.cost_micros DESC
        `,
        "hour performance",
      ),
    ]);

  return {
    dateRange: range,
    campaigns: campaignRows.map(mapCampaign),
    adGroups: adGroupRows.map(mapAdGroup),
    keywords: keywordRows.map(mapKeyword),
    searchTerms: searchTermRows.map(mapSearchTerm),
    ads: adRows.map(mapAd),
    devices: deviceRows.map(mapDevice),
    locations: locationRows.map(mapLocation),
    days: dayRows.map(mapDay),
    hours: hourRows.map(mapHour),
  };
}

export function getEmptyMetrics(): PerformanceMetrics {
  return { ...emptyMetrics };
}
