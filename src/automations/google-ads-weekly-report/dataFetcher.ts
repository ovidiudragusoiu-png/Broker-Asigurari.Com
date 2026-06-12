import type { Customer } from "google-ads-api";
import { logger } from "./logger";
import type {
  AdGroupPerformance,
  AdPerformance,
  CampaignPerformance,
  DateRange,
  DevicePerformance,
  GoogleAdsPerformanceSnapshot,
  GoogleAdsReportConfig,
  KeywordPerformance,
  LocationPerformance,
  PerformanceMetrics,
  SearchTermPerformance,
  TimePerformance,
} from "./types";

type GoogleAdsRow = Record<string, unknown>;

const METRIC_FIELDS = `
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.conversions,
  metrics.conversions_from_interactions_rate,
  metrics.cost_per_conversion
`;

const SEARCH_SHARE_FIELDS = `
  metrics.search_impression_share,
  metrics.search_budget_lost_impression_share,
  metrics.search_rank_lost_impression_share
`;

function getNestedValue(row: GoogleAdsRow, paths: string[]): unknown {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, row);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function microsToRon(value: unknown): number {
  return toNumber(value) / 1_000_000;
}

function parseMetrics(row: GoogleAdsRow, includeSearchShare = false): PerformanceMetrics {
  const metrics = getNestedValue(row, ["metrics"]) as GoogleAdsRow | undefined;
  const metricRow = metrics || row;
  const costRon = microsToRon(getNestedValue(metricRow, ["costMicros", "cost_micros", "metrics.cost_micros"]));
  const conversions = toNumber(
    getNestedValue(metricRow, ["conversions", "metrics.conversions"]),
  );

  const costPerConversionFromApi = getNestedValue(metricRow, [
    "costPerConversion",
    "cost_per_conversion",
    "metrics.cost_per_conversion",
  ]);

  const parsed: PerformanceMetrics = {
    costRon,
    impressions: toNumber(getNestedValue(metricRow, ["impressions", "metrics.impressions"])),
    clicks: toNumber(getNestedValue(metricRow, ["clicks", "metrics.clicks"])),
    ctr: toNumber(getNestedValue(metricRow, ["ctr", "metrics.ctr"])),
    averageCpcRon: microsToRon(getNestedValue(metricRow, ["averageCpc", "average_cpc", "metrics.average_cpc"])),
    conversions,
    conversionRate: toNumber(
      getNestedValue(metricRow, [
        "conversionsFromInteractionsRate",
        "conversions_from_interactions_rate",
        "metrics.conversions_from_interactions_rate",
      ]),
    ),
    costPerConversionRon:
      conversions > 0
        ? microsToRon(costPerConversionFromApi) || costRon / conversions
        : null,
  };

  if (includeSearchShare) {
    parsed.searchImpressionShare = toNumber(
      getNestedValue(metricRow, ["searchImpressionShare", "search_impression_share", "metrics.search_impression_share"]),
      NaN,
    );
    parsed.lostImpressionShareBudget = toNumber(
      getNestedValue(metricRow, [
        "searchBudgetLostImpressionShare",
        "search_budget_lost_impression_share",
        "metrics.search_budget_lost_impression_share",
      ]),
      NaN,
    );
    parsed.lostImpressionShareRank = toNumber(
      getNestedValue(metricRow, [
        "searchRankLostImpressionShare",
        "search_rank_lost_impression_share",
        "metrics.search_rank_lost_impression_share",
      ]),
      NaN,
    );

    if (Number.isNaN(parsed.searchImpressionShare)) parsed.searchImpressionShare = null;
    if (Number.isNaN(parsed.lostImpressionShareBudget)) parsed.lostImpressionShareBudget = null;
    if (Number.isNaN(parsed.lostImpressionShareRank)) parsed.lostImpressionShareRank = null;
  }

  return parsed;
}

function campaignFilter(config: GoogleAdsReportConfig): string {
  if (config.campaignIds.length === 0) {
    return "";
  }
  const ids = config.campaignIds.map((id) => id.replace(/\D/g, "")).filter(Boolean);
  return ids.length > 0 ? `AND campaign.id IN (${ids.join(", ")})` : "";
}

function dateFilter(range: DateRange): string {
  return `segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`;
}

async function requiredQuery(customer: Customer, name: string, query: string): Promise<GoogleAdsRow[]> {
  try {
    logger.info(`Fetching ${name}`);
    return await customer.query<GoogleAdsRow[]>(query);
  } catch (error) {
    logger.error(`Google Ads query failed for ${name}`, error);
    throw error;
  }
}

async function optionalQuery(customer: Customer, name: string, query: string): Promise<GoogleAdsRow[]> {
  try {
    logger.info(`Fetching ${name}`);
    return await customer.query<GoogleAdsRow[]>(query);
  } catch (error) {
    logger.warn(`Skipping ${name}; Google Ads returned an error`, error);
    return [];
  }
}

