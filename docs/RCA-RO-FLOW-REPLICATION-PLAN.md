# Plan: Replicate RCA.RO Flow Using InsureTech Documentation

This document analyses the [RCA.RO](https://www.rca.ro/) flow and outlines how to align our broker app with it, using the same InsureTech backend.

---

## 1. RCA.RO Flow (Summary)

From the public site and FAQs:

| Step | RCA.RO | Details |
|------|--------|---------|
| **Entry** | Calculator: **Număr auto** + **Județ** | Plate format: B11XXX, B111XXX, IS11XXX. County required. Button: "Calculează RCA". |
| **1** | **Categoria vehicul** | Autoturism, autoutilitară, moto, remorcă. |
| **2** | **Serie șasiu (VIN)** | Used to pull technical data from **DRPCIV**. |
| **3** | **Proprietar** | **PF:** CNP (+ CI, permis). **PJ:** CUI + CAEN (+ șofer, CI, permis). |
| **4** | **Oferte** | ~60 sec: toate ofertele de preț, toți asiguratorii. Compare **1, 2, 3, 6, 12 luni** și **standard** vs **cu decontare directă**. |
| **5** | **Plată + poliță** | Pay online → poliță electronică pe email (instant). Optional: MyRCA account, alerte expirare. |

Relevant quotes:
- *"Introduci numărul auto al vehiculului, alegi apoi categoria auto: autoturism, autoutilitară, moto sau remorcă."*
- *"Ți se va solicita seria de șasiu a vehiculului, pe baza căreia vor fi preluate din baza de date DRPCIV caracteristicile tehnice."*
- *"Compari rapid și ușor ofertele de preț de la toți asiguratorii pentru durate de 1,2,3,6 sau 12 luni."*
- *"Există două tipuri: asigurarea standard și asigurarea RCA cu decontare directă."*

---

## 2. Our Current Flow (Broker App)

| Step | Our app | API (InsureTech) |
|------|---------|------------------|
| **1** | **Vehicul & Proprietar** (one big step) | Order: `POST /online/offers/rca/order/v3` with `vehicleDetails`, `rcaOwnerDetails`, `rcaUserDetails`. |
| | Vehicle: VIN (lookup) + număr înmatriculare + categorie/subcategorie + marcă/model/an + motor, etc. | Vehicle lookup: `GET /online/vehicles?VIN=...` (DRPCIV-style). |
| | Person: PF (CNP, CI, permis, adresă) sau PJ (CUI, CAEN, etc.). Optional "utilizator diferit de proprietar". | |
| | Data început + perioade: **12 luni** + **perioadă secundară** (obligatorie, 1–11). | Offers: `POST /online/offers/rca/v3` with `periodMonths: ['12', '<second>']`. |
| **2** | **Consimtământ** | Consent API (vendorProductType RCA). |
| **3** | **Comparare oferte** | Table: 12 luni fără/cu decontare, Perioada 2 fără/cu decontare. **Cu decontare** often empty (backend not returning direct-settlement prices in v3 response). |
| **4** | **Plată** | PaymentFlow → redirect → policy creation (`/payment/callback`, productType RCA). |

---

## 3. Gap Analysis and Replication Plan

### 3.1 Entry: Număr auto + Județ first (like RCA.RO)

- **RCA.RO:** User enters **număr auto** (B11XXX, B111XXX, IS11XXX) + **județ** → then category → then VIN.
- **Us:** We start with vehicle form; VIN lookup then fills plate and rest. We have licence plate and address (including county) but not as first input.
- **InsureTech:** We have `GET /online/vehicles?VIN=...`. Need to confirm in **InsureTech documentation** whether there is a **vehicle lookup by licence plate (+ county)** (e.g. `GET /online/vehicles?plateNo=...&countyId=...`). If yes, we can do plate-first flow; if no, we keep VIN as the key for DRPCIV and can still put **număr auto + județ** first for UX, then ask VIN for technical data.

**Actions:**

1. **Check InsureTech docs** for any endpoint that accepts `plateNo` / `licensePlate` (+ county) for vehicle lookup.
2. **If plate lookup exists:** Add Step 0: "Număr auto" + "Județ" (dropdown from `/online/address/utils/counties`), validate plate format (B11XXX, B111XXX, IS11XXX), then call API and prefill vehicle (and optionally go to category → VIN step).
3. **If only VIN exists:** Keep VIN as source of truth; optionally add a **first screen**: "Număr auto" + "Județ" (informational / for display only), then "Serie șasiu (VIN)" for căutare. No change to API calls.

---

### 3.2 Licence plate format validation

- **RCA.RO:** "Numarul trebuie sa fie de forma B11XXX , B111XXX sau IS11XXX."
- **Us:** We have a free-text licence plate; no format validation.

**Actions:**

1. Add **client-side validation** for Romanian plate formats (e.g. regex for B + 2 or 3 digits + 3 letters; IS + 2 digits + 3 letters; extend if docs list more).
2. Show clear error message (e.g. "Număr auto invalid. Formate: B11XXX, B111XXX, IS11XXX.").

---

### 3.3 Vehicle category: match RCA.RO labels

- **RCA.RO:** Autoturism, autoutilitară, moto, remorcă.
- **Us:** We use InsureTech `categoryId` / `subcategoryId` from `/online/vehicles/categories` and subcategories.

**Actions:**

1. **Map** our category/subcategory IDs and names to RCA.RO-style labels (autoturism, autoutilitară, moto, remorcă) for display if needed.
2. Keep sending `vehicleCategoryId` / `vehicleSubCategoryId` in order and offers as per InsureTech V3.

---

### 3.4 Order of inputs: plate → category → VIN → person

- **RCA.RO:** 1) Număr auto + Județ → 2) Categoria → 3) Serie șasiu (VIN) → 4) CNP/CUI+CAEN.
- **Us:** One step: vehicle (VIN, plate, category, make, model, …) + person + date + periods.

