# Malpraxis comparator wire shape (canonical)

Source of truth: **March 6, 2026** successful traffic in `.codex-logs/malpraxis-dev.log` only.  
Code path: `buildComparatorPayloadFromBodiesResponse()` in `src/lib/flows/malpraxisOfferPayload.ts`.

## Comparator/v3 envelope (all insurers)

Always present on the wire (March traces `caed6b2a`, `75aa9fc3`, `a42f7a06`):

| Field | Type | Notes |
|-------|------|--------|
| `orderId` | number | |
| `productId` | number | |
| `agencyId` | null | |
| `policyStartDate` | string ISO | `YYYY-MM-DDT00:00:00` |
| `policyEndDate` | string ISO | |
| `productCode` | string | e.g. `GARANTA_MALPRAXIS` |
| `saveError` | boolean | always `true` from bodies/v3 |
| `offerDetails` | object | see below |
| `specificDetails` | array | **passthrough from bodies/v3** — see per insurer |

## offerDetails wire types (all insurers)

Coerced by `finalizeMalpraxisComparatorOfferDetails`:

| Field | Wire type | moral=0 example | moral>0 notes |
|-------|-----------|-----------------|---------------|
| `malpraxisProfessionId` | **number** | `1`, `8`, `15` | |
| `category` | string | | |
| `categoryType` | string | | |
| `generalLimit` | **number** | `12000`, `37000` | |
| `moralDamagesLimit` | **number** | `0` | percent insurers: `5`, `10`, … |
| `customMoralDamagesLimit` | **number or null** | `null` | numeric insurers: EUR amount; unused → `null` |
| `retroactivePeriod` | **number** | `0` | |
| `currency` | string | `"EUR"` | |
| `operatingAuthorizationType` | **string** | `"0"` | not a number |
| `installmentsNo` | number | `1` | |

### Per-product moral field rules (from March + eligibility messages)

| productCode | productId | moral=0 | moral>0 (when logged) |
|-------------|-----------|---------|-------------------------|
| `GARANTA_MALPRAXIS` | 1218 | `moralDamagesLimit: 0`, `customMoralDamagesLimit: null` | `moralDamagesLimit: 10`, `custom: null` (trace `75aa9fc3`, premium 37) |
| `EUROINS_MALPRAXIS` | 195 | `moral: 0`, `custom: null` | numeric: `moral: 0`, `custom: <EUR>` — **no March success with UI percent** |
| `UNIQA_MALPRAXIS` | 79 | `moral: 0`, `custom: null` | `moral: 10`, `custom: null` in request; **no March premium success with moral>0** |
| `ABC_MALPRAXIS` | 1374 | `moral: 0`, `custom: null` | bodies returned PRIOR/PREVIOUS only |
| `ASIROM_MALPRAXIS` | 47 | `moral: 0`, `custom: null` | numeric custom only per eligibility — **no March success with moral>0** |
| `SIGNAL_IDUNA_MALPRAXIS` | 358 | `moral: 0`, `custom: null` | **no March premium success** |
| `OMNIASIG_MALPRAXIS_GENERAL` | 1321 | — | config / null-src errors in March |

## specificDetails per insurer

**Rule:** Use the **bodies/v3 response array verbatim** (string values only).  
If bodies returns `[]`, comparator sends `[]`. **Do not inject** the UI template (`EVENT_LIMIT`, `OPERATING_LICENSE`, `SUBLIMIT_*`, `PREVIOUS_CIVIL_*`) when bodies returned empty — that caused May 27 body-parse (trace `9767b85c`).

| productCode | moral=0 (March) | moral>0 (March) |
|-------------|-----------------|-----------------|
| `GARANTA_MALPRAXIS` | `[]` (traces `0c150574`, `a42f7a06` bodies → comparator) | `[]` (trace `75aa9fc3`, premium 37) |
| `EUROINS_MALPRAXIS` | `[]` (trace `a42f7a06` bodies) | **not logged** |
| `UNIQA_MALPRAXIS` | `[]` | `[]` in request trace `75aa9fc3`; **no premium success** |
| `ABC_MALPRAXIS` | `[{code:"PRIOR_CIVIL_LIABILITY_DAMAGES",value:"NU"},{code:"PREVIOUS_CIVIL_LIABILITY",value:"NU"}]` | **not logged** |
| `ASIROM_MALPRAXIS` | From bodies: `EVENT_LIMIT`, `OPERATING_LICENSE_TYPE`, `SUBLIMIT_MORAL_*` (zeros → coerced to strings / limit restored) | **not logged** |
| `SIGNAL_IDUNA_MALPRAXIS` | `[{code:"EVENT_LIMIT_INSURED_AMOUNT",value:"0"}]` from bodies | **not logged** |

SUBLIMIT rewrite in code applies **only when bodies already included** `SUBLIMIT_MORAL_DAMAGE_*` codes (Asirom path).

## What May 27 sent wrong (trace `9767b85c`, Fără moral + Fără retro)

| Field | March success | May 27 failure |
|-------|---------------|----------------|
| `specificDetails` | `[]` for Garanta/Euroins/Uniqa | Six-field **client template** injected |
| `offerDetails` types | numbers + `"0"` auth | Same after recent fixes — **wrong part was specificDetails** |
| ABC | 2 PRIOR/PREVIOUS strings | 6-field template + ignored bodies booleans/nulls |

## Combo for live retest

**Fără daune morale + Fără retroactivitate** — matches March traces `caed6b2a`, `0c150574`, `a42f7a06` (Garanta/Euroins/ABC premiums).

Hard refresh, then compare offers; expect Garanta/Euroins/ABC at minimum when bodies return `specificDetails: []` or insurer-specific bodies shapes above.
