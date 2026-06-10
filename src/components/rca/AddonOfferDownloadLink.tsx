"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  fetchOfferDocument,
  fetchPolicyDocument,
  openDocumentInNewTab,
} from "@/lib/api/documentsClient";

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
      const data = usePolicyDoc
        ? await fetchPolicyDocument(policyId, orderHash, { offerId })
        : await fetchOfferDocument(offerId, orderHash);
      openDocumentInNewTab(data);
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
