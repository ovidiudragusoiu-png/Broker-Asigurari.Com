import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createVerificationToken,
  getVerificationExpiry,
} from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/email/verificationEmail";
import { validateBody, resendVerificationSchema } from "@/lib/validation/schemas";

const resendAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const record = resendAttempts.get(ip);

  if (record) {
    if (now > record.resetAt) {
      resendAttempts.delete(ip);
    } else if (record.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Prea multe încercări. Vă rugăm așteptați 15 minute." },
        { status: 429 }
      );
    }
  }

  try {
    const parsed = await validateBody(request, resendVerificationSchema);
    if ("error" in parsed) {
      return NextResponse.json(
        { error: "Email invalid." },
        { status: 400 }
      );
    }

    const emailLower = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user || user.emailVerifiedAt) {
      return NextResponse.json({
        message:
          "Dacă există un cont neconfirmat cu acest email, vei primi un nou link de confirmare.",
      });
    }

    const token = createVerificationToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: getVerificationExpiry(),
      },
    });

    await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token,
    });

    const entry = resendAttempts.get(ip);
    if (entry) {
      entry.count++;
    } else {
      resendAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }

    return NextResponse.json({
      message:
        "Dacă există un cont neconfirmat cu acest email, vei primi un nou link de confirmare.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Nu am putut trimite emailul de confirmare. Încearcă din nou." },
      { status: 500 }
    );
  }
}