**Actions:**

1. **Option A (minimal):** Keep single "Vehicul & Proprietar" step but reorder fields: **Număr auto** (with validation) → **Județ** (from address utils) → **Categoria** → **Serie șasiu (VIN)** + buton "Caută" → rest of vehicle (prefilled by VIN) → then Proprietar/Utilizator, Data început, Perioade. This mirrors RCA.RO without changing number of steps.
2. **Option B (wizard match):** Split into 4 sub-steps or 4 wizard steps: (1) Număr auto + Județ, (2) Categoria vehicul, (3) Serie șasiu + preluare date DRPCIV, (4) Date proprietar (CNP/ CUI+CAEN) + data început + perioade. Consent and Compare/Plata stay as today.

Recommendation: start with **Option A** (same step, reordered fields); move to Option B if you want 1:1 step count with RCA.RO.

---

### 3.5 Periods: 1, 2, 3, 6, 12 luni

- **RCA.RO:** Compare prețuri for **1, 2, 3, 6 sau 12 luni**.
- **Us:** We request **12** + **one secondary period** (1–11) and show 4 columns (12 fără/cu, P2 fără/cu).

**Actions:**

1. **InsureTech:** Confirm in docs that `periodMonths` in offer request can be e.g. `['1','2','3','6','12']` and that response includes one offer (or variant) per period.
2. **UI:** Either keep current "12 + a doua perioadă" or allow **multiple selection** (e.g. 1, 2, 3, 6, 12) and show one column per selected period (fără/cu decontare if backend supports it). Depends on backend contract and response size.

---

### 3.6 Decontare directă (critical)

- **RCA.RO:** "Asigurarea standard" vs "RCA cu decontare directă" (puțin mai scumpă); both visible in comparison.
- **Us:** We show 4 columns (12 fără/cu, P2 fără/cu) but **"cu decontare" columns are empty** because InsureTech V3 offer response does not (in current use) return `policyPremiumWithDirectSettlement` / `directSettlement` / `withDirectSettlement` per offer.

**Actions:**

1. **Backend/contract:** With InsureTech, confirm whether **V3** (`POST /online/offers/rca/v3`) is supposed to return for each product/period:
   - `policyPremium` (standard) and  
   - `policyPremiumWithDirectSettlement` or `directSettlement.premium` (cu decontare),  
   and whether a request parameter (e.g. in `specificFields` or body) is required to get direct-settlement prices. If V3 does not support it, ask if the non-V3 RCA offers endpoint returns 4 variants per product (first/second month × with/without direct settlement) and whether we should use that for comparison.
