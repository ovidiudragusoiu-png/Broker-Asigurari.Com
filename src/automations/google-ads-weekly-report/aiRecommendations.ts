import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";
import type { AiRecommendationResult, AnalysisResult, GoogleAdsReportConfig, GoogleAdsReportData } from "./types";

function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("your-") || key.includes("your_")) {
    return null;
  }
  return key;
}

function compactDataForPrompt(data: GoogleAdsReportData, analysis: AnalysisResult) {
  return {
    dateRange: data.dateRanges.last7Days,
    previousDateRange: data.dateRanges.previous7Days,
    summary: analysis.accountSummary,
    bestCampaigns: analysis.bestCampaigns.slice(0, 5),
    underperformingCampaigns: analysis.underperformingCampaigns.slice(0, 5),
    topSearchTerms: data.last7Days.searchTerms.slice(0, 20),
    topKeywords: data.last7Days.keywords.slice(0, 20),
    topAds: data.last7Days.ads.slice(0, 20),
    devices: data.last7Days.devices.slice(0, 20),
    locations: data.last7Days.locations.slice(0, 20),
    inefficientTimeSlots: data.last7Days.time.slice(0, 20),
    localRecommendations: analysis.recommendations.slice(0, 30),
  };
}

export async function generateAiRecommendations(
  data: GoogleAdsReportData,
  analysis: AnalysisResult,
  config: GoogleAdsReportConfig,
): Promise<AiRecommendationResult> {
  if (!config.ai.enabled) {
    return {
      narrative: "AI recommendation layer is disabled in the report configuration.",
      recommendations: [],
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY is not configured; continuing with local recommendations only");
    return {
      narrative:
        "AI recommendation layer could not run because ANTHROPIC_API_KEY is not configured. Local rule-based recommendations are included below.",
      recommendations: [],
    };
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || config.ai.model;
  const prompt = `
You are a Google Ads strategist for CASCO insurance lead generation in Romania.

Business goal:
- Increase qualified CASCO lead volume.
- Reduce cost per lead.
- Improve conversion rate.
- Find wasted spend and search-intent mismatches.

Landing page: ${config.landingPageUrl}
Target CPA: ${config.targetCpaRon} RON
Automatic changes allowed: ${config.automaticChangesAllowed ? "yes, but still require manual approval notes" : "no"}

Use clear business language. Do not suggest making automatic account changes. Every recommendation must include a confidence level: High, Medium, or Low.

Data:
${JSON.stringify(compactDataForPrompt(data, analysis), null, 2)}

Return:
1. A short executive interpretation.
2. The most important CASCO-specific opportunities.
3. Any wasted-spend risks.
4. Landing page or conversion tracking risks.
5. A priority action plan for the coming week.
`;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system:
        "You produce concise, practical Google Ads optimization recommendations for insurance lead generation. You never claim that changes were applied.",
      messages: [{ role: "user", content: prompt }],
    });

    const narrative = response.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("\n")
      .trim();

    return {
      narrative: narrative || "AI returned no additional narrative.",
      recommendations: [],
      usedModel: model,
    };
  } catch (error) {
    logger.warn("AI recommendation generation failed; continuing with local recommendations", error);
    return {
      narrative:
        "AI recommendation generation failed for this run. Local rule-based recommendations are included below.",
      recommendations: [],
      usedModel: model,
    };
  }
}
