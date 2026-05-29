export type ConfidenceLevel = "High" | "Medium" | "Low";

export type ReportDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface GoogleAdsReportConfig {
  googleAdsCustomerId: string;
  campaignIds: string[];
  emailRecipient: string;
  senderEmail: string;
  reportDay: ReportDay;
  reportTime: string;
  timezone: string;
  targetCpa: number;
  minimumConversionThreshold: number;
  maximumAllowedSpendWithoutConversion: number;
  automaticChangesAllowed: boolean;
  cascoLandingPageUrl: string;
  currencyCode: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportDateWindows {
  generatedAt: string;
  timezone: string;
  last7Days: DateRange;
  previous7Days: DateRange;
  monthToDate?: DateRange;
}

export interface MetricRow {
  id?: string;
  name: string;
  status?: string;
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  budget?: number;
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number | null;
}

export interface CampaignPerformance extends MetricRow {
  id: string;
  name: string;
  status: string;
  searchImpressionShare: number | null;
  lostImpressionShareBudget: number | null;
  lostImpressionShareRank: number | null;
}

export interface SearchTermPerformance extends MetricRow {
  searchTerm: string;
  keywordText?: string;
  matchType?: string;
}

export interface KeywordPerformance extends MetricRow {
  keywordText: string;
  matchType?: string;
  qualityScore?: number | null;
}

export interface AdGroupPerformance extends MetricRow {
  id: string;
}

export interface AdPerformance extends MetricRow {
  adId: string;
  adType?: string;
  finalUrls: string[];
}

export interface SegmentPerformance extends MetricRow {
  segment: string;
}

export interface NegativeKeyword {
  scope: "campaign" | "ad_group";
  campaignId?: string;
  adGroupId?: string;
  text: string;
  matchType?: string;
}

export interface PerformanceDataset {
  dateRange: DateRange;
  campaigns: CampaignPerformance[];
  searchTerms: SearchTermPerformance[];
  keywords: KeywordPerformance[];
  adGroups: AdGroupPerformance[];
  ads: AdPerformance[];
  devices: SegmentPerformance[];
  locations: SegmentPerformance[];
  dayHours: SegmentPerformance[];
  existingNegativeKeywords: NegativeKeyword[];
}

export interface WeeklyGoogleAdsData {
  windows: ReportDateWindows;
  last7Days: PerformanceDataset;
  previous7Days: PerformanceDataset;
  monthToDate?: PerformanceDataset;
}

export type RecommendationCategory =
  | "Campaign"
  | "Ad group"
  | "Keyword"
  | "Search term"
  | "Budget"
  | "Bid/targeting"
  | "Ad copy"
  | "Landing page"
  | "Conversion tracking";

export interface Recommendation {
  category: RecommendationCategory;
  title: string;
  finding: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  impact: "High" | "Medium" | "Low";
  relatedEntity?: string;
  metrics?: Record<string, string | number | null>;
  safetyNote?: string;
}

export interface AnalysisResult {
  recommendations: Recommendation[];
  bestCampaigns: CampaignPerformance[];
  underperformingCampaigns: CampaignPerformance[];
  negativeKeywordSuggestions: Recommendation[];
  budgetRecommendations: Recommendation[];
  bidAndTargetingRecommendations: Recommendation[];
  adCopyRecommendations: Recommendation[];
  landingPageNotes: Recommendation[];
  conversionTrackingNotes: Recommendation[];
  priorityActions: Recommendation[];
}

export interface AiRecommendationResult {
  enabled: boolean;
  model?: string;
  summary?: string;
  recommendations: Recommendation[];
  error?: string;
}

export interface RenderedReport {
  subject: string;
  text: string;
  html: string;
  csv: string;
}
