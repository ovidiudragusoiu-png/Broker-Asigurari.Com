import { getAuthToken, verifyToken } from "./jwt";
import { prisma } from "@/lib/db/prisma";
import type { AuthUser } from "@/types/auth";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });
    if (!user?.emailVerifiedAt) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch {
    return null;
  }
}
