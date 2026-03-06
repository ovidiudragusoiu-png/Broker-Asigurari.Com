import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention) then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

// Prisma CLI needs https:// URL, runtime uses libsql://
const tursoUrl = process.env.TURSO_DATABASE_URL || "";
const httpUrl = tursoUrl.replace("libsql://", "https://");
const authToken = process.env.TURSO_AUTH_TOKEN || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: authToken ? `${httpUrl}?authToken=${authToken}` : httpUrl,
  },
});
