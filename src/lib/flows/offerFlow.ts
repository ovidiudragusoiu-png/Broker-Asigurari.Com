import { api } from "@/lib/api/client";

export interface CreatedOrder {
  id: number;
  productType: string;
  hash: string;
}

export async function createOrderAndOffers<TBody, TOffer>(params: {
  orderPayload: Record<string, unknown>;
  fetchBodies: (order: CreatedOrder) => Promise<TBody[]>;
  fetchOffer: (body: TBody, order: CreatedOrder) => Promise<TOffer>;
  mapOfferError: (body: TBody, err: unknown) => TOffer;
}) {
  const order = await api.post<CreatedOrder>(
    "/online/offers/order/v3",
    params.orderPayload
  );

  const bodies = await params.fetchBodies(order);
  const offers = await Promise.all(
    bodies.map(async (body) => {
      try {
        return await params.fetchOffer(body, order);
      } catch (err) {
        return params.mapOfferError(body, err);
      }
    })
  );

  return { order, offers };
}

export async function createOrderAndSingleOffer<TOffer>(params: {
  orderPayload: Record<string, unknown>;
  fetchOffer: (order: CreatedOrder) => Promise<TOffer>;
}) {
  const order = await api.post<CreatedOrder>(
    "/online/offers/order/v3",
    params.orderPayload
  );
  const offer = await params.fetchOffer(order);
  return { order, offer };
}
