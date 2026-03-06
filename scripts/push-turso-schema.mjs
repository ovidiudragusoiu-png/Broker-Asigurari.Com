import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,

  `CREATE TABLE IF NOT EXISTS "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "orderHash" TEXT NOT NULL,
    "offerId" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "productType" TEXT NOT NULL,
    "policyNumber" TEXT,
    "vendorName" TEXT,
    "premium" REAL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "startDate" TEXT,
    "endDate" TEXT,
    "vehicleVin" TEXT,
    "vehiclePlate" TEXT,
    "vehicleCategory" TEXT,
    "ownerCnpHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Policy_userId_idx" ON "Policy"("userId")`,
  `CREATE INDEX IF NOT EXISTS "Policy_email_idx" ON "Policy"("email")`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "productType" TEXT,
    "orderId" INTEGER,
    "orderHash" TEXT,
    "offerId" INTEGER,
    "policyId" INTEGER,
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "payload" TEXT,
    "pdfHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_orderHash_idx" ON "AuditLog"("orderHash")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_email_idx" ON "AuditLog"("email")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_policyId_idx" ON "AuditLog"("policyId")`,
];

console.log("Pushing schema to Turso...");

for (const sql of statements) {
  const name = sql.match(/"(\w+)"/)?.[1];
  try {
    await client.execute(sql);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// Verify tables
const result = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
);
console.log("\nTables in database:", result.rows.map((r) => r.name).join(", "));

client.close();
console.log("Done!");
