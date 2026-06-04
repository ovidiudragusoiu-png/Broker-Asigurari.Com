import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

export type PageMetadataInput = {
  title: string;
  description?: string;
  path: string;
  openGraphType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
};

function buildOpenGraph(
  input: PageMetadataInput
): NonNullable<Metadata["openGraph"]> {
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description,
    type: input.openGraphType ?? "website",
    url,
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    ...(input.publishedTime && { publishedTime: input.publishedTime }),
    ...(input.modifiedTime && { modifiedTime: input.modifiedTime }),
  };
}

export function createPageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const robots = input.noIndex
    ? { index: false as const, follow: false as const }
    : { index: true as const, follow: true as const };

  return {
    title: input.title,
    description,
    alternates: { canonical: input.path },
    robots,
    openGraph: buildOpenGraph(input),
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
    },
  };
}

export function createPrivatePageMetadata(
  title: string,
  path: string,
  description?: string
): Metadata {
  return createPageMetadata({
    title,
    description: description ?? "Pagină privată Sigur.Ai.",
    path,
    noIndex: true,
  });
}

export function rootLayoutMetadata(): Metadata {
  const verificationToken = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Sigur.Ai — Fii sigur. Fii asigurat.",
      template: "%s",
    },
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url: SITE_URL,
      title: "Sigur.Ai — Fii sigur. Fii asigurat.",
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: "Sigur.Ai — Fii sigur. Fii asigurat.",
      description: DEFAULT_DESCRIPTION,
    },
    ...(verificationToken
      ? { verification: { google: verificationToken } }
      : {}),
  };
}
