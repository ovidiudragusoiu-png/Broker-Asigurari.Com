import { prisma } from "@/lib/db/prisma";
import {
  toDashboardPolicy,
  type DashboardPolicy,
} from "@/lib/portal/policyUtils";
import { getRemindersForPolicies } from "@/lib/reminders/processExpiryReminders";

export interface AdminPolicy extends DashboardPolicy {
  email: string;
  userId: string | null;
  clientName: string | null;
  orderId: number;
  orderHash: string;
}

export async function fetchAllAdminPolicies(): Promise<AdminPolicy[]> {
  const policies = await prisma.policy.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const reminderMap = await getRemindersForPolicies(policies.map((p) => p.id));

  return policies.map((policy) => {
    const clientName =
      policy.user?.firstName || policy.user?.lastName
        ? [policy.user.firstName, policy.user.lastName]
            .filter(Boolean)
            .join(" ")
        : null;

    return {
      ...toDashboardPolicy(policy),
      email: policy.email,
      userId: policy.userId,
      clientName,
      orderId: policy.orderId,
      orderHash: policy.orderHash,
      reminders: reminderMap[policy.id] ?? [],
    };
  });
}

export interface AdminOverviewMetrics {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  orphanedPolicies: number;
  totalPremiumRon: number;
  remindersSentLast30Days: number;
  failedRemindersLast30Days: number;
}

export async function fetchAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    verifiedUsers,
    orphanedPolicies,
    premiumAgg,
    remindersSentLast30Days,
    failedRemindersLast30Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.policy.count({ where: { userId: null } }),
    prisma.policy.aggregate({
      _sum: { premium: true },
      where: { premium: { not: null } },
    }),
    prisma.policyExpiryReminder.count({
      where: {
        success: true,
        sentAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.policyExpiryReminder.count({
      where: {
        success: false,
        sentAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return {
    totalUsers,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
    orphanedPolicies,
    totalPremiumRon: premiumAgg._sum.premium ?? 0,
    remindersSentLast30Days,
    failedRemindersLast30Days,
  };
}
