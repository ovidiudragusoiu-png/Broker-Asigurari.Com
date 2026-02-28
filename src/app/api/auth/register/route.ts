import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";

// In-memory rate limiter
const registerAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
  const record = registerAttempts.get(ip);
  if (record) {
    if (now > record.resetAt) {
      registerAttempts.delete(ip);
    } else if (record.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Prea multe încercări. Vă rugăm așteptați 15 minute." },
        { status: 429 }
      );
    }
  }

  // Track attempt
  const entry = registerAttempts.get(ip);
  if (entry) {
    entry.count++;
  } else {
    registerAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă minim 8 caractere." },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Există deja un cont cu acest email." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    // Link any existing policies with this email
    await prisma.policy.updateMany({
      where: { email: emailLower, userId: null },
      data: { userId: user.id },
    });

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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Eroare internă. Vă rugăm încercați din nou." },
      { status: 500 }
    );
  }
}
