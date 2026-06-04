import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/data/articles";
import { parseArticleDisplayDate } from "@/lib/seo/articleDates";
import { SITE_URL } from "@/lib/seo/site";

const BUILD_DATE = new Date();

type SitemapEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified?: Date;
};

const STATIC_PAGES: SitemapEntry[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/rca", changeFrequency: "weekly", priority: 0.9 },
  { path: "/travel", changeFrequency: "weekly", priority: 0.8 },
  { path: "/house", changeFrequency: "weekly", priority: 0.8 },
  { path: "/pad", changeFrequency: "weekly", priority: 0.8 },
  { path: "/malpraxis", changeFrequency: "weekly", priority: 0.8 },
  { path: "/casco", changeFrequency: "weekly", priority: 0.7 },
  { path: "/garantii", changeFrequency: "weekly", priority: 0.7 },
  { path: "/raspundere-profesionala", changeFrequency: "weekly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/despre-noi", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/termeni", changeFrequency: "yearly", priority: 0.3 },
  { path: "/confidentialitate", changeFrequency: "yearly", priority: 0.3 },
  { path: "/procedura-baar", changeFrequency: "yearly", priority: 0.3 },
];

function toSitemapUrl(entry: SitemapEntry): MetadataRoute.Sitemap[number] {
  const url = entry.path ? `${SITE_URL}${entry.path}` : SITE_URL;
  return {
    url,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    lastModified: entry.lastModified ?? BUILD_DATE,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticUrls = STATIC_PAGES.map(toSitemapUrl);

  const blogUrls: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
    lastModified: parseArticleDisplayDate(article.date) ?? BUILD_DATE,
  }));

  return [...staticUrls, ...blogUrls];
}
