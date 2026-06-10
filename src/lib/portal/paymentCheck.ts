import { insuretechFetch } from "@/lib/api/insuretech";

/** Confirm with upstream that the offer in this order was paid. */
export async function isOrderPaid(
  offerId: number,
  orderHash: string
): Promise<boolean> {
  try {
    const raw = await insuretechFetch<unknown>(
      `/online/offers/payment/check/v3?orderHash=${encodeURIComponent(orderHash)}`,
      { method: "POST", body: { offerIds: [offerId] } }
    );
    const results = Array.isArray(raw) ? raw : [raw];
    return (
      results.length > 0 &&
      results.every(
        (r) =>
          !!r &&
          typeof r === "object" &&
          (r as { success?: unknown }).success === true
      )
    );
  } catch {
    return false;
  }
}
