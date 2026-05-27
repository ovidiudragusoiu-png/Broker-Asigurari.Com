"use client";

import { getPidDocumentForVendor } from "@/lib/config/pidDocuments";

interface OfferPidLinkProps {
  vendorName: string;
}

/** Compact PID download link; hidden when no document is mapped for this vendor. */
export default function OfferPidLink({ vendorName }: OfferPidLinkProps) {
  const doc = getPidDocumentForVendor(vendorName);
  if (!doc) return null;

  return (
    <>
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      <a
        href={doc.href}
        download={doc.downloadFilename}
        className="text-[11px] font-medium text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
        title={`Descarcă documentul de informare precontractuală (PID) — ${vendorName}`}
      >
        PID
      </a>
    </>
  );
}
