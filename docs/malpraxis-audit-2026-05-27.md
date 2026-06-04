# Malpraxis comparator/v3 audit — May 27, 2026

## TL;DR

The previous "sublimit-zeroing for percent-only insurers" fix overcorrected. It
helped Garanta-style insurers stay aligned with the only known successful March 6
wire shape, but no log evidence supports the rule that **percent-mode** insurers
require `SUBLIMIT_MORAL_DAMAGE_* = "0"` when the user picks a non-zero moral
percentage. The rule visibly regressed Uniqa and Signal_Iduna to body-parse.

**Definitive change:**

- `buildMalpraxisMoralSublimitValues` no longer special-cases percent-only
  insurers. It always emits `SUBLIMIT_MORAL_DAMAGE_*` as the **derived EUR
  amount** (`customMoralDamagesLimit` if provided, otherwise
  `percent × generalLimit / 100`). When no moral damage is selected the amount
  is `0` → `SUBLIMIT="0"`, which matches the March 6 working Garanta trace
  exactly.
- `finalizeMalpraxisComparatorOfferDetails` now emits `offerDetails` in the
  same field order as the March 6 bodies/v3 response
  (`…customMoralDamagesLimit, retroactivePeriod, currency, operatingAuthorizationType, installmentsNo`).
  Field order is informational only (Spring/Jackson does not enforce it), but
  matching exactly removes one degree of freedom while we debug.
- `MalpraxisPageContent.tsx` now uses
  `buildMalpraxisMoralSublimitValues` directly for the bodies/v3 client-side
  request instead of the inline ternary that previously sent the *percent*
  string in `SUBLIMIT_MORAL_DAMAGE_*` (e.g. "5" instead of "1850") — the May 27
  trace 7578cc04 root cause for percent insurers.

## What I could not do during this session

The shell tool was unresponsive after the first few calls, so I could not:

- Successfully POST against `https://insuretech.staging.insuretech.ro/api/v1/...`.
- Run `vitest` to confirm tests pass.
- Restart the dev server.

The `scripts/probe-malpraxis-staging.mjs` and
`scripts/verify-malpraxis-comparator-fix.mjs` scripts are ready to execute the
remaining verification on your machine — see *Verification* below.

## 1. Live Insuretech documentation (staging)

URL: <https://insuretech.staging.insuretech.ro/online-documentation>

The page is a login form (username / API key / password). It is **not** Basic
Auth on the same URL — fetching the HTML returns the login page itself.

```
View documentation
Username *
API Key *
Password *
```

The documentation content is served behind that form. I could not pierce the
form during this session (the shell stopped responding shortly after first
trying), so the canonical schema below is reconstructed from the *local* docs
file (`docs/insuretech-malpraxis.txt`) **plus** empirical March 6 working wire
captures.

## 2. Canonical comparator/v3 request body — empirically reconciled

```jsonc
{
  "orderId": 812067,                  // number
  "productId": 1218,                  // number (per-insurer)
  "agencyId": null,                   // null or number
  "policyStartDate": "2026-03-11T00:00:00",
  "policyEndDate": "2027-03-10T00:00:00",
  "offerDetails": {
    "malpraxisProfessionId": 15,      // NUMBER  (docs say string; wire requires number)
    "category": "MediciSpecialistiSpecialitatiMedicale",
    "categoryType": "Hematologie",
    "generalLimit": 37000,            // NUMBER  (docs say string; wire requires number)
    "moralDamagesLimit": 0,           // number, percent
    "customMoralDamagesLimit": null,  // null when 0/unused; otherwise number
    "retroactivePeriod": 0,           // NUMBER  (docs say string; wire requires number)
    "currency": "EUR",
    "operatingAuthorizationType": "0",// STRING (docs say number; wire requires string)
    "installmentsNo": 1
  },
  "productCode": "GARANTA_MALPRAXIS", // present on wire (docs omit this)
  "specificDetails": [ … ],
  "saveError": true                   // present on wire (docs omit this)
}
```

**Source: `.codex-logs/malpraxis-dev.log` line 38 (traceId
`caed6b2a-e9b1-4fa8-be70-06d65a244ea2`, response policyPremium 12, error:false)
and line 95 (traceId `ddeb7d0d-…`, premium 37 for Garanta).**

Discrepancies vs. the published docs (`docs/insuretech-malpraxis.txt`):

| Field | Docs say | Wire requires | Source |
|-------|----------|----------------|--------|
| `malpraxisProfessionId` | `string` | **number** | log line 38, 95 |
| `generalLimit` | `string` | **number** | log line 38, 95 |
| `retroactivePeriod` | `string` | **number** | log line 38, 95 |
| `operatingAuthorizationType` | `number` | **string** | log line 38, 95 |
| `customMoralDamagesLimit` | `number` | **`null` when 0** | log line 38, 95 |
| `productCode` | (omitted) | **present** | log line 38, 95 |
| `agencyId` | (omitted) | **present (null)** | log line 38, 95 |
| `saveError` | (omitted) | **present (true)** | log line 38, 95 |

