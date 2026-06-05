import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  return NextResponse.json({
    user: { ...user, isAdmin: isAdminEmail(user.email) },
  });
}
