import { GoogleAdsApi, type Customer } from "google-ads-api";
import type { GoogleAdsCredentials, GoogleAdsReportConfig } from "./types";

export function createGoogleAdsCustomer(config: GoogleAdsReportConfig, credentials: GoogleAdsCredentials): Customer {
  const client = new GoogleAdsApi({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    developer_token: credentials.developerToken,
  });

  return client.Customer({
    customer_id: config.googleAdsCustomerId,
    login_customer_id: config.loginCustomerId,
    refresh_token: credentials.refreshToken,
  });
}
