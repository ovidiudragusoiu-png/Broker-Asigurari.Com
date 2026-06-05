import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  createVerificationToken,
  getVerificationExpiry,
} from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/email/verificationEmail";
import { validateBody, registerSchema } from "@/lib/validation/schemas";

const registerAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function issueVerification(user: {
  id: string;
  email: string;
  firstName: string | null;
}) {
  const token = createVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: getVerificationExpiry(),
      emailVerifiedAt: null,
    },
  });
  await sendVerificationEmail({
    email: user.email,
    firstName: user.firstName,
    token,
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

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

  const entry = registerAttempts.get(ip);
  if (entry) {
    entry.count++;
  } else {
    registerAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  try {
    const parsed = await validateBody(request, registerSchema);
    if ("error" in parsed) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii (minim 8 caractere)." },
        { status: 400 }
      );
    }
    const { email, password, firstName, lastName, phone } = parsed.data;

    const emailLower = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing?.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Există deja un cont cu acest email." },
        { status: 409 }
      );
    }

    if (existing && !existing.emailVerifiedAt) {
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          phone: phone?.trim() || null,
        },
      });

      await issueVerification(user);

      return NextResponse.json({
        needsVerification: true,
        email: user.email,
        message:
          "Contul există, dar nu este confirmat. Ți-am retrimis emailul de confirmare.",
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        phone: phone?.trim() || null,
        emailVerificationToken: createVerificationToken(),
        emailVerificationExpiresAt: getVerificationExpiry(),
      },
    });

    await prisma.policy.updateMany({
      where: { email: emailLower, userId: null },
      data: { userId: user.id },
    });

    if (user.emailVerificationToken) {
      await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: user.emailVerificationToken,
      });
    }

    return NextResponse.json({
      needsVerification: true,
      email: user.email,
      message:
        "Cont creat. Verifică emailul pentru a confirma adresa înainte de autentificare.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Eroare internă. Vă rugăm încercați din nou." },
      { status: 500 }
    );
  }
}
