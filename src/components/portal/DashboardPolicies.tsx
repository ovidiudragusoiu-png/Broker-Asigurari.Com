"use client";

import { useMemo, useState } from "react";
import PolicyCard from "@/components/portal/PolicyCard";
import {
  groupPoliciesByType,
  sortPolicies,
  type DashboardPolicy,
} from "@/lib/portal/policyUtils";
import { getProductTypeConfig } from "@/lib/portal/productTypes";

interface DashboardPoliciesProps {
  policies: DashboardPolicy[];
}

export default function DashboardPolicies({ policies }: DashboardPoliciesProps) {
  const groups = useMemo(() => groupPoliciesByType(policies), [policies]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filters = [
    { id: "ALL", label: "Toate", count: policies.length },
    ...groups.map((group) => ({
      id: group.productType,
      label: group.label,
      count: group.policies.length,
    })),
  ];

  const visibleGroups =
    activeFilter === "ALL"
      ? groups
      : groups.filter((group) => group.productType === activeFilter);

  const filteredPolicies =
    activeFilter === "ALL"
      ? sortPolicies(policies)
      : sortPolicies(
          policies.filter(
            (policy) => policy.productType.toUpperCase() === activeFilter
          )
        );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const config =
            filter.id === "ALL" ? null : getProductTypeConfig(filter.id);

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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

      {activeFilter === "ALL" ? (
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
  );
}
