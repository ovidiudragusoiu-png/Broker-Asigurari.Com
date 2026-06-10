import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { validateBody, checkoutSessionSchema } from "@/lib/validation/schemas";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, checkoutSessionSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    const token = randomBytes(32).toString("hex");

    await prisma.checkoutSession.create({
      data: {
        token,
        orderId: data.orderId,
        offerId: data.offerId,
        orderHash: data.orderHash,
        productType: data.productType.toUpperCase(),
        email: data.email || null,
        padOfferId: data.padOfferId ?? null,
        policyData: data.policyData ? JSON.stringify(data.policyData) : null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[CheckoutSession] Error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    const session = await prisma.checkoutSession.findUnique({
      where: { token },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "expired") {
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    if (new Date() > session.expiresAt) {
      await prisma.checkoutSession.update({
        where: { token },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    return NextResponse.json({
      orderId: session.orderId,
      offerId: session.offerId,
      orderHash: session.orderHash,
      productType: session.productType,
      email: session.email,
      padOfferId: session.padOfferId,
      policyData: session.policyData ? JSON.parse(session.policyData) : null,
    });
  } catch (err) {
    console.error("[CheckoutSession] GET error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
