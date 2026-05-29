import { GoogleAdsApi } from "google-ads-api";
import { requireGoogleAdsEnv } from "./config";
import type { GoogleAdsReportConfig } from "./types";

export function createGoogleAdsCustomer(config: GoogleAdsReportConfig) {
  const env = requireGoogleAdsEnv();
  const client = new GoogleAdsApi({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    developer_token: env.developerToken,
  });

  return client.Customer({
    customer_id: config.googleAdsCustomerId,
    refresh_token: env.refreshToken,
    login_customer_id: env.loginCustomerId,
  });
}
