import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    // Guest visitors are expected — return 200 so the auth probe does not log console errors.
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: { ...user, isAdmin: isAdminEmail(user.email) },
  });
}
