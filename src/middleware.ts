import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_API_PATH,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_PATH,
  getSitePreviewPassword,
  hasValidSiteAccessCookie,
  isSitePasswordGateEnabled,
} from "@/lib/siteAccess";

const STATIC_PREFIXES = ["/_next/", "/images/", "/favicon.ico"];

function isStaticAsset(pathname: string): boolean {
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return /\.(ico|png|jpg|jpeg|svg|webp|woff2?)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  if (!isSitePasswordGateEnabled()) {
    return NextResponse.next();
  }

  const password = getSitePreviewPassword();
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === SITE_ACCESS_PATH || pathname === SITE_ACCESS_API_PATH) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  if (await hasValidSiteAccessCookie(cookieValue, password)) {
    return NextResponse.next();
  }

  const landing = request.nextUrl.clone();
  landing.pathname = SITE_ACCESS_PATH;
  landing.search = "";
  return NextResponse.redirect(landing);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
