import Link from "next/link";
import {
  fetchAdminOverviewMetrics,
  fetchAllAdminPolicies,
} from "@/lib/admin/policyData";
import { computeDashboardStats } from "@/lib/portal/policyUtils";
import {
  fetchRecentReminderHistory,
  fetchUpcomingReminders,
} from "@/lib/admin/reminderData";
import { btn } from "@/lib/ui/tokens";
import {
  Users,
  FileText,
  Bell,
  AlertTriangle,
  Banknote,
  UserX,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const [policies, metrics, upcoming, recentFailures] = await Promise.all([
    fetchAllAdminPolicies(),
    fetchAdminOverviewMetrics(),
    fetchUpcomingReminders(),
    fetchRecentReminderHistory(100).then((rows) =>
      rows.filter((row) => !row.success).slice(0, 5)
    ),
  ]);

  const policyStats = computeDashboardStats(policies);

  const cards = [
    {
      label: "Total polițe",
      value: policyStats.total,
      href: "/admin/policies",
      tone: "text-gray-900",
    },
    {
      label: "Active",
      value: policyStats.active,
      href: "/admin/policies",
      tone: "text-emerald-700",
    },
    {
      label: "Expiră curând",
      value: policyStats.expiring,
      href: "/admin/policies",
      tone: "text-amber-700",
    },
    {
      label: "Expirate",
      value: policyStats.expired,
      href: "/admin/policies",
      tone: "text-red-700",
    },
  ];

  const secondaryCards = [
    {
      icon: Users,
      label: "Utilizatori",
      value: metrics.totalUsers,
      detail: `${metrics.verifiedUsers} verificați · ${metrics.unverifiedUsers} neverificați`,
    },
    {
      icon: UserX,
      label: "Polițe fără cont",
      value: metrics.orphanedPolicies,
      detail: "Nelegate de un cont utilizator",
    },
    {
      icon: Banknote,
      label: "Primă totală",
      value: `${metrics.totalPremiumRon.toFixed(0)} RON`,
      detail: "Suma primelor înregistrate",
    },
    {
      icon: Bell,
      label: "Reminder-e (30 zile)",
      value: metrics.remindersSentLast30Days,
      detail: `${metrics.failedRemindersLast30Days} eșuate`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Prezentare generală</h2>
        <p className="mt-1 text-sm text-gray-500">
          Statistici globale pentru toți utilizatorii și polițele.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm transition-shadow hover:shadow-md sm:px-5 sm:py-4"
          >
            <p className="text-xs text-gray-500 sm:text-sm">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${card.tone}`}>
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                <Icon className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-gray-400">{card.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {policyStats.byType.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-gray-900">
            Polițe pe tip de produs
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {policyStats.byType.map((item) => (
              <span
                key={item.productType}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
              >
                <span className="font-medium">{item.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-900">
                  {item.count}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Reminder-e programate azi
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {upcoming.length === 0
                ? "Niciun reminder programat pentru azi."
                : `${upcoming.length} trimiteri programate.`}
            </p>
          </div>
          <Link href="/admin/reminders" className={`${btn.secondary} text-sm`}>
            Gestionează reminder-e
          </Link>
        </div>
      </section>

      {recentFailures.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                Reminder-e eșuate recent
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {recentFailures.map((row) => (
                  <li key={row.id}>
                    <span className="font-medium text-gray-900">
                      {row.policyNumber ?? row.email}
                    </span>
                    {" — "}
                    {row.channel} · {row.reminderDays} zile:{" "}
                    {row.errorMessage ?? "Eroare necunoscută"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/policies" className={`${btn.primary} inline-flex items-center gap-2`}>
          <FileText className="h-4 w-4" />
          Vezi toate polițele
        </Link>
        <Link href="/admin/reminders" className={`${btn.secondary} inline-flex items-center gap-2`}>
          <Bell className="h-4 w-4" />
          Panou reminder-e
        </Link>
      </div>
    </div>
  );
}
