import { prisma } from "@/lib/db/prisma";

export type CheckoutSessionRecord = {
  token: string;
  orderId: number;
  offerId: number;
  orderHash: string;
  status: string;
  expiresAt: Date;
};

export async function findCheckoutSession(
  token: string
): Promise<CheckoutSessionRecord | null> {
  const session = await prisma.checkoutSession.findUnique({
    where: { token },
    select: {
      token: true,
      orderId: true,
      offerId: true,
      orderHash: true,
      status: true,
      expiresAt: true,
    },
  });
  return session;
}

export function isCheckoutSessionUsable(
  session: CheckoutSessionRecord,
  orderHash: string,
  offerId: number
): boolean {
  if (new Date() > session.expiresAt) return false;
  if (session.status === "expired") return false;
  if (session.orderHash !== orderHash || session.offerId !== offerId) return false;
  return session.status === "pending" || session.status === "completed";
}

export async function completeCheckoutSession(token: string): Promise<void> {
  await prisma.checkoutSession.updateMany({
    where: { token, status: { in: ["pending", "completed"] } },
    data: { status: "completed" },
  });
}
