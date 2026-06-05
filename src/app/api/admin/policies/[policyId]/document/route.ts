import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAdminUser } from "@/lib/auth/admin";
import { insureTechEnv, appEnv } from "@/lib/config/env";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const { policyId } = await params;

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    return NextResponse.json(
      { error: "Polița nu a fost găsită." },
      { status: 404 }
    );
  }

  const targetUrl = `${insureTechEnv.apiUrl}/online/policies/${policy.policyId}/document/v3?orderHash=${policy.orderHash}`;

  const credentials = Buffer.from(
    `${insureTechEnv.username}:${insureTechEnv.password}`
  ).toString("base64");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Math.max(appEnv.requestTimeoutMs, 60000)
    );

    const response = await fetch(targetUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Api_key: insureTechEnv.apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Admin] Document fetch failed: ${response.status}`,
        errorText
      );
      return NextResponse.json(
        { error: "Eroare la descărcarea documentului." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Admin] Document download error:", error);
    return NextResponse.json(
      { error: "Eroare la descărcarea documentului." },
      { status: 500 }
    );
  }
}
