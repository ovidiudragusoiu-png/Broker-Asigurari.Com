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
CREATE TABLE IF NOT EXISTS "ReminderSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "reminderDayOffsets" TEXT NOT NULL DEFAULT '30,7,1',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByEmail" TEXT
);
INSERT OR IGNORE INTO "ReminderSettings" ("id", "reminderDayOffsets")
VALUES ('default', '30,7,1');
`;

try {
  await client.executeMultiple(sql);
  console.log("Reminder settings migration complete.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("already exists")) {
    console.log("Migration already applied.");
  } else {
    console.error(message);
    process.exit(1);
  }
}
