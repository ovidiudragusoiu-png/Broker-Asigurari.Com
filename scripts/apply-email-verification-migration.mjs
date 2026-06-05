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

const statements = [
  'ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME',
  'ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT',
  'ALTER TABLE "User" ADD COLUMN "emailVerificationExpiresAt" DATETIME',
  'CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationToken_key" ON "User"("emailVerificationToken")',
  'UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL',
];

for (const sql of statements) {
  try {
    await client.execute(sql);
    console.log(`OK: ${sql}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("duplicate column") ||
      message.includes("already exists")
    ) {
      console.log(`SKIP (already applied): ${sql}`);
      continue;
    }
    console.error(`FAIL: ${sql}`);
    console.error(message);
    process.exit(1);
  }
}

console.log("Email verification migration complete.");
