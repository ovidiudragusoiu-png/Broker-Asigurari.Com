"use client";

import { useState } from "react";
import { FileText, Download, Calendar, Building2 } from "lucide-react";
import { btn } from "@/lib/ui/tokens";

interface PolicyData {
  id: string;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  premium: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

const PRODUCT_COLORS: Record<string, string> = {
  RCA: "bg-blue-100 text-blue-700",
  CASCO: "bg-purple-100 text-purple-700",
  TRAVEL: "bg-green-100 text-green-700",
  HOUSE: "bg-amber-100 text-amber-700",
  PAD: "bg-orange-100 text-orange-700",
  MALPRAXIS: "bg-rose-100 text-rose-700",
};

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

export default function PolicyCard({ policy }: { policy: PolicyData }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const colorClass =
    PRODUCT_COLORS[policy.productType] || "bg-gray-100 text-gray-700";

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/portal/policies/${policy.id}/document`
      );
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
      setError(
        err instanceof Error ? err.message : "Eroare la descărcare."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10">
            <FileText className="h-5 w-5 text-[#2563EB]" />
          </div>
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
            >
              {policy.productType}
            </span>
            {policy.policyNumber && (
              <p className="mt-1 text-sm font-medium text-gray-900">
                {policy.policyNumber}
              </p>
            )}
          </div>
        </div>
        {policy.premium != null && (
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              {policy.premium.toFixed(2)} {policy.currency}
            </p>
            <p className="text-xs text-gray-400">primă</p>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {policy.vendorName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span>{policy.vendorName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>
            {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

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
    </div>
  );
}