2. **Frontend:** Once backend returns both variants, we already have:
   - Normalisation of `policyPremiumWithDirectSettlement` / `directSettlement.premium` / `withDirectSettlement` in `normalizeRcaOffer`.
   - Table and selection logic for "fără" vs "cu" decontare.  
   So no UI change needed beyond ensuring we display whatever the API sends.

---

### 3.7 Consent

- **RCA.RO:** Not described in the public flow.
- **Us:** We have a consent step (InsureTech consent API) before generating offers.

**Action:** Keep consent step as required by InsureTech; no replication change.

---

### 3.8 Payment and policy by email

- **RCA.RO:** "Plătești online cu cardul și primești asigurarea auto obligatorie instant, pe email."
- **Us:** We have payment redirect and callback; policy creation is called on success.

**Actions:**

1. **Callback/success page:** After policy creation, show a clear message: e.g. "Polița RCA a fost emisă. Vei primi polița electronică pe email." (and/or document download if we have it).
2. **Docs:** Verify in InsureTech docs how policy document / email is triggered (e.g. automatic on policy creation or separate call).

---

### 3.9 Documents (PF/PJ)

- **RCA.RO:** PF: talon, CI proprietar, permis; PJ: talon, CI șofer, permis, CUI, CAEN.
- **Us:** We collect equivalent data (owner/user, CIF/CNP, address, driver licence date, etc.); PersonForm supports PJ and CAEN.

**Action:** Ensure **CAEN** is clearly required for PJ in UI and validation (and sent in order). No new API assumption.

---

### 3.10 MyRCA / account and alerts

- **RCA.RO:** Cont MyRCA, polița salvată, alerte expirare RCA/ITP/Rovinietă.
- **Us:** No user account or alerts.

**Action:** Leave out of this replication plan (would require auth, profile, and possibly separate backend). Can be a later phase.

---

## 4. Implementation Priority

| Priority | Item | Dependency |
|----------|------|------------|
| **P0** | Decontare directă: get backend to return both standard and direct-settlement prices for V3 (or use correct endpoint) | InsureTech contract / backend |
| **P1** | Licence plate format validation (B11XXX, B111XXX, IS11XXX) | None |
| **P1** | Reorder Step 1: Număr auto → Județ → Categoria → VIN → rest + Proprietar | Optional: plate lookup API |
| **P2** | Check InsureTech docs for vehicle lookup by plate (+ county); if yes, add plate-first path | InsureTech docs |
| **P2** | Success/callback message: "Polița pe email" | None |
| **P3** | Optional: multiple period selection (1,2,3,6,12) and columns per period | Backend supports multiple periodMonths |
| **P3** | Split Step 1 into 4 sub-steps (plate → category → VIN → person) for 1:1 RCA.RO UX | None |

---

## 5. Documentation References

- **RCA.RO (public):** [https://www.rca.ro/](https://www.rca.ro/) – flow and FAQs.
- **InsureTech:** Your staging docs (e.g. `GET /online/documentation/rca`) and API base (e.g. `https://insuretech.staging.insuretech.ro/api/v1`). Key endpoints:
  - Order: `POST /online/offers/rca/order/v3`
  - Offers: `POST /online/offers/rca/v3?orderHash=...`
  - Vehicle: `GET /online/vehicles?VIN=...`
  - Address utils: counties, cities (for județ).

---

## 6. Next Steps

1. **Confirm with InsureTech** how to obtain direct-settlement prices (V3 vs other endpoint, request/response shape).
2. Implement **plate format validation** and **reordered Step 1** (număr auto, județ, categorie, VIN, rest, proprietar).
3. Add **success message** for policy-by-email on payment callback.
4. If plate lookup exists in docs, add **plate-first** optional path and wire it to existing VIN/order flow.

This plan keeps our implementation aligned with InsureTech while replicating the RCA.RO user journey as closely as the API allows.
