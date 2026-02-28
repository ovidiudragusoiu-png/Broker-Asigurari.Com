import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/data/articles";

const BASE_URL = "https://broker-asigurari.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/rca`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/travel`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/house`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/pad`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/malpraxis`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/casco`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/garantii`, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${BASE_URL}/raspundere-profesionala`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/despre-noi`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/termeni`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${BASE_URL}/confidentialitate`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