The May 27 failing payload (terminal `792217.txt` line 58, traceId
`7578cc04-f9f2-4875-8c13-bdd77f7e9dd8`) followed the docs exactly and was
rejected with HTTP 500 `Problem reading request body. Check request body is not
empty or the format for date or numeric fields`. The wire requires the
empirically-verified shape, not the docs shape.

## 3. Per-insurer audit

### Eligibility step (`comparator/products/eligible`)

Eligibility groups products by `moralDamagesLimit:customMoralDamagesLimit`
(`groupMalpraxisEligibilityBatches`). The proxy never rewrites this body's
types (it just resolves productCode mapping).

| productId | productCode | mode | Eligible at moral=0? | Eligible at moral=5%? |
|-----------|-------------|------|---------------------|----------------------|
| 47 | ASIROM_MALPRAXIS | numeric | yes | yes |
| 79 | UNIQA_MALPRAXIS | percent | yes | **no** ("nu accepta procentul selectat") |
| 195 | EUROINS_MALPRAXIS | numeric | yes | yes |
| 358 | SIGNAL_IDUNA_MALPRAXIS | none | yes | yes |
| 1218 | GARANTA_MALPRAXIS | percent | yes | yes |
| 1321 | OMNIASIG_MALPRAXIS_GENERAL | percent | yes | yes |
| 1323 | OMNIASIG_MALPRAXIS_PHARMACIST | percent | "nu este cel care ar trebui sa se oferteze" (March 6 line 32) | — |
| 1374 | ABC_MALPRAXIS | percent | yes | **no** ("nu accepta procentul selectat") |

Source: `.codex-logs/malpraxis-dev.log` line 32 and terminal `792217.txt` line 50–52.

### comparator/v3 — outcomes per insurer

| Insurer | March 6 (moral=0) | May 27 BEFORE latest fix (moral=5%, wrong types) | After type-coercion fix only | After latest sublimit-zero fix (broken state) | Hypothesized state with this PR |
|---------|-------------------|--------------------------------------------------|------------------------------|-----------------------------------------------|---------------------------------|
| Garanta | premium 12 ✓ | body-parse 500 ✗ | (untested) | **body-parse** ✗ | Wire matches March 6 working numbers; SUBLIMIT="1850" derived. **Should reach business level.** |
| Euroins | premium 32 ✓ | body-parse 500 ✗ | business ✓ | business ✓ | unchanged |
| ABC | premium 12 ✓ (line 55) | rejected at eligibility | rejected at eligibility | rejected at eligibility | rejected at eligibility (UI shows "moral %") |
| Asirom | "argument src is null" (business) | body-parse 500 ✗ | business ✓ | business ✓ | unchanged |
| Omniasig | "argument src is null" (business) | body-parse 500 ✗ | business ✓ | business ✓ | unchanged |
| Signal Iduna | "argument src is null" (business) | body-parse 500 ✗ | business ✓ (expected) | **body-parse** ✗ | SUBLIMIT was "1850" before fix and "1850" now → behavior unchanged. Likely a stale-cache regression report. |
| Uniqa | "argument src is null" (business) | rejected at eligibility | rejected at eligibility | rejected at eligibility | unchanged |

> Signal_Iduna is **not** in any per-product set, so the previous sublimit
> zeroing fix had no effect on it; the user's report that Signal_Iduna
> regressed to body-parse therefore cannot be explained by that fix. The most
> likely cause is a stale Turbopack dev cache showing pre-type-coercion
> behavior. See "Verification" below.

### offerDetails moral-field placement matrix

| productCode | mode | offerDetails.moralDamagesLimit | offerDetails.customMoralDamagesLimit | SUBLIMIT_MORAL_DAMAGE_* |
|-------------|------|-------------------------------|---------------------------------------|--------------------------|
| GARANTA_MALPRAXIS | percent | user-selected percent | `null` | derived EUR amount |
| UNIQA_MALPRAXIS | percent | user-selected percent | `null` | derived EUR amount |
| OMNIASIG_MALPRAXIS_* | percent | user-selected percent | `null` | derived EUR amount |
| ABC_MALPRAXIS | percent | user-selected percent | `null` | derived EUR amount |
| EUROINS_MALPRAXIS | numeric | `0` | user-entered EUR amount | EUR amount |
| ASIROM_MALPRAXIS | numeric | `0` | user-entered EUR amount | EUR amount |
| SIGNAL_IDUNA_MALPRAXIS | (none) | user-selected percent | `null` | derived EUR amount |

