"use client";

import { useMemo, useRef, useState } from "react";
import PolicyCard from "@/components/portal/PolicyCard";
import {
  computeDashboardStats,
  filterPoliciesByStatus,
  groupPoliciesByType,
  sortPolicies,
  type DashboardPolicy,
  type StatusFilter,
} from "@/lib/portal/policyUtils";
import { getProductTypeConfig } from "@/lib/portal/productTypes";

interface DashboardContentProps {
  policies: DashboardPolicy[];
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

export default function DashboardContent({ policies }: DashboardContentProps) {
  const policiesRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const stats = useMemo(() => computeDashboardStats(policies), [policies]);

  const statusFiltered = useMemo(
    () => filterPoliciesByStatus(policies, statusFilter),
    [policies, statusFilter]
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
    return sortPolicies(byType);
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

  const showGrouped = statusFilter === "ALL" && typeFilter === "ALL";

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className={`rounded-2xl border bg-white px-5 py-4 text-left shadow-sm transition-all ${
                isActive
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
                  : "border-gray-100 hover:border-gray-200 hover:shadow-md"
              } ${isDisabled ? "cursor-default opacity-60" : "cursor-pointer"}`}
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`mt-1 text-3xl font-bold ${toneClasses[item.tone]}`}>
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
                  {group.policies.map((policy) => (
                    <PolicyCard key={policy.id} policy={policy} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPolicies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
