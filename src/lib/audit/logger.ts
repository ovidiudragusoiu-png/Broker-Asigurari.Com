import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

export function getClientInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}

export function hashSha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

interface AuditData {
  action: string;
  productType?: string;
  orderId?: number;
  orderHash?: string;
  offerId?: number;
  policyId?: number;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  pdfHash?: string;
}

export async function logAudit(data: AuditData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        productType: data.productType || null,
        orderId: data.orderId ?? null,
        orderHash: data.orderHash || null,
        offerId: data.offerId ?? null,
        policyId: data.policyId ?? null,
        email: data.email || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent
          ? data.userAgent.substring(0, 500)
          : null,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        pdfHash: data.pdfHash || null,
      },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}
