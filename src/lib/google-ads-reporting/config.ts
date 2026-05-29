import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GoogleAdsReportConfig, ReportDay } from "./types";

const validDays: ReportDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const defaultConfig: Omit<GoogleAdsReportConfig, "googleAdsCustomerId" | "emailRecipient" | "senderEmail"> = {
  campaignIds: [],
  reportDay: "monday",
  reportTime: "08:00",
  timezone: "Europe/Bucharest",
  targetCpa: 150,
  minimumConversionThreshold: 2,
  maximumAllowedSpendWithoutConversion: 300,
  automaticChangesAllowed: false,
  cascoLandingPageUrl: "https://www.sigur.ai/casco",
  currencyCode: "RON",
};

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCampaignIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((id) => id.replaceAll("-", "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((id) => id.replaceAll("-", "").trim()).filter(Boolean);
  }

  return [];
}

function readJsonConfig(): Partial<GoogleAdsReportConfig> {
  const configuredPath = process.env.GOOGLE_ADS_REPORT_CONFIG_PATH || "config/google-ads-weekly-report.json";
  const absolutePath = resolve(process.cwd(), configuredPath);

  if (!existsSync(absolutePath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as Partial<GoogleAdsReportConfig>;
  } catch (error) {
    throw new Error(
      `Unable to read Google Ads report config at ${configuredPath}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required Google Ads report configuration value: ${name}`);
  }

  return value.trim();
}

export function loadGoogleAdsReportConfig(): GoogleAdsReportConfig {
  const fileConfig = readJsonConfig();
  const reportDay = String(fileConfig.reportDay || defaultConfig.reportDay).toLowerCase() as ReportDay;

  if (!validDays.includes(reportDay)) {
    throw new Error(`Invalid Google Ads report day "${reportDay}". Expected one of: ${validDays.join(", ")}`);
  }

  return {
    ...defaultConfig,
    googleAdsCustomerId: requireString(
      fileConfig.googleAdsCustomerId || process.env.GOOGLE_ADS_CUSTOMER_ID,
      "googleAdsCustomerId",
    ).replaceAll("-", ""),
    campaignIds: parseCampaignIds(fileConfig.campaignIds || process.env.GOOGLE_ADS_CAMPAIGN_IDS),
    emailRecipient: requireString(fileConfig.emailRecipient || process.env.GOOGLE_ADS_REPORT_EMAIL_TO, "emailRecipient"),
    senderEmail: requireString(fileConfig.senderEmail || process.env.GOOGLE_ADS_REPORT_EMAIL_FROM, "senderEmail"),
    reportDay,
    reportTime: String(fileConfig.reportTime || defaultConfig.reportTime),
    timezone: String(fileConfig.timezone || defaultConfig.timezone),
    targetCpa: parseNumber(fileConfig.targetCpa, defaultConfig.targetCpa),
    minimumConversionThreshold: parseNumber(
      fileConfig.minimumConversionThreshold,
      defaultConfig.minimumConversionThreshold,
    ),
    maximumAllowedSpendWithoutConversion: parseNumber(
      fileConfig.maximumAllowedSpendWithoutConversion,
      defaultConfig.maximumAllowedSpendWithoutConversion,
    ),
    automaticChangesAllowed: Boolean(fileConfig.automaticChangesAllowed),
    cascoLandingPageUrl: String(fileConfig.cascoLandingPageUrl || defaultConfig.cascoLandingPageUrl),
    currencyCode: String(fileConfig.currencyCode || defaultConfig.currencyCode),
  };
}

export function requireGoogleAdsEnv() {
  const names = [
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_REFRESH_TOKEN",
  ] as const;

  const values = Object.fromEntries(
    names.map((name) => {
      const value = process.env[name];
      if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
      }

      return [name, value.trim()];
    }),
  ) as Record<(typeof names)[number], string>;

  return {
    clientId: values.GOOGLE_ADS_CLIENT_ID,
    clientSecret: values.GOOGLE_ADS_CLIENT_SECRET,
    developerToken: values.GOOGLE_ADS_DEVELOPER_TOKEN,
    refreshToken: values.GOOGLE_ADS_REFRESH_TOKEN,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replaceAll("-", "").trim() || undefined,
  };
}