function mapCampaign(row: GoogleAdsRow): CampaignPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const budget = getNestedValue(row, ["campaignBudget", "campaign_budget"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    status: toStringValue(getNestedValue(campaign || row, ["status", "campaign.status"]), "UNKNOWN"),
    budgetRon: budget
      ? microsToRon(getNestedValue(budget, ["amountMicros", "amount_micros", "campaign_budget.amount_micros"]))
      : null,
    ...parseMetrics(row, true),
  };
}

function mapKeyword(row: GoogleAdsRow): KeywordPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const adGroup = getNestedValue(row, ["adGroup", "ad_group"]) as GoogleAdsRow | undefined;
  const criterion = getNestedValue(row, ["adGroupCriterion", "ad_group_criterion"]) as GoogleAdsRow | undefined;
  const keyword = getNestedValue(criterion || row, ["keyword", "ad_group_criterion.keyword"]) as GoogleAdsRow | undefined;
  const qualityInfo = getNestedValue(criterion || row, [
    "qualityInfo",
    "quality_info",
    "ad_group_criterion.quality_info",
  ]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    adGroupId: toStringValue(getNestedValue(adGroup || row, ["id", "ad_group.id"])),
    adGroupName: toStringValue(getNestedValue(adGroup || row, ["name", "ad_group.name"]), "Unknown ad group"),
    keywordId: toStringValue(getNestedValue(criterion || row, ["criterionId", "criterion_id"])),
    keywordText: toStringValue(getNestedValue(keyword || row, ["text", "ad_group_criterion.keyword.text"])),
    matchType: toStringValue(getNestedValue(keyword || row, ["matchType", "match_type"])),
    status: toStringValue(getNestedValue(criterion || row, ["status", "ad_group_criterion.status"]), "UNKNOWN"),
    qualityScore: qualityInfo
      ? toNumber(getNestedValue(qualityInfo, ["qualityScore", "quality_score"]), NaN)
      : null,
    ...parseMetrics(row),
  };
}

function mapSearchTerm(row: GoogleAdsRow): SearchTermPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const adGroup = getNestedValue(row, ["adGroup", "ad_group"]) as GoogleAdsRow | undefined;
  const searchTermView = getNestedValue(row, ["searchTermView", "search_term_view"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    adGroupId: toStringValue(getNestedValue(adGroup || row, ["id", "ad_group.id"])),
    adGroupName: toStringValue(getNestedValue(adGroup || row, ["name", "ad_group.name"]), "Unknown ad group"),
    searchTerm: toStringValue(getNestedValue(searchTermView || row, ["searchTerm", "search_term"])),
    status: toStringValue(getNestedValue(searchTermView || row, ["status"]), "UNKNOWN"),
    ...parseMetrics(row),
  };
}

function mapAdGroup(row: GoogleAdsRow): AdGroupPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const adGroup = getNestedValue(row, ["adGroup", "ad_group"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    adGroupId: toStringValue(getNestedValue(adGroup || row, ["id", "ad_group.id"])),
    adGroupName: toStringValue(getNestedValue(adGroup || row, ["name", "ad_group.name"]), "Unknown ad group"),
    status: toStringValue(getNestedValue(adGroup || row, ["status", "ad_group.status"]), "UNKNOWN"),
    ...parseMetrics(row),
  };
}

function mapAd(row: GoogleAdsRow): AdPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const adGroup = getNestedValue(row, ["adGroup", "ad_group"]) as GoogleAdsRow | undefined;
  const adGroupAd = getNestedValue(row, ["adGroupAd", "ad_group_ad"]) as GoogleAdsRow | undefined;
  const ad = getNestedValue(adGroupAd || row, ["ad", "ad_group_ad.ad"]) as GoogleAdsRow | undefined;
  const policy = getNestedValue(adGroupAd || row, ["policySummary", "policy_summary"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    adGroupId: toStringValue(getNestedValue(adGroup || row, ["id", "ad_group.id"])),
    adGroupName: toStringValue(getNestedValue(adGroup || row, ["name", "ad_group.name"]), "Unknown ad group"),
    adId: toStringValue(getNestedValue(ad || row, ["id", "ad_group_ad.ad.id"])),
    status: toStringValue(getNestedValue(adGroupAd || row, ["status", "ad_group_ad.status"]), "UNKNOWN"),
    adType: toStringValue(getNestedValue(ad || row, ["type", "ad_group_ad.ad.type"]), "UNKNOWN"),
    adStrength: toStringValue(getNestedValue(adGroupAd || row, ["adStrength", "ad_strength"])),
    approvalStatus: policy ? toStringValue(getNestedValue(policy, ["approvalStatus", "approval_status"])) : undefined,
    ...parseMetrics(row),
  };
}

