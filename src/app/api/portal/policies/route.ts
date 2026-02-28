import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST: Save a policy record (called from payment callback)
export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    if (!orderId || !orderHash || !offerId || !policyId) {
      return NextResponse.json(
        { error: "Date insuficiente pentru salvarea poliței." },
        { status: 400 }
      );
    }

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

    const policy = await prisma.policy.create({
      data: {
        userId,
        email: emailLower || user?.email || "unknown",
        orderId: Number(orderId),
        orderHash: String(orderHash),
        offerId: Number(offerId),
        policyId: Number(policyId),
        productType: String(productType || "UNKNOWN"),
        policyNumber: policyNumber || null,
        vendorName: vendorName || null,
        premium: premium ? Number(premium) : null,
        currency: currency || "RON",
        startDate: startDate || null,
        endDate: endDate || null,
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
