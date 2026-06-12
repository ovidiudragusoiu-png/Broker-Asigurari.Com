import fs from "node:fs/promises";
import path from "node:path";
import type { Recommendation } from "./types";

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, context?: unknown) {
  const prefix = `[Google Ads Weekly Report] ${level.toUpperCase()} ${message}`;
  if (context === undefined) {
    console[level](prefix);
    return;
  }
  console[level](prefix, context);
}

export const logger = {
  info(message: string, context?: unknown) {
    write("info", message, context);
  },
  warn(message: string, context?: unknown) {
    write("warn", message, context);
  },
  error(message: string, context?: unknown) {
    write("error", message, context);
  },
};

export async function logRecommendations(recommendations: Recommendation[], generatedAt: string) {
  if (recommendations.length === 0) {
    return;
  }

  const logDir = path.resolve(process.cwd(), "logs");
  await fs.mkdir(logDir, { recursive: true });
  const fileName = `google-ads-recommendations-${new Date().toISOString().slice(0, 10)}.jsonl`;
  const lines = recommendations
    .map((recommendation) =>
      JSON.stringify({
        generatedAt,
        source: "weekly-google-ads-report",
        recommendation,
      }),
    )
    .join("\n");

  await fs.appendFile(path.join(logDir, fileName), `${lines}\n`, "utf8");
}
