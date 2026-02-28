import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/login", "/register", "/payment/"],
    },
    sitemap: "https://broker-asigurari.com/sitemap.xml",
  };
}
