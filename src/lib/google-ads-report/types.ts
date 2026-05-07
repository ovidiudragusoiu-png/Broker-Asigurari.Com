export type ConfidenceLevel = "High" | "Medium" | "Low";

export type RecommendationArea =
  | "Campaign"
  | "Keyword"
  | "Search term"
  | "Ad group"
  | "Ad"
  | "Device"
  | "Location"
  | "Schedule"
  | "Budget"
  | "Landing page"
  | "Conversion tracking";

export interface ReportThresholds {
  targetCpa: number;
  minimumConversionThreshold: number;
  maximumSpendWithoutConversion: number;
  lowCtrThreshold: number;
  poorConversionRateThreshold: number;
  strongConversionRateThreshold: number;
  minimumClicksForCtrReview: number;
  minimumCostForSegmentationReview: number;
}

export interface EmailConfig {
  recipient: string;
  sender: string;
}

export interface ScheduleConfig {
  dayOfWeek: string;
  time: string;
  timezone: string;
}

export interface ReportConfig {
  googleAdsCustomerId: string;
  googleAdsLoginCustomerId?: string;
  campaignIds: string[];
  email: EmailConfig;
  schedule: ScheduleConfig;
  targetLandingPage: string;
  businessContext: {
    country: string;
    product: string;
    goal: string;
  };
  thresholds: ReportThresholds;
  automaticChangesAllowed: boolean;
  attachCsv: boolean;
  aiRecommendationsEnabled: boolean;
}

export interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
}

export interface AnthropicCredentials {
  apiKey?: string;
  model: string;
}

export interface DateRange {
  label: string;
  startDate: string;
  endDate: string;
}

export interface DateRangeSet {
  current: DateRange;
  previous: DateRange;
  monthToDate?: DateRange;
}

export interface PerformanceMetrics {
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number | null;
  searchImpressionShare: number | null;
  lostImpressionShareBudget: number | null;
  lostImpressionShareRank: number | null;
}

export interface CampaignPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  budget: number | null;
}

export interface AdGroupPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adGroupStatus: string;
}

export interface KeywordPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  criterionId: string;
  keywordText: string;
  matchType: string;
  keywordStatus: string;
}

export interface SearchTermPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  searchTerm: string;
}

export interface AdPerformance extends PerformanceMetrics {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  adId: string;
  adStatus: string;
  adType: string;
  headlines: string[];
  descriptions: string[];
}

export interface DevicePerformance extends PerformanceMetrics {
  device: string;
}

export interface LocationPerformance extends PerformanceMetrics {
  locationName: string;
  locationType: string;
}

export interface TimePerformance extends PerformanceMetrics {
  dayOfWeek?: string;
  hour?: number;
  date?: string;
}

export interface PerformanceDataset {
  dateRange: DateRange;
  campaigns: CampaignPerformance[];
  adGroups: AdGroupPerformance[];
  keywords: KeywordPerformance[];
  searchTerms: SearchTermPerformance[];
  ads: AdPerformance[];
  devices: DevicePerformance[];
  locations: LocationPerformance[];
  days: TimePerformance[];
  hours: TimePerformance[];
}

export interface PerformanceComparison {
  current: PerformanceDataset;
  previous: PerformanceDataset;
  monthToDate?: PerformanceDataset;
}

export interface MetricDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
}

export interface Recommendation {
  id: string;
  area: RecommendationArea;
  entity: string;
  issue: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  automaticChangeAllowed: boolean;
}

export interface AnalysisResult {
  generatedAt: string;
  totals: {
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    monthToDate?: PerformanceMetrics;
  };
  weekOverWeek: {
    cost: MetricDelta;
    clicks: MetricDelta;
    conversions: MetricDelta;
    conversionRate: MetricDelta;
    costPerConversion: MetricDelta;
  };
  bestCampaigns: CampaignPerformance[];
  underperformingCampaigns: CampaignPerformance[];
  recommendations: Recommendation[];
  negativeKeywordSuggestions: Recommendation[];
  conversionTrackingNotes: Recommendation[];
}

export interface AiRecommendationResult {
  narrative: string;
  recommendations: Recommendation[];
  rawModelOutput?: string;
}

export interface WeeklyReportResult {
  subject: string;
  markdownReport: string;
  csvAttachment?: {
    filename: string;
    content: string;
  };
  analysis: AnalysisResult;
}
