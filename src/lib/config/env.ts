function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const insureTechEnv = {
  apiUrl: requireEnv("INSURETECH_API_URL"),
  username: requireEnv("INSURETECH_USERNAME"),
  password: requireEnv("INSURETECH_PASSWORD"),
  apiKey: requireEnv("INSURETECH_API_KEY"),
} as const;

export const appEnv = {
  requestTimeoutMs: Number(process.env.INSURETECH_REQUEST_TIMEOUT_MS || "60000"),
} as const;
