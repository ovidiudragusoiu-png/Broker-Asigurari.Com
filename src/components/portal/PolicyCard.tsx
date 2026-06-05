"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Calendar, Building2, Car } from "lucide-react";
import { btn } from "@/lib/ui/tokens";
import { getProductTypeConfig } from "@/lib/portal/productTypes";
import {
  getPolicyStatus,
  type DashboardPolicy,
} from "@/lib/portal/policyUtils";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function PolicyCard({ policy }: { policy: DashboardPolicy }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const config = getProductTypeConfig(policy.productType);
  const status = getPolicyStatus(policy.endDate);
  const Icon = config.icon;
  const isExpired = status.status === "expired";

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/policies/${policy.id}/document`);
      if (!res.ok) {
        throw new Error("Eroare la descărcarea documentului.");
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Link-ul documentului nu este disponibil.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la descărcare.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-gray-100 border-l-4 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${config.accentClass} ${
        isExpired ? "opacity-80" : ""
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBgClass}`}
          >
            <Icon className={`h-5 w-5 ${config.iconClass}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
              >
                {config.label}
              </span>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            {policy.policyNumber && (
              <p className="mt-2 truncate text-base font-semibold text-gray-900">
                {policy.policyNumber}
              </p>
            )}
          </div>
        </div>
        {policy.premium != null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-gray-900">
              {policy.premium.toFixed(2)} {policy.currency}
            </p>
            <p className="text-xs text-gray-400">primă</p>
          </div>
        )}
      </div>

      <div className="mb-4 space-y-2">
        {policy.vendorName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{policy.vendorName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
          <span>
            {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
          </span>
        </div>
        {policy.vehiclePlate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Car className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{policy.vehiclePlate}</span>
          </div>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`${btn.secondary} flex w-full items-center justify-center gap-2`}
        >
          {downloading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? "Se descarcă..." : "Descarcă polița"}
        </button>

        {isExpired && (
          <Link
            href={config.calculatorHref}
            className={`${btn.tertiary} text-center text-sm`}
          >
            Reînnoiește
          </Link>
        )}
      </div>
    </div>
  );
}
