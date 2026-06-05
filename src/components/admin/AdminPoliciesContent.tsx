"use client";

import { useMemo, useRef, useState } from "react";
import AdminPolicyCard from "@/components/admin/AdminPolicyCard";
import {
  computeDashboardStats,
  filterPoliciesByStatus,
  groupPoliciesByType,
  sortPolicies,
  type StatusFilter,
} from "@/lib/portal/policyUtils";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import type { AdminPolicy } from "@/lib/admin/policyData";
import { Search } from "lucide-react";

interface AdminPoliciesContentProps {
  policies: AdminPolicy[];
}

const STATUS_FILTERS: {
  id: StatusFilter;
  label: string;
  statKey: "total" | "active" | "expiring" | "expired";
  tone: "blue" | "emerald" | "amber" | "red";
}[] = [
  { id: "ALL", label: "Total polițe", statKey: "total", tone: "blue" },
  { id: "active", label: "Active", statKey: "active", tone: "emerald" },
  { id: "expiring", label: "Expiră curând", statKey: "expiring", tone: "amber" },
  { id: "expired", label: "Expirate", statKey: "expired", tone: "red" },
];

function matchesSearch(policy: AdminPolicy, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const fields = [
    policy.policyNumber,
    policy.email,
    policy.clientName,
    policy.vendorName,
    policy.vehiclePlate,
    policy.vehicleVin,
    policy.productType,
  ];
  return fields.some((field) => field?.toLowerCase().includes(q));
}

export default function AdminPoliciesContent({
  policies,
}: AdminPoliciesContentProps) {
  const policiesRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => computeDashboardStats(policies), [policies]);

  const searchFiltered = useMemo(
    () => policies.filter((policy) => matchesSearch(policy, search)),
    [policies, search]
  );

  const statusFiltered = useMemo(
    () => filterPoliciesByStatus(searchFiltered, statusFilter),
    [searchFiltered, statusFilter]
  );

  const groups = useMemo(
    () => groupPoliciesByType(statusFiltered),
    [statusFiltered]
  );

  const typeFilters = useMemo(
    () => [
      { id: "ALL", label: "Toate", count: statusFiltered.length },
      ...groups.map((group) => ({
        id: group.productType,
        label: group.label,
        count: group.policies.length,
      })),
    ],
    [groups, statusFiltered.length]
  );

  const visibleGroups =
    typeFilter === "ALL"
      ? groups
      : groups.filter((group) => group.productType === typeFilter);

  const filteredPolicies = useMemo(() => {
    const byType =
      typeFilter === "ALL"
        ? statusFiltered
        : statusFiltered.filter(
            (policy) => policy.productType.toUpperCase() === typeFilter
          );
    return sortPolicies(byType) as AdminPolicy[];
  }, [statusFiltered, typeFilter]);

  const handleStatusClick = (filter: StatusFilter, count: number) => {
    if (count === 0) return;
    setStatusFilter((current) => (current === filter ? "ALL" : filter));
    setTypeFilter("ALL");
    policiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toneClasses = {
    blue: "text-gray-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };

  const showGrouped =
    statusFilter === "ALL" && typeFilter === "ALL" && !search.trim();

  return (
    <>
      <div className="mb-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după număr poliță, email, nume, nr. înmatriculare..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </label>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STATUS_FILTERS.map((item) => {
          const value = stats[item.statKey];
          const isActive = statusFilter === item.id;
          const isDisabled = value === 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleStatusClick(item.id, value)}
              disabled={isDisabled}
              aria-pressed={isActive}
              className={`rounded-2xl border bg-white px-3 py-3 text-left shadow-sm transition-all sm:px-5 sm:py-4 ${
                isActive
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
                  : "border-gray-100 hover:border-gray-200 hover:shadow-md"
              } ${isDisabled ? "cursor-default opacity-60" : "cursor-pointer"}`}
            >
              <p className="text-xs text-gray-500 sm:text-sm">{item.label}</p>
              <p
                className={`mt-1 text-2xl font-bold sm:text-3xl ${toneClasses[item.tone]}`}
              >
                {value}
              </p>
            </button>
          );
        })}
      </div>

      <div ref={policiesRef}>
        {statusFilter !== "ALL" && (
          <p className="mb-4 text-sm text-gray-500">
            Afișezi polițele{" "}
            <span className="font-medium text-gray-700">
              {STATUS_FILTERS.find((item) => item.id === statusFilter)?.label.toLowerCase()}
            </span>
            .{" "}
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="font-medium text-[#2563EB] hover:underline"
            >
              Arată toate
            </button>
          </p>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const isActive = typeFilter === filter.id;
            const config =
              filter.id === "ALL" ? null : getProductTypeConfig(filter.id);

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTypeFilter(filter.id)}
                disabled={filter.count === 0}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50 ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-white/20 text-white"
                      : config
                        ? config.badgeClass
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredPolicies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-500">
              Nicio poliță în această categorie.
            </p>
          </div>
        ) : showGrouped ? (
          <div className="space-y-10">
            {visibleGroups.map((group) => (
              <section key={group.productType}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {group.label}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {group.policies.length}{" "}
                    {group.policies.length === 1 ? "poliță" : "polițe"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(group.policies as AdminPolicy[]).map((policy) => (
                    <AdminPolicyCard key={policy.id} policy={policy} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPolicies.map((policy) => (
              <AdminPolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
