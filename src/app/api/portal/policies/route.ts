import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientInfo } from "@/lib/audit/logger";
import {
  completeCheckoutSession,
  findCheckoutSession,
  isCheckoutSessionUsable,
} from "@/lib/portal/checkoutSession";
import { fetchOfferPortalFields } from "@/lib/portal/fetchOfferPortalFields";
import { isOrderPaid } from "@/lib/portal/paymentCheck";
import { validateBody, portalPolicySchema } from "@/lib/validation/schemas";

// POST: Save a policy record (called from payment callback)
export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, portalPolicySchema);
    if ("error" in parsed) return parsed.error;
    const {
      orderId,
      orderHash,
      offerId,
      policyId,
      productType,
      policyNumber,
      vendorName,
      premium,
      currency,
      startDate,
      endDate,
      email,
      vehicleVin,
      vehiclePlate,
      vehicleCategory,
      sessionToken,
    } = parsed.data;

    const user = await getCurrentUser();

    if (!user) {
      if (!sessionToken) {
        return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
      }
      const session = await findCheckoutSession(sessionToken);
      if (!session || !isCheckoutSessionUsable(session, orderHash, offerId)) {
        return NextResponse.json(
          { error: "Sesiune de plată invalidă." },
          { status: 401 }
        );
      }
    }

    const paid = await isOrderPaid(offerId, orderHash);
    if (!paid) {
      return NextResponse.json(
        { error: "Plata nu a fost confirmată pentru această comandă." },
        { status: 402 }
      );
    }

    const upstream = await fetchOfferPortalFields(
      productType,
      offerId,
      orderHash
    );

    const resolvedOrderId = upstream?.orderId ?? orderId;
    const resolvedVendorName = upstream?.vendorName ?? vendorName ?? null;
    const resolvedPremium = upstream?.premium ?? premium ?? null;
    const resolvedCurrency = upstream?.currency ?? currency;
    const resolvedStartDate = upstream?.startDate ?? startDate ?? null;
    const resolvedEndDate = upstream?.endDate ?? endDate ?? null;

    const emailLower = (email || "").toLowerCase().trim();

    let userId = user?.id || null;
    if (!userId && emailLower) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (userByEmail) userId = userByEmail.id;
    }

    const { ipAddress, userAgent } = getClientInfo(request);

    const policy = await prisma.policy.create({
      data: {
        userId,
        email: emailLower || user?.email || "unknown",
        orderId: resolvedOrderId,
        orderHash,
        offerId,
        policyId,
        productType: productType.toUpperCase(),
        policyNumber,
        vendorName: resolvedVendorName,
        premium: resolvedPremium,
        currency: resolvedCurrency,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        vehicleVin: vehicleVin || null,
        vehiclePlate: vehiclePlate || null,
        vehicleCategory: vehicleCategory || null,
        ipAddress,
        userAgent,
      },
    });

    if (sessionToken) {
      await completeCheckoutSession(sessionToken);
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Save policy error:", error);
    return NextResponse.json(
      { error: "Eroare la salvarea poliței." },
      { status: 500 }
    );
  }
}

// GET: List all policies for the current user
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  try {
    const policies = await prisma.policy.findMany({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email.toLowerCase().trim() },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("List policies error:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea polițelor." },
      { status: 500 }
    );
  }
}
