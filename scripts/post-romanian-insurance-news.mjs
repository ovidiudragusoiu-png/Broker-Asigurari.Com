import process from "node:process";
import { config as loadDotenv } from "dotenv";
import { XMLParser } from "fast-xml-parser";

const DEFAULT_QUERIES = [
  '"piata asigurarilor" Romania',
  "asigurari RCA Romania ASF",
  "asiguratori brokeri asigurari Romania",
  "asigurari auto RCA CASCO Romania",
];

const KEYWORD_WEIGHTS = [
  ["piata asigurarilor", 8],
  ["asigurari", 6],
  ["asigurare", 5],
  ["asigurator", 5],
  ["asiguratori", 5],
  ["rca", 5],
  ["asf", 4],
  ["broker", 4],
  ["brokeri", 4],
  ["casco", 3],
  ["daune", 3],
  ["polite", 3],
  ["despagubiri", 3],
  ["prima", 2],
  ["prime", 2],
];

const INSURANCE_TERMS = [
  "asigur",
  "rca",
  "casco",
  "asf",
  "broker",
  "daune",
  "despagub",
  "polita",
  "polite",
];

const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";
const DEFAULT_GRAPH_VERSION = "v19.0";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

export function getConfig(env = process.env) {
  const dryRun = parseBoolean(env.NEWS_DRY_RUN);
  const pageId = getOptionalEnv(env, "FACEBOOK_PAGE_ID");
  const accessToken = getOptionalEnv(env, "FACEBOOK_PAGE_ACCESS_TOKEN");

  if (!dryRun) {
    requireValue(pageId, "FACEBOOK_PAGE_ID");
    requireValue(accessToken, "FACEBOOK_PAGE_ACCESS_TOKEN");
  }

  return {
    accessToken,
    dryRun,
    graphVersion: getOptionalEnv(env, "FACEBOOK_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION,
    lookbackHours: parsePositiveInteger(env.NEWS_LOOKBACK_HOURS, 48),
    maxItemsPerQuery: parsePositiveInteger(env.NEWS_MAX_ITEMS_PER_QUERY, 20),
    pageId,
    queries: parseQueries(env.NEWS_SEARCH_QUERIES),
    skipIfAlreadyPosted: env.FACEBOOK_SKIP_DUPLICATE_POST !== "false",
  };
}

export function buildGoogleNewsUrl(query, lookbackHours) {
  const url = new URL(GOOGLE_NEWS_RSS_URL);
  const lookbackDays = Math.max(1, Math.ceil(lookbackHours / 24));

  url.searchParams.set("q", `${query} when:${lookbackDays}d`);
  url.searchParams.set("hl", "ro");
  url.searchParams.set("gl", "RO");
  url.searchParams.set("ceid", "RO:ro");

  return url.toString();
}

export function parseRssItems(xml, query) {
  const parsed = xmlParser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.map((item) => {
    const source =
      typeof item.source === "object" ? item.source["#text"] || item.source.url : item.source;

    return {
      description: stripHtml(String(item.description || "")),
      link: String(item.link || item.guid?.["#text"] || item.guid || ""),
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      query,
      source: source ? String(source) : "Google News",
      title: stripGoogleNewsSuffix(String(item.title || "")),
    };
  });
}

export async function fetchNewsItems(config, fetchImpl = globalThis.fetch) {
  const results = await Promise.allSettled(
    config.queries.map(async (query) => {
      const response = await fetchImpl(buildGoogleNewsUrl(query, config.lookbackHours), {
        headers: {
          "User-Agent": "broker-asigurari-news-bot/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Google News RSS request failed for "${query}": ${response.status}`);
      }

      return parseRssItems(await response.text(), query).slice(0, config.maxItemsPerQuery);
    }),
  );
  const successfulResults = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      successfulResults.push(...result.value);
    } else {
      console.warn(result.reason);
    }
  }

  if (!successfulResults.length) {
    throw new Error("No Romanian insurance news items could be fetched.");
  }

  return successfulResults;
}

export function selectTopNews(items, { limit = 3, now = new Date(), lookbackHours = 48 } = {}) {
  const seen = new Map();

  for (const item of items) {
    if (!item.title || !item.link) {
      continue;
    }

    const searchableText = normalizeText(`${item.title} ${item.description}`);
    if (!INSURANCE_TERMS.some((term) => searchableText.includes(term))) {
      continue;
    }

    const key = normalizeTitle(item.title);
    const existing = seen.get(key);
    const candidate = {
      ...item,
      score: scoreItem(item, now, lookbackHours),
    };

    if (!existing || candidate.score > existing.score) {
      seen.set(key, candidate);
    }
  }

  return [...seen.values()]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return getTime(b.publishedAt) - getTime(a.publishedAt);
    })
    .slice(0, limit);
}

