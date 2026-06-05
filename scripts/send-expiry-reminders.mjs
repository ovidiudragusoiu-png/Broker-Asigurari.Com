/**
 * Manual runner for policy expiry reminders.
 *
 * Usage:
 *   node scripts/send-expiry-reminders.mjs --dry-run
 *   node scripts/send-expiry-reminders.mjs --dry-run --as-of 2026-06-05
 *   node scripts/send-expiry-reminders.mjs --as-of 2026-06-05
 *   node scripts/send-expiry-reminders.mjs --list
 */
import { config } from "dotenv";
import { createClient } from "@libsql/client";

config({ path: ".env.local" });
config({ path: ".env" });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const listOnly = args.includes("--list");
const asOfIndex = args.indexOf("--as-of");
const asOf = asOfIndex >= 0 ? args[asOfIndex + 1] : null;
const policyIndex = args.indexOf("--policy");
const policyNumber = policyIndex >= 0 ? args[policyIndex + 1] : null;

function daysUntil(endDate, today = new Date()) {
  const end = endDate?.trim()?.split("T")[0];
  if (!end) return null;
  const endMs = new Date(`${end}T12:00:00`).getTime();
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const todayMs = new Date(`${todayParts}T12:00:00`).getTime();
  return Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24));
}

if (listOnly) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("TURSO_DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const today = asOf ? new Date(`${asOf}T12:00:00`) : new Date();
  const result = await client.execute(
    `SELECT id, email, productType, policyNumber, endDate FROM Policy WHERE endDate IS NOT NULL ORDER BY endDate ASC LIMIT 50`
  );

  console.log(`Policies with endDate (as of ${asOf ?? "today"}):\n`);
  for (const row of result.rows) {
    const remaining = daysUntil(String(row.endDate), today);
    const windows = [30, 7, 1].filter((d) => remaining === d);
    const flag = windows.length ? `  <-- REMINDER: ${windows.join(", ")}d` : "";
    console.log(
      `${row.policyNumber || row.id} | ${row.productType} | ${row.endDate} | ${remaining ?? "?"} days left${flag}`
    );
  }
  process.exit(0);
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is not set in .env.local");
  console.error('Add: CRON_SECRET=local-dev-cron-secret');
  process.exit(1);
}

const query = new URLSearchParams();
if (dryRun) query.set("dryRun", "1");
if (asOf) query.set("asOf", asOf);
if (policyNumber) query.set("policy", policyNumber);

const url = `${baseUrl.replace(/\/$/, "")}/api/cron/policy-expiry-reminders?${query}`;

console.log(dryRun ? "DRY RUN — no emails/SMS sent" : "LIVE RUN — sending emails/SMS");
console.log(`GET ${url}\n`);

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));

if (!response.ok) {
  process.exit(1);
}
