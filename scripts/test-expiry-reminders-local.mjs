/**
 * One-shot local test helper:
 * 1. Ensures CRON_SECRET hint
 * 2. Lists matching policies
 * 3. Runs dry-run against localhost
 *
 * Usage: node scripts/test-expiry-reminders-local.mjs
 */
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.CRON_SECRET) {
  console.log("Missing CRON_SECRET in .env.local. Add this line:\n");
  console.log("CRON_SECRET=local-dev-cron-secret\n");
  process.exit(1);
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

console.log("=== Step 1: Policies and reminder windows ===\n");
await run("node", ["scripts/send-expiry-reminders.mjs", "--list"]);

console.log("\n=== Step 2: Dry run (no emails sent) ===\n");
await run("node", ["scripts/send-expiry-reminders.mjs", "--dry-run"]);

console.log("\nDone. To simulate another date:");
console.log("  node scripts/send-expiry-reminders.mjs --list --as-of 2026-06-05");
console.log("  node scripts/send-expiry-reminders.mjs --dry-run --as-of 2026-06-05");
console.log("\nTo send real test emails (only matching policies):");
console.log("  node scripts/send-expiry-reminders.mjs --as-of YYYY-MM-DD");