export function composeFacebookMessage(newsItems, now = new Date()) {
  const date = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Bucharest",
    year: "numeric",
  }).format(now);

  const lines = [
    `Top 3 stiri din piata asigurarilor din Romania - ${date}`,
    "",
    ...newsItems.flatMap((item, index) => [
      `${index + 1}. ${item.title}`,
      formatMetaLine(item),
      item.link,
      "",
    ]),
    "Urmareste pagina pentru cele mai importante noutati despre asigurari, RCA si piata locala.",
    "",
    "#Asigurari #RCA #BrokerAsigurari",
  ];

  return lines.join("\n").trim();
}

export async function alreadyPostedToday(config, message, now = new Date(), fetchImpl = globalThis.fetch) {
  if (!config.pageId || !config.accessToken || !config.skipIfAlreadyPosted) {
    return false;
  }

  const marker = firstLine(message);
  const since = new Date(now);
  since.setUTCHours(0, 0, 0, 0);

  const url = graphUrl(config, `${config.pageId}/posts`);
  url.searchParams.set("fields", "message,created_time");
  url.searchParams.set("limit", "10");
  url.searchParams.set("since", Math.floor(since.getTime() / 1000).toString());
  url.searchParams.set("access_token", config.accessToken);

  const response = await fetchImpl(url);
  const payload = await safeJson(response);

  if (!response.ok) {
    console.warn(`Could not check existing Facebook posts: ${formatGraphError(payload, response)}`);
    return false;
  }

  return Array.isArray(payload.data)
    ? payload.data.some((post) => typeof post.message === "string" && firstLine(post.message) === marker)
    : false;
}

export async function publishFacebookPost(config, message, fetchImpl = globalThis.fetch) {
  if (config.dryRun) {
    console.log(message);
    return { dryRun: true };
  }

  const body = new URLSearchParams({
    access_token: config.accessToken,
    message,
    published: "true",
  });

  const response = await fetchImpl(graphUrl(config, `${config.pageId}/feed`), {
    body,
    method: "POST",
  });
  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(`Facebook post failed: ${formatGraphError(payload, response)}`);
  }

  return payload;
}

export async function run(env = process.env, fetchImpl = globalThis.fetch) {
  loadDotenv({ path: ".env.local", quiet: true });
  loadDotenv({ path: ".env", quiet: true });

  const config = getConfig(env);
  const items = await fetchNewsItems(config, fetchImpl);
  const topNews = selectTopNews(items, {
    lookbackHours: config.lookbackHours,
    now: new Date(),
  });

  if (topNews.length < 3) {
    throw new Error(`Only found ${topNews.length} relevant Romanian insurance news item(s).`);
  }

  const message = composeFacebookMessage(topNews);

  if (await alreadyPostedToday(config, message, new Date(), fetchImpl)) {
    console.log("A matching Facebook news post already exists for today. Skipping.");
    return { skipped: true };
  }

  const result = await publishFacebookPost(config, message, fetchImpl);
  console.log(config.dryRun ? "Dry run completed." : `Facebook post published: ${result.id}`);
  return result;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function getOptionalEnv(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function requireValue(value, name) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseQueries(value) {
  if (!value || !value.trim()) {
    return DEFAULT_QUERIES;
  }

  const queries = value
    .split("|")
    .map((query) => query.trim())
    .filter(Boolean);

  return queries.length ? queries : DEFAULT_QUERIES;
}

function scoreItem(item, now, lookbackHours) {
  const searchableText = normalizeText(`${item.title} ${item.description} ${item.source}`);
  const keywordScore = KEYWORD_WEIGHTS.reduce(
    (score, [keyword, weight]) => score + (searchableText.includes(keyword) ? weight : 0),
    0,
  );
  const publishedTime = getTime(item.publishedAt);
  const ageHours = publishedTime ? Math.max(0, now.getTime() - publishedTime) / 36e5 : lookbackHours;
  const recencyScore = Math.max(0, lookbackHours - ageHours) / Math.max(1, lookbackHours / 6);

  return keywordScore + recencyScore;
}

function normalizeText(value) {
  return stripDiacritics(value).toLowerCase();
}

function normalizeTitle(value) {
  return normalizeText(stripGoogleNewsSuffix(value))
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(romania|romanian|stiri|news|google)\b/g, "")
    .trim();
}

function stripDiacritics(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[șş]/gi, (char) => (char === char.toUpperCase() ? "S" : "s"))
    .replace(/[țţ]/gi, (char) => (char === char.toUpperCase() ? "T" : "t"));
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stripGoogleNewsSuffix(value) {
  return value.replace(/\s+-\s+Google News$/i, "").trim();
}

function formatMetaLine(item) {
  const parts = [];

  if (item.source) {
    parts.push(`Sursa: ${item.source}`);
  }

  if (item.publishedAt && !Number.isNaN(item.publishedAt.getTime())) {
    parts.push(
      new Intl.DateTimeFormat("ro-RO", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Bucharest",
        year: "numeric",
      }).format(item.publishedAt),
    );
  }

  return parts.join(" | ");
}

function graphUrl(config, path) {
  return new URL(`https://graph.facebook.com/${config.graphVersion}/${path}`);
}

function firstLine(value) {
  return String(value).split("\n")[0].trim();
}

function getTime(value) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.getTime() : 0;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function formatGraphError(payload, response) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  return `${response.status} ${response.statusText}`.trim();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