function mapDevice(row: GoogleAdsRow): DevicePerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const segments = getNestedValue(row, ["segments"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    device: toStringValue(getNestedValue(segments || row, ["device", "segments.device"]), "UNKNOWN"),
    ...parseMetrics(row),
  };
}

function mapLocation(row: GoogleAdsRow): LocationPerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const geographicView = getNestedValue(row, ["geographicView", "geographic_view"]) as GoogleAdsRow | undefined;
  const segments = getNestedValue(row, ["segments"]) as GoogleAdsRow | undefined;
  const location =
    toStringValue(getNestedValue(segments || row, ["geoTargetCity", "geo_target_city"])) ||
    toStringValue(getNestedValue(segments || row, ["geoTargetRegion", "geo_target_region"])) ||
    toStringValue(getNestedValue(segments || row, ["geoTargetMostSpecificLocation", "geo_target_most_specific_location"])) ||
    "Unknown location";

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    location,
    locationType: toStringValue(getNestedValue(geographicView || row, ["locationType", "location_type"])),
    ...parseMetrics(row),
  };
}

function mapTime(row: GoogleAdsRow): TimePerformance {
  const campaign = getNestedValue(row, ["campaign"]) as GoogleAdsRow | undefined;
  const segments = getNestedValue(row, ["segments"]) as GoogleAdsRow | undefined;

  return {
    campaignId: toStringValue(getNestedValue(campaign || row, ["id", "campaign.id"])),
    campaignName: toStringValue(getNestedValue(campaign || row, ["name", "campaign.name"]), "Unknown campaign"),
    dayOfWeek: toStringValue(getNestedValue(segments || row, ["dayOfWeek", "day_of_week"]), "UNKNOWN"),
    hour: toNumber(getNestedValue(segments || row, ["hour", "segments.hour"]), NaN),
    ...parseMetrics(row),
  };
}

export async function fetchPerformanceSnapshot(
  customer: Customer,
  config: GoogleAdsReportConfig,
  range: DateRange,
): Promise<GoogleAdsPerformanceSnapshot> {
  const campaignIdFilter = campaignFilter(config);
  const whereDate = dateFilter(range);

  const campaigns = (
    await requiredQuery(
      customer,
      `campaigns (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign_budget.amount_micros,
          ${METRIC_FIELDS},
          ${SEARCH_SHARE_FIELDS}
        FROM campaign
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
      `,
    )
  ).map(mapCampaign);

  const [keywords, searchTerms, adGroups, ads, devices, locations, time] = await Promise.all([
    optionalQuery(
      customer,
      `keywords (${range.label})`,
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
          ad_group_criterion.quality_info.quality_score,
          ${METRIC_FIELDS}
        FROM keyword_view
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          AND ad_group_criterion.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `,
    ).then((rows) => rows.map(mapKeyword)),
    optionalQuery(
      customer,
      `search terms (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          search_term_view.search_term,
          search_term_view.status,
          ${METRIC_FIELDS}
        FROM search_term_view
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `,
    ).then((rows) => rows.map(mapSearchTerm)),
    optionalQuery(
      customer,
      `ad groups (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ${METRIC_FIELDS}
        FROM ad_group
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `,
    ).then((rows) => rows.map(mapAdGroup)),
    optionalQuery(
      customer,
      `ads (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_ad.ad.id,
          ad_group_ad.status,
          ad_group_ad.ad.type,
          ad_group_ad.ad_strength,
          ad_group_ad.policy_summary.approval_status,
          ${METRIC_FIELDS}
        FROM ad_group_ad
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          AND ad_group.status != 'REMOVED'
          AND ad_group_ad.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `,
    ).then((rows) => rows.map(mapAd)),
    optionalQuery(
      customer,
      `devices (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          segments.device,
          ${METRIC_FIELDS}
        FROM campaign
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
      `,
    ).then((rows) => rows.map(mapDevice)),
    optionalQuery(
      customer,
      `locations (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          geographic_view.location_type,
          segments.geo_target_region,
          segments.geo_target_city,
          segments.geo_target_most_specific_location,
          ${METRIC_FIELDS}
        FROM geographic_view
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `,
    ).then((rows) => rows.map(mapLocation)),
    optionalQuery(
      customer,
      `day and hour (${range.label})`,
      `
        SELECT
          campaign.id,
          campaign.name,
          segments.day_of_week,
          segments.hour,
          ${METRIC_FIELDS}
        FROM campaign
        WHERE ${whereDate}
          AND campaign.status != 'REMOVED'
          ${campaignIdFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 300
      `,
    ).then((rows) => rows.map(mapTime)),
  ]);

  return {
    range,
    campaigns,
    keywords,
    searchTerms,
    adGroups,
    ads,
    devices,
    locations,
    time,
  };
}
