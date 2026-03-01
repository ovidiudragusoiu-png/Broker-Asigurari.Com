import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { FileSearch, ShieldCheck } from "lucide-react";
import { btn } from "@/lib/ui/tokens";
import PolicyCard from "@/components/portal/PolicyCard";
import LogoutButton from "@/components/portal/LogoutButton";

export const metadata = {
  title: "Polițele mele | Sigur.Ai",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const policies = await prisma.policy.findMany({
    where: {
      OR: [
        { userId: user.id },
        { email: user.email.toLowerCase().trim() },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Link any orphaned policies (userId null) to this user
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

  const displayName =
    user.firstName || user.email.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bună, {displayName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aici poți vedea și descărca toate polițele tale de asigurare.
          </p>
        </div>
        <LogoutButton />
      </div>

      {policies.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563EB]/10">
            <FileSearch className="h-8 w-8 text-[#2563EB]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Nu ai nicio poliță încă
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            După ce cumperi o asigurare, polițele tale vor apărea aici.
            Poți începe cu o asigurare RCA.
          </p>
          <Link href="/rca" className={`${btn.primary} mt-6 inline-flex items-center gap-2`}>
            <ShieldCheck className="h-4 w-4" />
            Calculator RCA
          </Link>
        </div>
      ) : (
        /* Policy grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={{
                id: policy.id,
                productType: policy.productType,
                policyNumber: policy.policyNumber,
                vendorName: policy.vendorName,
                premium: policy.premium,
                currency: policy.currency,
                startDate: policy.startDate,
                endDate: policy.endDate,
                createdAt: policy.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
