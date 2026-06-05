import { NextResponse } from "next/server";
import { verifyEmailAccount } from "@/lib/auth/verifyEmailAccount";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  try {
    const result = await verifyEmailAccount(token);

    if (result.userId && result.email) {
      const jwt = await signToken(result.userId, result.email);
      await setAuthCookie(jwt);
    }

    return NextResponse.redirect(result.redirectTo);
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.redirect(runtimeAbsoluteUrl("/login?verify=error"));
  }
}
