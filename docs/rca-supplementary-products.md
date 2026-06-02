# RCA supplementary products (additionals)

## Why live shows the same options on every RCA insurer card

The Insuretech API treats supplementary products separately from the RCA insurer on the offer card.

| Endpoint | Scope | Meaning of `vendorDetails` |
|----------|--------|----------------------------|
| `GET /online/products/rca/additionals` | **Global catalog** for the integration (not per RCA product) | Insurer that **sells** the supplementary product (Grawe, Colonnade, Omniasig, …) |
| `POST /online/offers/rca/additionals` | **Per order** + `productId` | Quotes one catalog product; response `productDetails` includes commercial `productName` and vendor |

RCA offers (`POST /online/offers/rca`) are per RCA product/insurer. Additional offers use the **same `orderId`** and any catalog `productId`. Whether a quote succeeds depends on the order and period, not on which RCA card the user opened.

So in production you see sections like **Produse COLONNADE**, **Produse Grawe**, etc. on **every** RCA card: the list is the full catalog grouped by supplementary vendor, not filtered to match the RCA insurer on that row.

## Application behaviour (Broker-Asigurari)

1. **Catalog** — fetched once per offers step (`GET …/additionals`), all `productId`s kept (multiple ROAD_ASSIST tiers per vendor).
2. **Quoting** — for 6 / 12 month tabs, prefetch (or expand) posts **every** catalog `productId` with the current `orderId` and selected period.
3. **Display** — only products with a valid offer for that period; grouped under `Produse {vendorDetails.commercialName}`; label = API `productName` (e.g. “Asistenta Rutiera BasicPlus”).
4. **UI** — chevron only under 6 / 12 price buttons when at least one quotable product exists after the quote pass; no empty “nu sunt disponibile” row; selection and premiums apply to all cards (shared cache per period + settlement tab).

## How to verify

1. Complete RCA flow until offers load (order + hash present).
2. Open **6 / 12 luni** tab — after a short load, cards with 6 / 12 prices may show a chevron under those buttons.
3. Expand — expect multiple vendor sections and commercial product names, same catalogue on different RCA insurer cards.
4. Select add-ons — total on the blue button and in review should include premiums; download link per offer where API returns an id.
5. Run `npm test -- src/lib/utils/rcaAddons.test.ts` and `npm run lint`.
