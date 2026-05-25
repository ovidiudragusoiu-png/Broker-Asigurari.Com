import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_MAX_AGE,
  getSitePreviewPassword,
  isSiteAccessPasswordValid,
  isSitePasswordGateEnabled,
  siteAccessCookieValue,
} from "@/lib/siteAccess";

const bodySchema = z.object({
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!isSitePasswordGateEnabled()) {
    return NextResponse.json({ error: "Accesul nu este restricționat." }, { status: 404 });
  }

  const expectedPassword = getSitePreviewPassword();
  if (!expectedPassword) {
    return NextResponse.json({ error: "Configurare invalidă." }, { status: 500 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Parolă invalidă." }, { status: 400 });
  }

  if (!isSiteAccessPasswordValid(parsed.password, expectedPassword)) {
    return NextResponse.json({ error: "Parolă incorectă." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SITE_ACCESS_COOKIE,
    await siteAccessCookieValue(expectedPassword),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SITE_ACCESS_COOKIE_MAX_AGE,
    }
  );

  return response;
}
