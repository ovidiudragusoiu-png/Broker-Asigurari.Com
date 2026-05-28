import { describe, expect, it } from "vitest";
import {
  buildGoogleNewsUrl,
  composeFacebookMessage,
  getConfig,
  parseRssItems,
  selectTopNews,
} from "./post-romanian-insurance-news.mjs";

describe("Romanian insurance news poster", () => {
  it("parses and ranks relevant RSS items", () => {
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss>
        <channel>
          <item>
            <title>ASF anunta schimbari importante pentru RCA - Google News</title>
            <link>https://news.example/rca</link>
            <pubDate>Thu, 28 May 2026 08:00:00 GMT</pubDate>
            <source url="https://source.example">Sursa RCA</source>
            <description>Piata asigurarilor auto are reguli noi pentru polite.</description>
          </item>
          <item>
            <title>Sport local fara legatura</title>
            <link>https://news.example/sport</link>
            <pubDate>Thu, 28 May 2026 08:30:00 GMT</pubDate>
            <source>Sport</source>
          </item>
        </channel>
      </rss>`;

    const items = parseRssItems(rss, "asigurari RCA Romania ASF");
    const topNews = selectTopNews(items, {
      now: new Date("2026-05-28T09:00:00Z"),
    });

    expect(topNews).toHaveLength(1);
    expect(topNews[0].title).toBe("ASF anunta schimbari importante pentru RCA");
    expect(topNews[0].source).toBe("Sursa RCA");
  });

  it("deduplicates titles and composes a daily post", () => {
    const news = [
      item("ASF schimba regulile RCA", "https://example.com/1", 10),
      item("ASF schimba regulile RCA - Google News", "https://example.com/duplicate", 9),
      item("Brokerii de asigurari raporteaza crestere", "https://example.com/2", 8),
      item("Piata CASCO are prime mai mari", "https://example.com/3", 7),
    ];

    const topNews = selectTopNews(news, {
      now: new Date("2026-05-28T09:00:00Z"),
    });
    const message = composeFacebookMessage(topNews, new Date("2026-05-28T09:00:00Z"));

    expect(topNews).toHaveLength(3);
    expect(message).toContain("Top 3 stiri din piata asigurarilor din Romania");
    expect(message).toContain("1. ASF schimba regulile RCA");
    expect(message).toContain("https://example.com/2");
    expect(message).not.toContain("duplicate");
  });

  it("supports dry-run configuration without Facebook credentials", () => {
    const config = getConfig({
      NEWS_DRY_RUN: "true",
      NEWS_LOOKBACK_HOURS: "24",
      NEWS_MAX_ITEMS_PER_QUERY: "5",
      NEWS_SEARCH_QUERIES: "rca|asigurari",
    });

    expect(config.dryRun).toBe(true);
    expect(config.lookbackHours).toBe(24);
    expect(config.maxItemsPerQuery).toBe(5);
    expect(config.queries).toEqual(["rca", "asigurari"]);
  });

  it("builds a Romanian Google News RSS URL", () => {
    const url = new URL(buildGoogleNewsUrl("asigurari RCA", 25));

    expect(url.hostname).toBe("news.google.com");
    expect(url.searchParams.get("q")).toBe("asigurari RCA when:2d");
    expect(url.searchParams.get("ceid")).toBe("RO:ro");
  });
});

function item(title, link, hoursAgo) {
  return {
    description: "Piata asigurarilor din Romania",
    link,
    publishedAt: new Date(Date.UTC(2026, 4, 28, 9 - hoursAgo)),
    query: "asigurari",
    source: "Test News",
    title,
  };
}
