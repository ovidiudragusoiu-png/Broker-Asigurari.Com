import { insuretechFetch } from "@/lib/api/insuretech";
import { logAudit, hashSha256 } from "@/lib/audit/logger";

export function sanitizePdfFilename(label: string, suffix: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "polita"}-${suffix}.pdf`;
}

export async function fetchPolicyPdfBuffer(params: {
  policyId: number;
  orderHash: string;
  email?: string;
  productType?: string;
  filename?: string;
}): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const data = await insuretechFetch<{ url: string }>(
      `/online/policies/${params.policyId}/document/v3?orderHash=${params.orderHash}`
    );
    if (!data?.url) return null;

    const parsed = new URL(data.url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const response = await fetch(data.url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;

    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    await logAudit({
      action: "DOCUMENT_EMAILED",
      productType: params.productType,
      orderHash: params.orderHash,
      policyId: params.policyId,
      email: params.email,
      pdfHash: hashSha256(pdfBuffer),
    });

    return {
      buffer: pdfBuffer,
      filename:
        params.filename ?? sanitizePdfFilename(`polita-${params.policyId}`, "pdf"),
    };
  } catch (err) {
    console.error(`[fetchPolicyPdf] Failed for policy ${params.policyId}:`, err);
    return null;
  }
}

export function isEuroinsVendor(vendorName: string | null | undefined): boolean {
  return vendorName?.toLowerCase().includes("euroins") ?? false;
}
