import Anthropic from "@anthropic-ai/sdk";
import type {
  AiRecommendationResult,
  AnalysisResult,
  GoogleAdsReportConfig,
  Recommendation,
  WeeklyGoogleAdsData,
} from "./types";

function compactCampaigns(data: WeeklyGoogleAdsData) {
  return data.last7Days.campaigns.slice(0, 10).map((campaign) => ({
    name: campaign.name,
    status: campaign.status,
    cost: Number(campaign.cost.toFixed(2)),
    clicks: campaign.clicks,
    conversions: Number(campaign.conversions.toFixed(2)),
    costPerConversion: campaign.costPerConversion ? Number(campaign.costPerConversion.toFixed(2)) : null,
    lostImpressionShareBudget: campaign.lostImpressionShareBudget,
    lostImpressionShareRank: campaign.lostImpressionShareRank,
  }));
}

function compactSearchTerms(data: WeeklyGoogleAdsData) {
  return data.last7Days.searchTerms.slice(0, 20).map((term) => ({
    searchTerm: term.searchTerm,
    campaignName: term.campaignName,
    adGroupName: term.adGroupName,
    cost: Number(term.cost.toFixed(2)),
    clicks: term.clicks,
    conversions: Number(term.conversions.toFixed(2)),
  }));
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function normalizeRecommendation(config: GoogleAdsReportConfig, value: Partial<Recommendation>): Recommendation | null {
  if (!value.title || !value.finding || !value.recommendation) {
    return null;
  }

  return {
    category: value.category || "Campaign",
    title: value.title,
    finding: value.finding,
    recommendation: value.recommendation,
    confidence: value.confidence || "Medium",
    impact: value.impact || "Medium",
    relatedEntity: value.relatedEntity,
    metrics: value.metrics,
    safetyNote:
      value.safetyNote ||
      (config.automaticChangesAllowed
        ? "Automatic changes require a separate explicit approval workflow."
        : "Automatic changes are disabled. Review and approve before changing campaigns."),
  };
}

export async function generateAiRecommendations(
  config: GoogleAdsReportConfig,
  data: WeeklyGoogleAdsData,
  analysis: AnalysisResult,
): Promise<AiRecommendationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      enabled: false,
      recommendations: [],
      summary: "AI recommendations skipped because ANTHROPIC_API_KEY is not configured.",
    };
  }

  const model = process.env.GOOGLE_ADS_AI_MODEL || "claude-sonnet-4-5";
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system:
        "You are a Google Ads performance analyst for Romanian CASCO insurance lead generation. Write clear business language. Do not recommend automatic changes without manual approval.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            instructions:
              "Return JSON only with keys summary and recommendations. recommendations must be an array with category, title, finding, recommendation, confidence, impact, relatedEntity. Optimize for qualified CASCO leads in Romania, lower cost per lead, better search intent, and the landing page https://www.sigur.ai/casco.",
            safety: {
              automaticChangesAllowed: config.automaticChangesAllowed,
              requiredDefault:
                "Only report and recommend. Do not pause campaigns, change bids, change budgets, or add negatives automatically.",
            },
            config: {
              targetCpa: config.targetCpa,
              currencyCode: config.currencyCode,
              maximumAllowedSpendWithoutConversion: config.maximumAllowedSpendWithoutConversion,
              minimumConversionThreshold: config.minimumConversionThreshold,
              landingPage: config.cascoLandingPageUrl,
            },
            dateWindows: data.windows,
            campaigns: compactCampaigns(data),
            searchTerms: compactSearchTerms(data),
            deterministicFindings: analysis.priorityActions.slice(0, 10),
          }),
        },
      ],
    });

    const text = response.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n")
      .trim();
    const parsed = JSON.parse(extractJson(text)) as {
      summary?: string;
      recommendations?: Partial<Recommendation>[];
    };

    return {
      enabled: true,
      model,
      summary: parsed.summary,
      recommendations: (parsed.recommendations || [])
        .map((item) => normalizeRecommendation(config, item))
        .filter((item): item is Recommendation => Boolean(item))
        .slice(0, 8),
    };
  } catch (error) {
    return {
      enabled: true,
      model,
      recommendations: [],
      error: error instanceof Error ? error.message : String(error),
      summary: "AI recommendation generation failed; the report includes deterministic recommendations.",
    };
  }
}
