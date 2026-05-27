/**
 * Pre-contractual information documents (PID) per RCA insurer.
 * PDFs live in public/documents/pid/ as PID_{KEY}.pdf.
 * Add entries here when new insurer PDFs are available; the UI shows a link only when mapped.
 */

export type PidInsurerKey =
  | "GROUPAMA"
  | "ALLIANZ"
  | "EAZY"
  | "OMNIASIG"
  | "ASIROM"
  | "HELLAS"
  | "GENERALI"
  | "GRAWE"
  | "AXERIA"
  // Reserved for future PDFs (no file yet — omit from PID_DOCUMENTS until added):
  | "ANYTIME"
  | "UNIQA"
  | "SIGNAL_IDUNA";

export interface PidDocumentEntry {
  key: PidInsurerKey;
  /** Public URL served from /public */
  href: string;
  /** Suggested filename on download (ASCII for broad browser support) */
  downloadFilename: string;
  /** Lowercase vendor aliases; matched with equality or substring on normalized vendorName */
  aliases: string[];
}

const PID_BASE = "/documents/pid";

/** Insurers with a PID PDF in public/documents/pid/ */
export const PID_DOCUMENTS: readonly PidDocumentEntry[] = [
  {
    key: "GROUPAMA",
    href: `${PID_BASE}/PID_GROUPAMA.pdf`,
    downloadFilename: "PID-Groupama.pdf",
    aliases: ["groupama"],
  },
  {
    key: "ALLIANZ",
    href: `${PID_BASE}/PID_ALLIANZ.pdf`,
    downloadFilename: "PID-Allianz-Tiriac.pdf",
    aliases: ["allianz", "allianz tiriac", "allianz țiriac", "allianz-tiriac"],
  },
  {
    key: "EAZY",
    href: `${PID_BASE}/PID_EAZY.pdf`,
    downloadFilename: "PID-Eazy-Insure.pdf",
    aliases: ["eazy", "eazy insure"],
  },
  {
    key: "OMNIASIG",
    href: `${PID_BASE}/PID_OMNIASIG.pdf`,
    downloadFilename: "PID-Omniasig.pdf",
    aliases: ["omniasig"],
  },
  {
    key: "ASIROM",
    href: `${PID_BASE}/PID_ASIROM.pdf`,
    downloadFilename: "PID-Asirom.pdf",
    aliases: ["asirom"],
  },
  {
    key: "HELLAS",
    href: `${PID_BASE}/PID_HELLAS.pdf`,
    downloadFilename: "PID-Hellas-Direct.pdf",
    aliases: ["hellas", "hellas direct", "hellas next ins"],
  },
  {
    key: "GENERALI",
    href: `${PID_BASE}/PID_GENERALI.pdf`,
    downloadFilename: "PID-Generali.pdf",
    aliases: ["generali"],
  },
  {
    key: "GRAWE",
    href: `${PID_BASE}/PID_GRAWE.pdf`,
    downloadFilename: "PID-Grawe.pdf",
    aliases: ["grawe"],
  },
  {
    key: "AXERIA",
    href: `${PID_BASE}/PID_AXERIA.pdf`,
    downloadFilename: "PID-Axeria.pdf",
    aliases: ["axeria"],
  },
] as const;

function normalizeVendorForPidLookup(vendorName: string): string {
  return vendorName.toLowerCase().trim();
}

function aliasMatchesVendor(alias: string, normalizedVendor: string): boolean {
  return (
    normalizedVendor === alias ||
    normalizedVendor.includes(alias) ||
    alias.includes(normalizedVendor)
  );
}

export type PidDocumentLink = Pick<
  PidDocumentEntry,
  "href" | "downloadFilename" | "key"
>;

/** Returns PID document metadata when this vendor has a mapped PDF; otherwise null. */
export function getPidDocumentForVendor(
  vendorName: string
): PidDocumentLink | null {
  const normalized = normalizeVendorForPidLookup(vendorName);
  if (!normalized) return null;

  for (const entry of PID_DOCUMENTS) {
    if (entry.aliases.some((alias) => aliasMatchesVendor(alias, normalized))) {
      return {
        key: entry.key,
        href: entry.href,
        downloadFilename: entry.downloadFilename,
      };
    }
  }

  return null;
}
