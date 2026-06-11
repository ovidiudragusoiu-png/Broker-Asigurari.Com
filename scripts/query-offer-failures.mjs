import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const limit = Number(process.argv[2] || 100);

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const rows = await client.execute({
  sql: `SELECT productType, payload, createdAt
        FROM AuditLog
        WHERE action = 'OFFER_FAILED'
        ORDER BY createdAt DESC
        LIMIT ?`,
  args: [limit],
});

const grouped = new Map();

for (const row of rows.rows) {
  let payload;
  try {
    payload = JSON.parse(String(row.payload || "{}"));
  } catch {
    continue;
  }

  const rawMessage = String(payload.rawMessage || "").trim();
  if (!rawMessage) continue;

  const key = [
    payload.productType || row.productType || "UNKNOWN",
    payload.vendorName || "Unknown vendor",
    rawMessage,
  ].join(" | ");

  const existing = grouped.get(key) || {
    count: 0,
    lastSeen: row.createdAt,
    productType: payload.productType || row.productType,
    vendorName: payload.vendorName,
    productName: payload.productName,
    productCode: payload.productCode,
    rawMessage,
    context: payload.context,
  };

  existing.count += 1;
  grouped.set(key, existing);
}

const sorted = [...grouped.values()].sort((a, b) => b.count - a.count);

console.log(`=== OFFER_FAILED patterns (${sorted.length} unique / ${rows.rows.length} rows scanned) ===\n`);
for (const item of sorted) {
  console.log(`[x${item.count}] ${item.productType} | ${item.vendorName || "-"} | ${item.productName || "-"}`);
  console.log(`  raw: ${item.rawMessage}`);
  if (item.context && Object.values(item.context).some(Boolean)) {
    console.log(`  ctx: ${JSON.stringify(item.context)}`);
  }
  console.log("");
}

client.close();
