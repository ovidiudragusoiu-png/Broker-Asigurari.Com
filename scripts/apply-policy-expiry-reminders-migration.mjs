import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const sql = `
CREATE TABLE IF NOT EXISTS "PolicyExpiryReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyDbId" TEXT NOT NULL,
    "reminderDays" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyExpiryReminder_policyDbId_fkey" FOREIGN KEY ("policyDbId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PolicyExpiryReminder_policyDbId_reminderDays_channel_key" ON "PolicyExpiryReminder"("policyDbId", "reminderDays", "channel");
CREATE INDEX IF NOT EXISTS "PolicyExpiryReminder_sentAt_idx" ON "PolicyExpiryReminder"("sentAt");
CREATE INDEX IF NOT EXISTS "PolicyExpiryReminder_policyDbId_idx" ON "PolicyExpiryReminder"("policyDbId");
`;

try {
  await client.executeMultiple(sql);
  console.log("Policy expiry reminders migration complete.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("already exists")) {
    console.log("Migration already applied.");
  } else {
    console.error(message);
    process.exit(1);
  }
}
