import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { FileSearch, ShieldCheck, Plane } from "lucide-react";
import { btn } from "@/lib/ui/tokens";
import DashboardStats from "@/components/portal/DashboardStats";
import DashboardPolicies from "@/components/portal/DashboardPolicies";
import LogoutButton from "@/components/portal/LogoutButton";
import {
  computeDashboardStats,
  toDashboardPolicy,
} from "@/lib/portal/policyUtils";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata = createPrivatePageMetadata(
  "Polițele mele | Sigur.Ai",
  "/dashboard",
  "Portal clienți Sigur.Ai — polițele tale."
);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const policies = await prisma.policy.findMany({
    where: {
      OR: [{ userId: user.id }, { email: user.email.toLowerCase().trim() }],
    },
    orderBy: { createdAt: "desc" },
  });

  const orphaned = policies.filter((p) => !p.userId);
  if (orphaned.length > 0) {
    await prisma.policy.updateMany({
      where: {
        id: { in: orphaned.map((p) => p.id) },
        userId: null,
      },
      data: { userId: user.id },
    });
  }

  const dashboardPolicies = policies.map(toDashboardPolicy);
  const stats = computeDashboardStats(dashboardPolicies);
  const displayName = user.firstName || user.email.split("@")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bună, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestionează și descarcă toate polițele tale de asigurare.
            </p>
          </div>
          <LogoutButton />
        </div>

        {policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563EB]/10">
              <FileSearch className="h-8 w-8 text-[#2563EB]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Nu ai nicio poliță încă
            </h2>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              După ce cumperi o asigurare, polițele tale vor apărea aici,
              organizate pe tip de produs.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/rca"
                className={`${btn.primary} inline-flex items-center gap-2`}
              >
                <ShieldCheck className="h-4 w-4" />
                Calculator RCA
              </Link>
              <Link
                href="/travel"
                className={`${btn.secondary} inline-flex items-center gap-2`}
              >
                <Plane className="h-4 w-4" />
                Asigurare călătorie
              </Link>
            </div>
          </div>
        ) : (
          <>
            <DashboardStats stats={stats} />
            <DashboardPolicies policies={dashboardPolicies} />
          </>
        )}
      </div>
    </div>
  );
}
