import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { GoogleAdsCredentials, GoogleAdsReportConfig } from "./types";

const DEFAULT_CONFIG_PATH = "config/google-ads-weekly-report.config.json";

function loadEnvironmentFiles() {
  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      loadDotenv({ path: filePath, override: false });
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim() || value.includes("your-") || value.includes("your_")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function readJsonFile<T>(filePath: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Could not read Google Ads report config at ${filePath}: ${message}`);
  }
}

function assertReportConfig(config: GoogleAdsReportConfig): GoogleAdsReportConfig {
  const requiredStringFields: Array<keyof GoogleAdsReportConfig> = [
    "googleAdsCustomerId",
    "emailRecipient",
    "senderEmail",
    "reportDay",
    "reportTime",
    "timezone",
    "landingPageUrl",
    "currencyCode",
  ];

  for (const field of requiredStringFields) {
    const value = config[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Invalid Google Ads report config: ${String(field)} is required`);
    }
  }

  if (!Array.isArray(config.campaignIds)) {
    throw new Error("Invalid Google Ads report config: campaignIds must be an array");
  }

  if (!Number.isFinite(config.targetCpaRon) || config.targetCpaRon <= 0) {
    throw new Error("Invalid Google Ads report config: targetCpaRon must be greater than zero");
  }

  if (!Number.isFinite(config.maximumAllowedSpendWithoutConversionRon)) {
    throw new Error("Invalid Google Ads report config: maximumAllowedSpendWithoutConversionRon must be numeric");
  }

  return {
    ...config,
    googleAdsCustomerId: normalizeCustomerId(config.googleAdsCustomerId),
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
      ? normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
      : config.loginCustomerId
        ? normalizeCustomerId(config.loginCustomerId)
        : undefined,
    campaignIds: config.campaignIds.map(String),
    automaticChangesAllowed: Boolean(config.automaticChangesAllowed),
  };
}

export function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "").trim();
}

export function loadGoogleAdsReportConfig(configPath = process.env.GOOGLE_ADS_REPORT_CONFIG_PATH): GoogleAdsReportConfig {
  loadEnvironmentFiles();
  const resolvedPath = path.resolve(process.cwd(), configPath || DEFAULT_CONFIG_PATH);
  return assertReportConfig(readJsonFile<GoogleAdsReportConfig>(resolvedPath));
}

export function loadGoogleAdsCredentials(): GoogleAdsCredentials {
  loadEnvironmentFiles();
  return {
    developerToken: requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
    clientId: requireEnv("GOOGLE_ADS_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_ADS_CLIENT_SECRET"),
    refreshToken: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
  };
}
