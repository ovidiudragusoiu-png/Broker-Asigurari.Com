import { GoogleAdsApi, type Customer } from "google-ads-api";
import type { GoogleAdsCredentials, ReportConfig } from "./types";

function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "").trim();
}

export function createGoogleAdsCustomer(config: ReportConfig, credentials: GoogleAdsCredentials): Customer {
  const client = new GoogleAdsApi({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    developer_token: credentials.developerToken,
  });

  return client.Customer({
    customer_id: normalizeCustomerId(config.googleAdsCustomerId),
    login_customer_id: config.googleAdsLoginCustomerId
      ? normalizeCustomerId(config.googleAdsLoginCustomerId)
      : undefined,
    refresh_token: credentials.refreshToken,
  });
}
