import { NextRequest, NextResponse } from "next/server";
import { insuretechFetch } from "@/lib/api/insuretech";

/**
 * TEMPORARY debug endpoint to test travel bodies API directly.
 * Remove after debugging is complete.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, orderHash, traveler, travelZoneId, purposeId, startDate, endDate, numberOfTravelers, productIds } = await req.json();

    // Try the exact payload with full details
    const payload = {
      orderId,
      productIds,
      policyStartDate: startDate,
      policyEndDate: endDate,
      travelerDetails: [traveler],
      offerDetails: {
        travelZoneId,
        purposeId,
        numberOfTravelers,
      },
    };

    console.log("[DEBUG Travel] Sending payload:", JSON.stringify(payload, null, 2));

    try {
      const result = await insuretechFetch<unknown>(
        `/online/offers/travel/comparator/bodies/v3?orderHash=${orderHash}`,
        { method: "POST", body: payload }
      );
      return NextResponse.json({ success: true, result });
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; data?: unknown };
      console.error("[DEBUG Travel] Error:", error.status, error.message, JSON.stringify(error.data, null, 2));
      return NextResponse.json({
        success: false,
        status: error.status,
        message: error.message,
        data: error.data,
      });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
