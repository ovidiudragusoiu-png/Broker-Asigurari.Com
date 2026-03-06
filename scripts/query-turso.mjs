import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Show all tables
const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
);
console.log("=== Tables ===");
tables.rows.forEach((r) => console.log(" -", r.name));

// Show AuditLog entries
const audits = await client.execute(
  "SELECT id, action, productType, email, ipAddress, pdfHash, createdAt FROM AuditLog ORDER BY createdAt DESC LIMIT 20"
);
console.log(`\n=== AuditLog (${audits.rows.length} rows) ===`);
audits.rows.forEach((r) =>
  console.log(
    `  ${r.createdAt} | ${r.action} | ${r.productType || "-"} | ${r.email || "-"} | IP: ${r.ipAddress || "-"}`
  )
);

// Show Policies
const policies = await client.execute(
  "SELECT id, email, productType, policyNumber, vehiclePlate, ipAddress, createdAt FROM Policy ORDER BY createdAt DESC LIMIT 20"
);
console.log(`\n=== Policies (${policies.rows.length} rows) ===`);
policies.rows.forEach((r) =>
  console.log(
    `  ${r.createdAt} | ${r.productType} | ${r.policyNumber || "-"} | ${r.vehiclePlate || "-"} | ${r.email} | IP: ${r.ipAddress || "-"}`
  )
);

client.close();
