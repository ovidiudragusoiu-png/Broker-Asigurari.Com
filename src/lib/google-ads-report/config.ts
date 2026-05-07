import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AnthropicCredentials,
  GoogleAdsCredentials,
  ReportConfig,
  ReportThresholds,
} from "./types";

const defaultThresholds: ReportThresholds = {
  targetCpa: 120,
  minimumConversionThreshold: 1,
  maximumSpendWithoutConversion: 250,
  lowCtrThreshold: 0.03,
  poorConversionRateThreshold: 0.025,
  strongConversionRateThreshold: 0.07,
  minimumClicksForCtrReview: 100,
  minimumCostForSegmentationReview: 150,
};

export const defaultReportConfig: ReportConfig = {
  googleAdsCustomerId: "",
  campaignIds: [],
  email: {
    recipient: "",
    sender: "",
  },
  schedule: {
    dayOfWeek: "monday",
    time: "08:00",
    timezone: "Europe/Bucharest",
  },
  targetLandingPage: "https://www.sigur.ai/casco",
  businessContext: {
    country: "Romania",
    product: "CASCO insurance lead generation",
    goal: "Increase qualified lead volume, reduce cost per lead, improve conversion rate, and reduce wasted spend.",
  },
  thresholds: defaultThresholds,
  automaticChangesAllowed: false,
  attachCsv: true,
  aiRecommendationsEnabled: true,
};

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

export async function loadReportConfig(configPath = optionalEnv("GOOGLE_ADS_REPORT_CONFIG_PATH")): Promise<ReportConfig> {
  const absolutePath = path.resolve(process.cwd(), configPath || "config/google-ads-report.config.json");
  const rawConfig = await readFile(absolutePath, "utf8").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read Google Ads report config at ${absolutePath}: ${message}`);
  });

  const parsed = asRecord(JSON.parse(rawConfig) as unknown, "Google Ads report config");
  const email = asRecord(parsed.email ?? {}, "email");
  const schedule = asRecord(parsed.schedule ?? {}, "schedule");
  const businessContext = asRecord(parsed.businessContext ?? {}, "businessContext");
  const thresholds = asRecord(parsed.thresholds ?? {}, "thresholds");

  return validateReportConfig({
    googleAdsCustomerId: readString(parsed.googleAdsCustomerId, defaultReportConfig.googleAdsCustomerId),
    googleAdsLoginCustomerId: readOptionalString(parsed.googleAdsLoginCustomerId),
    campaignIds: readStringArray(parsed.campaignIds, defaultReportConfig.campaignIds),
    email: {
      recipient: readString(email.recipient, defaultReportConfig.email.recipient),
      sender: readString(email.sender, defaultReportConfig.email.sender),
    },
    schedule: {
      dayOfWeek: readString(schedule.dayOfWeek, defaultReportConfig.schedule.dayOfWeek),
      time: readString(schedule.time, defaultReportConfig.schedule.time),
      timezone: readString(schedule.timezone, defaultReportConfig.schedule.timezone),
    },
    targetLandingPage: readString(parsed.targetLandingPage, defaultReportConfig.targetLandingPage),
    businessContext: {
      country: readString(businessContext.country, defaultReportConfig.businessContext.country),
      product: readString(businessContext.product, defaultReportConfig.businessContext.product),
      goal: readString(businessContext.goal, defaultReportConfig.businessContext.goal),
    },
    thresholds: {
      targetCpa: readNumber(thresholds.targetCpa, defaultThresholds.targetCpa),
      minimumConversionThreshold: readNumber(
        thresholds.minimumConversionThreshold,
        defaultThresholds.minimumConversionThreshold,
      ),
      maximumSpendWithoutConversion: readNumber(
        thresholds.maximumSpendWithoutConversion,
        defaultThresholds.maximumSpendWithoutConversion,
      ),
      lowCtrThreshold: readNumber(thresholds.lowCtrThreshold, defaultThresholds.lowCtrThreshold),
      poorConversionRateThreshold: readNumber(
        thresholds.poorConversionRateThreshold,
        defaultThresholds.poorConversionRateThreshold,
      ),
      strongConversionRateThreshold: readNumber(
        thresholds.strongConversionRateThreshold,
        defaultThresholds.strongConversionRateThreshold,
      ),
      minimumClicksForCtrReview: readNumber(
        thresholds.minimumClicksForCtrReview,
        defaultThresholds.minimumClicksForCtrReview,
      ),
      minimumCostForSegmentationReview: readNumber(
        thresholds.minimumCostForSegmentationReview,
        defaultThresholds.minimumCostForSegmentationReview,
      ),
    },
    automaticChangesAllowed: readBoolean(
      parsed.automaticChangesAllowed,
      defaultReportConfig.automaticChangesAllowed,
    ),
    attachCsv: readBoolean(parsed.attachCsv, defaultReportConfig.attachCsv),
    aiRecommendationsEnabled: readBoolean(
      parsed.aiRecommendationsEnabled,
      defaultReportConfig.aiRecommendationsEnabled,
    ),
  });
}

export function loadGoogleAdsCredentials(): GoogleAdsCredentials {
  return {
    clientId: requiredEnv("GOOGLE_ADS_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_ADS_CLIENT_SECRET"),
    developerToken: requiredEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    refreshToken: requiredEnv("GOOGLE_ADS_REFRESH_TOKEN"),
  };
}

export function loadAnthropicCredentials(): AnthropicCredentials {
  return {
    apiKey: optionalEnv("ANTHROPIC_API_KEY"),
    model: optionalEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-5-20250929",
  };
}

function validateReportConfig(config: ReportConfig): ReportConfig {
  if (!config.googleAdsCustomerId) {
    throw new Error("googleAdsCustomerId is required in the Google Ads report config.");
  }

  if (!config.email.recipient || !config.email.sender) {
    throw new Error("Both email.recipient and email.sender are required in the Google Ads report config.");
  }

  if (!/^\d{2}:\d{2}$/.test(config.schedule.time)) {
    throw new Error("schedule.time must use HH:mm format, for example 08:00.");
  }

  if (!config.schedule.timezone) {
    throw new Error("schedule.timezone is required.");
  }

  if (config.automaticChangesAllowed) {
    throw new Error(
      "automaticChangesAllowed is set to true, but this automation only reports recommendations. Keep it false unless a separate approved change executor is implemented.",
    );
  }

  return config;
}
