import { NextRequest, NextResponse } from "next/server";
import { sendDntSummaryEmail } from "@/lib/email/dntSummaryEmail";
import { validateBody, dntSummarySchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, dntSummarySchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    await sendDntSummaryEmail({
      email: data.email,
      firstName: data.firstName,
      productType: data.productType,
      rows: data.rows,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DNT summary email] send error:", err);
    return NextResponse.json({ success: false });
  }
}
