import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: SITE_NAME,
    legalName: "FLETHO LLC SRL",
    url: SITE_URL,
    logo: absoluteUrl("/images/logo.png"),
    telephone: "+40720385551",
    email: ["office@sigur.ai", "bucuresti@broker-asigurari.com"],
    address: {
      "@type": "PostalAddress",
      addressCountry: "RO",
      addressLocality: "București",
    },
    openingHours: "Mo-Fr 09:00-18:00",
    sameAs: [
      "https://www.facebook.com/brokerasigurariAi",
      "https://www.instagram.com/sigur.ai/",
      "https://ro.pinterest.com/wwwSigurAI/",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "ro-RO",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function insuranceServiceJsonLd(options: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    serviceType: options.name,
    provider: {
      "@type": "InsuranceAgency",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "Romania",
    },
  };
}

export function blogPostingJsonLd(options: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: options.title,
    description: options.description,
    url: absoluteUrl(options.path),
    datePublished: options.datePublished,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/logo.png"),
      },
    },
    inLanguage: "ro-RO",
  };
}
