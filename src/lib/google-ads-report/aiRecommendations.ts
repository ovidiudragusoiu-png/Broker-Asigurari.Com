import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";
import type {
  AiRecommendationResult,
  AnalysisResult,
  AnthropicCredentials,
  ConfidenceLevel,
  PerformanceComparison,
  Recommendation,
  RecommendationArea,
  ReportConfig,
} from "./types";

const recommendationAreas: RecommendationArea[] = [
  "Campaign",
  "Keyword",
  "Search term",
  "Ad group",
  "Ad",
  "Device",
  "Location",
  "Schedule",
  "Budget",
  "Landing page",
  "Conversion tracking",
];

const confidenceLevels: ConfidenceLevel[] = ["High", "Medium", "Low"];

function summarizeForModel(comparison: PerformanceComparison, analysis: AnalysisResult, config: ReportConfig): string {
  return JSON.stringify(
    {
      businessContext: config.businessContext,
      landingPage: config.targetLandingPage,
      thresholds: config.thresholds,
      safety: {
        automaticChangesAllowed: config.automaticChangesAllowed,
        instruction: "Report and recommend only. Do not suggest that this system already changed the Google Ads account.",
      },
      dateRanges: {
        current: comparison.current.dateRange,
        previous: comparison.previous.dateRange,
        monthToDate: comparison.monthToDate?.dateRange,
      },
      totals: analysis.totals,
      weekOverWeek: analysis.weekOverWeek,
      topCampaigns: comparison.current.campaigns.slice(0, 10),
      underperformingCampaigns: analysis.underperformingCampaigns,
      topSearchTermsByCost: comparison.current.searchTerms.slice(0, 40),
      topKeywordsByCost: comparison.current.keywords.slice(0, 40),
      devices: comparison.current.devices,
      locations: comparison.current.locations.slice(0, 40),
      days: comparison.current.days,
      hours: comparison.current.hours,
      deterministicRecommendations: analysis.recommendations.slice(0, 40),
    },
    null,
    2,
  );
}

function textFromResponseContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block) {
        return typeof block.text === "string" ? block.text : "";
      }

      return "";
    })
    .join("\n")
    .trim();
}

function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);

  if (!candidate.trim()) {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeRecommendations(raw: unknown, config: ReportConfig): Recommendation[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index): Recommendation | null => {
      if (!isRecord(item)) {
        return null;
      }

      const area = recommendationAreas.includes(item.area as RecommendationArea)
        ? (item.area as RecommendationArea)
        : "Campaign";
      const confidence = confidenceLevels.includes(item.confidence as ConfidenceLevel)
        ? (item.confidence as ConfidenceLevel)
        : "Low";
      const entity = typeof item.entity === "string" && item.entity.trim() ? item.entity.trim() : "Account";
      const issue = typeof item.issue === "string" && item.issue.trim() ? item.issue.trim() : "Opportunity found";
      const recommendationText =
        typeof item.recommendation === "string" && item.recommendation.trim()
          ? item.recommendation.trim()
          : "Review this area before making campaign changes.";
      const evidence = Array.isArray(item.evidence)
        ? item.evidence.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];

      return {
        id: `ai-${index + 1}-${area.toLowerCase().replace(/\s+/g, "-")}`,
        area,
        entity,
        issue,
        recommendation: recommendationText,
        confidence,
        evidence,
        automaticChangeAllowed: config.automaticChangesAllowed,
      };
    })
    .filter((item): item is Recommendation => item !== null);
}

export async function generateAiRecommendations(
  comparison: PerformanceComparison,
  analysis: AnalysisResult,
  config: ReportConfig,
  credentials: AnthropicCredentials,
): Promise<AiRecommendationResult> {
  if (!config.aiRecommendationsEnabled) {
    return {
      narrative: "AI recommendations are disabled. The report uses deterministic account checks only.",
      recommendations: [],
    };
  }

  if (!credentials.apiKey) {
    return {
      narrative: "AI recommendations were skipped because ANTHROPIC_API_KEY is not configured.",
      recommendations: [],
    };
  }

  const anthropic = new Anthropic({ apiKey: credentials.apiKey });
  const prompt = `
You are a senior Google Ads strategist for CASCO insurance lead generation in Romania.

Analyze the following Google Ads weekly data. Write clear business-language recommendations for the report recipient.
Focus on qualified CASCO leads, lower cost per lead, stronger search intent, and better traffic to ${config.targetLandingPage}.

Return only JSON with this shape:
{
  "narrative": "2-4 sentence executive interpretation",
  "recommendations": [
    {
      "area": "Campaign | Keyword | Search term | Ad group | Ad | Device | Location | Schedule | Budget | Landing page | Conversion tracking",
      "entity": "specific entity name",
      "issue": "specific issue",
      "recommendation": "specific action to consider",
      "confidence": "High | Medium | Low",
      "evidence": ["short metric proof"]
    }
  ]
}

Do not say that changes were applied. Automatic changes are disabled unless the config explicitly says otherwise.

DATA:
${summarizeForModel(comparison, analysis, config)}
`;

  try {
    const response = await anthropic.messages.create({
      model: credentials.model,
      max_tokens: 2200,
      temperature: 0.2,
      system:
        "You interpret Google Ads data and produce conservative recommendations. You never claim that account changes were executed.",
      messages: [{ role: "user", content: prompt }],
    });

    const rawModelOutput = textFromResponseContent(response.content);
    const parsed = extractJsonObject(rawModelOutput);

    if (!isRecord(parsed)) {
      return {
        narrative: rawModelOutput || "The AI model returned an empty response.",
        recommendations: [],
        rawModelOutput,
      };
    }

    return {
      narrative:
        typeof parsed.narrative === "string" && parsed.narrative.trim()
          ? parsed.narrative.trim()
          : "AI review completed.",
      recommendations: sanitizeRecommendations(parsed.recommendations, config),
      rawModelOutput,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("AI recommendation generation failed; report will continue without AI output.", { message });
    return {
      narrative: "AI recommendations could not be generated for this run. The report uses deterministic account checks.",
      recommendations: [],
    };
  }
}
