import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
for (const name of [".env.local", ".env"]) {
  const path = resolve(root, name);
  if (existsSync(path)) {
    config({ path });
    break;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local (see .env.example).`
    );
  }
  return value;
}

export function getInsuretechConfig() {
  const apiUrl = requireEnv("INSURETECH_API_URL").replace(/\/$/, "");
  const username = requireEnv("INSURETECH_USERNAME");
  const password = requireEnv("INSURETECH_PASSWORD");
  const apiKey = requireEnv("INSURETECH_API_KEY");
  const base = apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
  const auth = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  return {
    base,
    headers: {
      Authorization: auth,
      Api_key: apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
}

export async function insuretechCall(base, headers, method, path, body, label) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, raw: text, label, method, path };
}
