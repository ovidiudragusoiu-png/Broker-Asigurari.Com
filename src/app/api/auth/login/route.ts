import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";

// In-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Dummy hash for timing-safe user-not-found path
const DUMMY_HASH =
  "$2a$12$LJ3m4ys3Lk0TSwHleDPquOsdOBGhr4PkNP/5MbalETFGjImCmalEa";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Rate limiting
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record) {
    if (now > record.resetAt) {
      loginAttempts.delete(ip);
    } else if (record.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Prea multe încercări. Vă rugăm așteptați 15 minute." },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii." },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    // Always verify password to prevent timing oracle
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_HASH
    );

    if (!user || !valid) {
      // Track failed attempt
      const entry = loginAttempts.get(ip);
      if (entry) {
        entry.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      }
      return NextResponse.json(
        { error: "Email sau parolă incorectă." },
        { status: 401 }
      );
    }

    const token = await signToken(user.id, user.email);
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Eroare internă. Vă rugăm încercați din nou." },
      { status: 500 }
    );
  }
}
