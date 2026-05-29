import { requireGoogleAdsEnv } from "./config";
import type { GoogleAdsReportConfig } from "./types";

export interface GoogleAdsCustomer {
  query<T>(gaqlQuery: string): Promise<T>;
}

interface GoogleAdsSearchResponse {
  results?: Record<string, unknown>[];
  nextPageToken?: string;
}

async function fetchAccessToken(env: ReturnType<typeof requireGoogleAdsEnv>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google OAuth token refresh failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google OAuth token refresh response did not include an access token.");
  }

  return payload.access_token;
}

export function createGoogleAdsCustomer(config: GoogleAdsReportConfig): GoogleAdsCustomer {
  const env = requireGoogleAdsEnv();
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22";
  let accessToken: string | undefined;

  return {
    async query<T>(gaqlQuery: string): Promise<T> {
      accessToken ||= await fetchAccessToken(env);
      const rows: Record<string, unknown>[] = [];
      let pageToken: string | undefined;

      do {
        const response = await fetch(
          `https://googleads.googleapis.com/${apiVersion}/customers/${config.googleAdsCustomerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": env.developerToken,
              ...(env.loginCustomerId ? { "login-customer-id": env.loginCustomerId } : {}),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: gaqlQuery,
              pageSize: 10000,
              ...(pageToken ? { pageToken } : {}),
            }),
          },
        );

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Google Ads query failed (${response.status}): ${body}`);
        }

        const payload = (await response.json()) as GoogleAdsSearchResponse;
        rows.push(...(payload.results || []));
        pageToken = payload.nextPageToken;
      } while (pageToken);

      return rows as T;
    },
  };
}
