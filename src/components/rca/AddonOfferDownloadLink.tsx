"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api/client";

interface AddonOfferDownloadLinkProps {
  offerId: number;
  /** When set, download issued policy PDF instead of pre-issue offer PDF. */
  policyId?: number | null;
  orderHash: string;
  className?: string;
}

export default function AddonOfferDownloadLink({
  offerId,
  policyId,
  orderHash,
  className = "mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB] hover:underline disabled:opacity-50",
}: AddonOfferDownloadLinkProps) {
  const [downloading, setDownloading] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const usePolicyDoc = typeof policyId === "number" && policyId > 0;
      const endpoint = usePolicyDoc
        ? `/online/policies/${policyId}/document/v3?orderHash=${encodeURIComponent(orderHash)}`
        : `/online/offers/${offerId}/document/v3?orderHash=${encodeURIComponent(orderHash)}`;
      const data = await api.get<{ url?: string }>(endpoint, { timeoutMs: 60_000 });
      if (data.url) {
        const safeUrl = new URL(data.url, window.location.origin);
        if (!["http:", "https:"].includes(safeUrl.protocol)) {
          throw new Error("Invalid document URL");
        }
        window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
      } else {
        setHidden(true);
      }
    } catch {
      setHidden(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={downloading}
      className={className}
    >
      <Download className="h-3 w-3" aria-hidden />
      {downloading ? "Se descarcă..." : "Descarcă oferta"}
    </button>
  );
}