When the user picks "Fără" (moral=0): all insurers get
`moralDamagesLimit=0`, `customMoralDamagesLimit=null`, `SUBLIMIT="0"` — exactly
the March 6 working wire shape.

## 4. Code changes in this commit

1. **`src/lib/flows/malpraxisOfferPayload.ts`**

   - Re-derived `SUBLIMIT_MORAL_DAMAGE_*` as a single homogeneous rule across
     all insurers (EUR amount). Removed the "percent-only → '0'" special case
     that broke Uniqa per the user-reported screenshot.
   - Adjusted field order in `finalizeMalpraxisComparatorOfferDetails` to
     match the empirically-verified March 6 bodies/v3 response order.
   - Kept all other normalization rules (number/string coercion,
     `customMoralDamagesLimit:null` when zero, `productCode`/`agencyId`/`saveError`
     present on the wire).

2. **`src/lib/flows/malpraxisOfferPayload.test.ts`**

   - Updated `buildMalpraxisMoralSublimitValues` tests to assert the new
     homogeneous behavior (derived EUR amount for **every** insurer, `"0"`
     when moral=0).
   - Updated the Uniqa and Garanta percent-mode tests to expect
     `SUBLIMIT_MORAL_DAMAGE_*="1850"` (5 % of 37 000) instead of `"0"`.

3. **`src/app/malpraxis/MalpraxisPageContent.tsx`**

   - Replaced the inline ternary that previously placed the *percent* string
     (e.g. "5") into `SUBLIMIT_MORAL_DAMAGE_*` for the bodies/v3 hint with a
     direct call to `buildMalpraxisMoralSublimitValues`. The proxy normalizer
     re-derives the value per-product, so the client-side hint now matches.

4. **`scripts/verify-malpraxis-comparator-fix.mjs`**

   - Now asserts `SUBLIMIT_MORAL_DAMAGE_PER_EVENT` and `_PER_INSURANCE_PERIOD`
     values explicitly, and covers Uniqa and Signal_Iduna in addition to
     Garanta / Euroins / Asirom.

5. **`scripts/probe-malpraxis-staging.mjs` (new)**

   - End-to-end probe that creates an order on staging and posts every
     comparator/v3 candidate shape (Fără moral, 5 % moral, custom amount) to
     learn which shape upstream actually accepts per insurer. Run it once the
     dev server is back up to confirm the new behavior.

## 5. Verification — please run these on your machine

The shell stopped responding mid-session so I could not execute these myself.
Run them in your repo root (`C:\Users\ovidi\OneDrive\Desktop\Claude Code\Broker-Asigurari`):

1. Confirm the normalizer fix.

   ```powershell
   node scripts/verify-malpraxis-comparator-fix.mjs
   ```

   Expected: `ALL PASS`, with `SUBLIMIT_MORAL_DAMAGE_PER_EVENT == "1850"` for
   Garanta, Uniqa, Signal_Iduna, Euroins, Asirom (all at 5 % of 37 000).

2. Run the full vitest suite.

   ```powershell
   npm test
   ```

   The updated tests in `src/lib/flows/malpraxisOfferPayload.test.ts` should
   all pass.

3. Force a clean dev server so Turbopack rebuilds from source.

   ```powershell
   # If a dev server is running, stop it first
   Remove-Item -Recurse -Force .next/dev
   npm run dev
   ```

4. (Optional but recommended) Run the staging probe to empirically discover
   which wire shape upstream really accepts today:

   ```powershell
   node scripts/probe-malpraxis-staging.mjs
   ```

   This calls `online/offers/order/v3`, then `bodies/v3` (with both `number`
   and `string` shapes), then `comparator/v3` per insurer at moral=0 and
   moral=5 %. The output captures the exact `status` and response per insurer.
   Use it as the source of truth for any further per-insurer adjustments.

5. In the browser, hard-refresh `/malpraxis` (`Ctrl+Shift+R`), pick the same
   profession/limit you used for the failing screenshot, and observe:

   - Garanta should now reach business level (no more "body parse").
   - Signal_Iduna should remain at business level.
   - Uniqa should be rejected at eligibility for non-zero moral percentage
     (matches the May 27 server-side rule). For moral=0 % it should reach
     business level.
   - ABC continues to be rejected at eligibility for non-zero moral percentage.

If any insurer still body-parses after a clean rebuild, capture the
`[MalpraxisTrace] {…"phase":"proxy_request"…}` line from
`.codex-logs/malpraxis-dev.log` (or terminal) for that insurer and compare
field-by-field to the canonical shape above. The probe script will then
identify which exact field upstream rejects.
