import type { DashboardStats as Stats } from "@/lib/portal/policyUtils";

export default function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total polițe" value={stats.total} />
      <StatCard label="Active" value={stats.active} tone="emerald" />
      <StatCard label="Expiră curând" value={stats.expiring} tone="amber" />
      <StatCard label="Expirate" value={stats.expired} tone="red" />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "emerald" | "amber" | "red";
}) {
  const toneClasses = {
    blue: "text-gray-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
