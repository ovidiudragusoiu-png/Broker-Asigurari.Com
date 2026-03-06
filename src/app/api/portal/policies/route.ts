import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientInfo } from "@/lib/audit/logger";
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
    } = parsed.data;

    // Check if user is logged in
    const user = await getCurrentUser();
    const emailLower = (email || "").toLowerCase().trim();

    // Try to find user by email if not authenticated
    let userId = user?.id || null;
    if (!userId && emailLower) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (userByEmail) userId = userByEmail.id;
    }

    // Capture IP + user-agent server-side for anti-fraud
    const { ipAddress, userAgent } = getClientInfo(request);

    const policy = await prisma.policy.create({
      data: {
        userId,
        email: emailLower || user?.email || "unknown",
        orderId,
        orderHash,
        offerId,
        policyId,
        productType: productType.toUpperCase(),
        policyNumber,
        vendorName,
        premium,
        currency,
        startDate,
        endDate,
        vehicleVin: vehicleVin || null,
        vehiclePlate: vehiclePlate || null,
        vehicleCategory: vehicleCategory || null,
        ipAddress,
        userAgent,
      },
    });

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
