export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface GoogleAdsReportConfig {
  googleAdsCustomerId: string;
  loginCustomerId?: string;
  campaignIds: string[];
  emailRecipient: string;
  senderEmail: string;
  reportDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  reportTime: string;
  timezone: string;
  targetCpaRon: number;
  minimumConversionThreshold: number;
  maximumAllowedSpendWithoutConversionRon: number;
  automaticChangesAllowed: boolean;
  landingPageUrl: string;
  currencyCode: string;
  ai: {
    enabled: boolean;
    model: string;
  };
}

export interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface DateRange {
  label: string;
  startDate: string;
  endDate: string;
}

export interface ReportDateRanges {
  last7Days: DateRange;
  previous7Days: DateRange;
  monthToDate?: DateRange;
  generatedAt: string;
  timezone: string;
}

export interface PerformanceMetrics {
  costRon: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averageCpcRon: number;
  conversions: number;
  conversionRate: number;
  costPerConversionRon: number | null;
  searchImpressionShare?: number | null;
  lostImpressionShareBudget?: number | null;
  lostImpressionShareRank?: number | null;
}

export interface CampaignPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  status: string;
  budgetRon: number | null;
}

export interface KeywordPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keywordId: string;
  keywordText: string;
  matchType: string;
  status: string;
  qualityScore?: number | null;
}

export interface SearchTermPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  searchTerm: string;
  status?: string;
}

export interface AdGroupPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  status: string;
}

export interface AdPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adId: string;
  status: string;
  adType: string;
  adStrength?: string;
  approvalStatus?: string;
}

export interface DevicePerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  device: string;
}

export interface LocationPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  location: string;
  locationType?: string;
}

export interface TimePerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  dayOfWeek: string;
  hour?: number;
}

export interface GoogleAdsPerformanceSnapshot {
  range: DateRange;
  campaigns: CampaignPerformance[];
  keywords: KeywordPerformance[];
  searchTerms: SearchTermPerformance[];
  adGroups: AdGroupPerformance[];
  ads: AdPerformance[];
  devices: DevicePerformance[];
  locations: LocationPerformance[];
  time: TimePerformance[];
}

export interface GoogleAdsReportData {
  customerId: string;
  dateRanges: ReportDateRanges;
  last7Days: GoogleAdsPerformanceSnapshot;
  previous7Days: GoogleAdsPerformanceSnapshot;
  monthToDate?: GoogleAdsPerformanceSnapshot;
}

export interface Recommendation {
  category:
    | "Campaign"
    | "Keyword"
    | "Search Terms"
    | "Budget"
    | "Bids"
    | "Targeting"
    | "Ad Copy"
    | "Landing Page"
    | "Conversion Tracking";
  title: string;
  finding: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  impact: "High" | "Medium" | "Low";
  entityName?: string;
  supportingMetric?: string;
}

export interface AnalysisResult {
  accountSummary: {
    last7Days: PerformanceMetrics;
    previous7Days: PerformanceMetrics;
    monthToDate?: PerformanceMetrics;
  };
  bestCampaigns: CampaignPerformance[];
  underperformingCampaigns: CampaignPerformance[];
  negativeKeywordSuggestions: Recommendation[];
  recommendations: Recommendation[];
  conversionDropDetected: boolean;
}

export interface AiRecommendationResult {
  narrative: string;
  recommendations: Recommendation[];
  usedModel?: string;
}

export interface RenderedReport {
  subject: string;
  text: string;
  html: string;
  csv: string;
}
