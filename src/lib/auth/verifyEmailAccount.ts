import { prisma } from "@/lib/db/prisma";
import { isVerificationExpired } from "@/lib/auth/verification";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";

export interface VerifyEmailResult {
  redirectTo: string;
  userId?: string;
  email?: string;
}

export async function verifyEmailAccount(
  token?: string | null
): Promise<VerifyEmailResult> {
  const trimmed = token?.trim();

  if (!trimmed) {
    return { redirectTo: runtimeAbsoluteUrl("/login?verify=missing") };
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: trimmed },
  });

  if (!user) {
    return { redirectTo: runtimeAbsoluteUrl("/login?verify=invalid") };
  }

  if (user.emailVerifiedAt) {
    return { redirectTo: runtimeAbsoluteUrl("/login?verify=already") };
  }

  if (isVerificationExpired(user.emailVerificationExpiresAt)) {
    return {
      redirectTo: runtimeAbsoluteUrl(
        `/register/check-email?email=${encodeURIComponent(user.email)}&verify=expired`
      ),
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return {
    redirectTo: runtimeAbsoluteUrl("/dashboard?verified=1"),
    userId: user.id,
    email: user.email,
  };
}
