"use client";

import { useState, useEffect, useRef } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import { api } from "@/lib/api/client";
import type { PersonRequest } from "@/types/insuretech";
import { formatDateTime, calculatePolicyEndDate } from "@/lib/utils/formatters";
import { isPersonValid } from "@/lib/utils/formGuards";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";
import { autoSignConsent } from "@/lib/flows/consent";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildMalpraxisOrderPayload } from "@/lib/flows/payloadBuilders";
import DateInput from "@/components/shared/DateInput";
import { getArray } from "@/lib/utils/dto";
import { btn } from "@/lib/ui/tokens";

/* ---- Local design tokens (match PAD/Travel) ---- */
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

interface MalpraxisOffer {
  id: number;
  productId: number;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  installments?: { number: number; amount: number; dueDate: string }[];
  vendorLogo?: string;
  error?: boolean;
  message?: string | null;
  productDetails?: { id: number; productName: string; vendorDetails?: { commercialName: string; linkLogo?: string } };
}

interface Subcategory {
  type: string;
  name: string;
  comparatorId?: number;
  defaultLimit?: string;
}

interface Category {
  type: string;
  name: string;
  subcategories?: Subcategory[];
}

interface Profession {
  code: string;
  name: string;
  categories: Category[];
}

interface CodeName {
  code: string;
  name: string;
}

interface VendorSpecificDetail {
  code: string;
  type: string;
  mandatory: boolean;
  acceptedValues?: { name: string; code: string }[] | null;
  isInterval?: boolean;
  value?: string | null;
  valueTo?: string | null;
}

interface VendorSpecificGroup {
  productCode: string;
  details: VendorSpecificDetail[];
}

export default function MalpraxisPage() {
  // Utils
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [authorizationTypes, setAuthorizationTypes] = useState<CodeName[]>([]);
  const [moralDamagesLimits, setMoralDamagesLimits] = useState<CodeName[]>([]);
  const [retroactivePeriods, setRetroactivePeriods] = useState<CodeName[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [installmentsOptions, setInstallmentsOptions] = useState<number[]>([]);
  const [vendorSpecificDetails, setVendorSpecificDetails] = useState<VendorSpecificGroup[]>([]);
  const [products, setProducts] = useState<{ id: number; productName: string; vendorDetails?: { name: string; linkLogo?: string } }[]>([]);

  // Form
  const [professionId, setProfessionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [generalLimit, setGeneralLimit] = useState("");
  const [moralDamagesLimit, setMoralDamagesLimit] = useState("");
  const [currencyId, setCurrencyId] = useState("EUR");
  const [authorizationTypeCode, setAuthorizationTypeCode] = useState("");
  const [installmentsNo, setInstallmentsNo] = useState(1);
  const [retroactivePeriod, setRetroactivePeriod] = useState("");
  const [policyStartDate, setPolicyStartDate] = useState("");

  // Person
  const [insured, setInsured] = useState<PersonRequest>(emptyPersonPF());

  // Order
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Offers
  const [offers, setOffers] = useState<MalpraxisOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<MalpraxisOffer | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorOffers, setShowErrorOffers] = useState(false);

  // Prior liability toggles (vendor-specific)
  const [previousLiability, setPreviousLiability] = useState(false);
  const [previousLiabilityDamages, setPreviousLiabilityDamages] = useState(false);

  // GDPR & DNT
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showDntSubstep, setShowDntSubstep] = useState(false);

  // Download state (per-card)
  const [downloadingOfferId, setDownloadingOfferId] = useState<number | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  // Guard against double offer generation
  const generatingRef = useRef(false);

  const { currentStep, next, prev, goTo } = useWizard(4);

  const selectedProfession = professions.find((p) => p.code === professionId);
  const categories = selectedProfession?.categories || [];
  const selectedCategory = categories.find((c) => c.type === categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  // A category needs a subcategory picker if it has >1 subcategory OR 1 subcategory with a different type
  const needsSubcategory =
    subcategories.length > 1 ||
    (subcategories.length === 1 && subcategories[0].type !== selectedCategory?.type);
  const selectedSubcategory = subcategories.find((s) => s.type === subcategoryId);
  // The effective subcategory resolved for the API
  const effectiveSubcategory = needsSubcategory
    ? selectedSubcategory
    : selectedCategory?.subcategories?.[0];
  const effectiveCategoryType = effectiveSubcategory?.type || categoryId;
  const effectiveComparatorId = effectiveSubcategory?.comparatorId;

  const isMalpraxisDetailsValid =
    !!professionId &&
    !!categoryId &&
    (!needsSubcategory || !!subcategoryId) &&
    !!generalLimit &&
    !!moralDamagesLimit &&
    !!authorizationTypeCode &&
    !!currencyId &&
    !!retroactivePeriod &&
    !!policyStartDate;
  const isInsuredStepValid = isPersonValid(insured);

  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/malpraxis/comparator/utils")
      .then((data) => {
        setProfessions(getArray<Profession>(data.profession));
        setAuthorizationTypes(getArray<CodeName>(data.operatingAuthorizationType));
        setMoralDamagesLimits(getArray<CodeName>(data.moralDamagesLimit));
        setRetroactivePeriods(getArray<CodeName>(data.retroactivePeriod));
        setCurrencies(getArray<string>(data.currency));
        setInstallmentsOptions(getArray<number>(data.installmentsNo));
        setVendorSpecificDetails(getArray<VendorSpecificGroup>(data.vendorSpecificDetails));
      })
      .catch(() => setError("Nu am putut incarca utilitarele Malpraxis"));
    api
      .get<{ id: number; productName: string; vendorDetails?: { name: string; linkLogo?: string } }[]>(
        "/online/products/malpraxis"
      )
      .then(setProducts)
      .catch(() => setError("Nu am putut incarca produsele Malpraxis"));
  }, []);

  /* ---- Clear stale offer/order when navigating back ---- */
  useEffect(() => {
    if (currentStep < 2) {
      setOffers([]);
      setOrderId(null);
      setOrderHash(null);
      setSelectedOffer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  /* ---- Auto-generate offers when reaching step 3 (index 2) ---- */
  useEffect(() => {
    if (currentStep === 2 && offers.length === 0 && !loadingOffers) {
      handleCreateOrderAndOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const tomorrowDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const policyEndDate = policyStartDate
    ? formatDateTime(calculatePolicyEndDate(new Date(policyStartDate)))
    : "";

  const handleCreateOrderAndOffers = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setError(null);
    setLoadingOffers(true);

    try {
      // Auto-sign consent in the background (required by v3 order API)
      try {
        await autoSignConsent(insured, "MALPRAXIS");
      } catch (consentErr) {
        console.error("[Malpraxis] consent submission failed:", consentErr);
      }

      const offerDetails = {
        malpraxisProfessionId: String(effectiveComparatorId ?? professionId),
        category: String(effectiveComparatorId ?? effectiveCategoryType),
        categoryType: effectiveCategoryType,
        generalLimit: String(Number(generalLimit) || 0),
        customMoralDamagesLimit: Number(moralDamagesLimit) || 0,
        moralDamagesLimit: Number(moralDamagesLimit) || 0,
        currency: currencyId,
        operatingAuthorizationType: Number(authorizationTypeCode) || 0,
        installmentsNo,
        retroactivePeriod: String(Number(retroactivePeriod) || 0),
      };

      // Build vendor-specific details with smart defaults (deduplicate by code)
      // V3 docs: value must always be string
      const specificDetails: { code: string; value: string }[] = [];
      const seenCodes = new Set<string>();
      for (const group of vendorSpecificDetails) {
        for (const detail of group.details) {
          if (seenCodes.has(detail.code)) continue;
          seenCodes.add(detail.code);
          if (detail.code === "OPERATING_LICENSE_TYPE") {
            specificDetails.push({ code: detail.code, value: authorizationTypeCode });
          } else if (detail.code === "EVENT_LIMIT_INSURED_AMOUNT") {
            specificDetails.push({ code: detail.code, value: String(Number(generalLimit) || 0) });
          } else if (detail.code === "SUBLIMIT_MORAL_DAMAGE_PER_EVENT") {
            const moralPct = Number(moralDamagesLimit) || 0;
            specificDetails.push({ code: detail.code, value: String(Math.round((Number(generalLimit) || 0) * moralPct / 100)) });
          } else if (detail.code === "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD") {
            const moralPct = Number(moralDamagesLimit) || 0;
            specificDetails.push({ code: detail.code, value: String(Math.round((Number(generalLimit) || 0) * moralPct / 100)) });
          } else if (detail.code === "PREVIOUS_CIVIL_LIABILITY") {
            specificDetails.push({ code: detail.code, value: previousLiability ? "DA" : "NU" });
          } else if (detail.code === "PRIOR_CIVIL_LIABILITY_DAMAGES") {
            specificDetails.push({ code: detail.code, value: previousLiabilityDamages ? "DA" : "NU" });
          }
        }
      }

      const startDateFormatted = formatDateTime(new Date(policyStartDate));

      // Derive dateOfBirth from CNP for PF insured + normalize streetTypeId
      const insuredWithDob: PersonRequest = {
        ...insured,
        address: { ...insured.address, streetTypeId: insured.address.streetTypeId ?? 1 },
        ...(insured.legalType === "PF" && insured.cif
          ? { dateOfBirth: dateOfBirthFromCNP(String(insured.cif)) }
          : {}),
      };

      // Check eligibility to filter products (V3 docs: productIds as string[])
      let eligibleProductIds = products.map((p) => p.id);
      let ineligibleOffers: MalpraxisOffer[] = [];
      try {
        const eligible = await api.post<{ productId: number; isEligible: boolean; reason: string | null }[]>(
          `/online/offers/malpraxis/comparator/products/eligible`,
          { clientId: Number(insured.cif) || 0, productIds: eligibleProductIds.map(String), policyStartDate: startDateFormatted, policyEndDate, offerDetails }
        );
        const eligibleOnly = eligible.filter((p) => p.isEligible);
        if (eligibleOnly.length > 0) eligibleProductIds = eligibleOnly.map((p) => p.productId);
        // Collect ineligible products to show in "Oferte indisponibile"
        ineligibleOffers = eligible
          .filter((p) => !p.isEligible && p.reason)
          .map((p) => {
            const prod = products.find((pr) => pr.id === p.productId);
            const vName = prod?.vendorDetails?.name || "";
            return {
              id: 0,
              productId: p.productId,
              productName: vName ? `${vName} Malpraxis` : "Malpraxis",
              vendorName: vName,
              vendorLogo: undefined,
              policyPremium: 0,
              currency: "RON",
              error: true,
              message: p.reason,
            };
          });
      } catch {
        /* fall back to all products */
      }

      const { order, offers: results } = await createOrderAndOffers({
        orderPayload: buildMalpraxisOrderPayload(insuredWithDob),
        fetchBodies: (createdOrder) =>
          api.post<Record<string, unknown>[]>(
            `/online/offers/malpraxis/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
            {
              orderId: createdOrder.id,
              productIds: eligibleProductIds,
              policyStartDate: startDateFormatted,
              policyEndDate,
              offerDetails,
              specificDetails,
            }
          ),
        fetchOffer: async (body, createdOrder) => {
          const result = await api.post<MalpraxisOffer[]>(
            `/online/offers/malpraxis/comparator/v3?orderHash=${createdOrder.hash}`,
            body
          );
          // API returns an array — take the first element
          const offer = Array.isArray(result) ? result[0] : (result as unknown as MalpraxisOffer);
          // Look up product info from our products list as fallback
          const bodyProductId = (body as Record<string, unknown>).productId;
          const prod = products.find((p) => p.id === offer?.productDetails?.id || p.id === bodyProductId);
          const vendorName = offer.productDetails?.vendorDetails?.commercialName || prod?.vendorDetails?.name || "";
          const logo = offer.productDetails?.vendorDetails?.linkLogo;
          return {
            ...offer,
            productName: vendorName ? `${vendorName} Malpraxis` : (prod?.productName || "Malpraxis"),
            vendorName,
            vendorLogo: logo || undefined,
          };
        },
        mapOfferError: (body, err) => {
          const pid = Number((body as Record<string, unknown>).productId || 0);
          const prod = products.find((p) => p.id === pid);
          const vName = prod?.vendorDetails?.name || "";
          return {
            id: 0,
            productId: pid,
            productName: vName ? `${vName} Malpraxis` : "Malpraxis",
            vendorName: vName,
            vendorLogo: undefined,
            policyPremium: 0,
            currency: "RON",
            error: true,
            message: err instanceof Error ? err.message : "Eroare generare oferta",
          };
        },
      });

      // Deduplicate: collect all productIds already covered by comparator results
      const coveredProductIds = new Set(results.map((r) => r.productId));

      // Detect products that were eligible but silently dropped by bodies endpoint
      const droppedOffers: MalpraxisOffer[] = eligibleProductIds
        .filter((pid) => !coveredProductIds.has(pid))
        .map((pid) => {
          coveredProductIds.add(pid);
          const prod = products.find((p) => p.id === pid);
          const vName = prod?.vendorDetails?.name || "";
          return {
            id: 0,
            productId: pid,
            productName: vName ? `${vName} Malpraxis` : "Malpraxis",
            vendorName: vName,
            vendorLogo: undefined,
            policyPremium: 0,
            currency: "RON",
            error: true,
            message: "Produsul nu este disponibil pentru configuratia selectata",
          };
        });

      // Filter out ineligible offers for products already covered
      const uniqueIneligible = ineligibleOffers.filter((o) => !coveredProductIds.has(o.productId));

      setOrderId(order.id);
      setOrderHash(order.hash);

      // Deduplicate error offers by vendor name (same vendor may have multiple productIds)
      const allOffers = [...results, ...droppedOffers, ...uniqueIneligible];
      const seenErrorVendors = new Set<string>();
      const deduped = allOffers.filter((o) => {
        if (!o.error) return true; // keep all valid offers
        if (seenErrorVendors.has(o.vendorName)) return false;
        seenErrorVendors.add(o.vendorName);
        return true;
      });
      setOffers(deduped);
    } catch (err) {
      const apiErr = err as { message?: string; data?: unknown };
      const detail = apiErr.data ? JSON.stringify(apiErr.data) : "";
      setError(`${apiErr.message || "Eroare la crearea comenzii"}${detail ? ` | ${detail}` : ""}`);
    } finally {
      generatingRef.current = false;
      setLoadingOffers(false);
    }
  };

  const validOffers = offers.filter((o) => !o.error);
  const errorOffers = offers.filter((o) => o.error);

  const handleDownloadOfferDoc = async (offerId: number, cardKey: string) => {
    if (!orderHash) return;
    setDownloadingOfferId(offerId);
    setDownloadErrors((prev) => { const copy = { ...prev }; delete copy[cardKey]; return copy; });
    try {
      const res = await api.get<{ url?: string }>(
        `/online/offers/${offerId}/document/v3?orderHash=${orderHash}`
      );
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        setDownloadErrors((prev) => ({ ...prev, [cardKey]: "Documentul nu este disponibil momentan." }));
      }
    } catch {
      setDownloadErrors((prev) => ({ ...prev, [cardKey]: "Eroare la descarcarea documentului." }));
    } finally {
      setDownloadingOfferId(null);
    }
  };

  const handleRetry = () => {
    setOffers([]);
    setOrderId(null);
    setOrderHash(null);
    setSelectedOffer(null);
    setError(null);
    setShowErrorOffers(false);
    handleCreateOrderAndOffers();
  };

  const steps = [
    {
      title: "Detalii Malpraxis",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Profesie</label>
                <select
                  className={selectCls}
                  value={professionId}
                  onChange={(e) => {
                    setProfessionId(e.target.value);
                    setCategoryId("");
                    setSubcategoryId("");
                  }}
                >
                  <option value="">Selecteaza profesia</option>
                  {professions.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Categorie</label>
                <select
                  className={selectCls}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId("");
                    // Auto-fill generalLimit from defaultLimit if category has a single subcategory
                    const cat = categories.find((c) => c.type === e.target.value);
                    const subs = cat?.subcategories || [];
                    if (subs.length === 1 && subs[0].defaultLimit) {
                      setGeneralLimit(subs[0].defaultLimit);
                    }
                  }}
                >
                  <option value="">Selecteaza categoria</option>
                  {categories.map((c) => (
                    <option key={c.type} value={c.type}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {needsSubcategory && (
              <div>
                <label className={labelCls}>Specialitate</label>
                <select
                  className={selectCls}
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    // Pre-fill generalLimit from subcategory defaultLimit
                    const sub = subcategories.find((s) => s.type === e.target.value);
                    if (sub?.defaultLimit) {
                      setGeneralLimit(sub.defaultLimit);
                    }
                  }}
                >
                  <option value="">Selecteaza specialitatea</option>
                  {subcategories.map((s) => (
                    <option key={s.type} value={s.type}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Limita generala (suma asigurata)</label>
                <input
                  type="text"
                  className={inputCls}
                  value={generalLimit}
                  onChange={(e) => setGeneralLimit(e.target.value)}
                  placeholder="ex: 50000"
                />
              </div>
              <div>
                <label className={labelCls}>Limita daune morale</label>
                <select
                  className={selectCls}
                  value={moralDamagesLimit}
                  onChange={(e) => setMoralDamagesLimit(e.target.value)}
                >
                  <option value="">Selecteaza</option>
                  {moralDamagesLimits.map((m) => (
                    <option key={m.code} value={m.code}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Tip autorizatie</label>
                <select
                  className={selectCls}
                  value={authorizationTypeCode}
                  onChange={(e) => setAuthorizationTypeCode(e.target.value)}
                >
                  <option value="">Selecteaza</option>
                  {authorizationTypes.map((a) => (
                    <option key={a.code} value={a.code}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Moneda</label>
                <select
                  className={selectCls}
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                >
                  {currencies.length > 0 ? currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  )) : (
                    <option value={currencyId}>{currencyId}</option>
                  )}
                </select>
              </div>
              <div>
                <label className={labelCls}>Perioada retroactiva</label>
                <select
                  className={selectCls}
                  value={retroactivePeriod}
                  onChange={(e) => setRetroactivePeriod(e.target.value)}
                >
                  <option value="">Selecteaza</option>
                  {retroactivePeriods.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Numar rate</label>
                <select
                  className={selectCls}
                  value={installmentsNo}
                  onChange={(e) => setInstallmentsNo(Number(e.target.value))}
                >
                  {installmentsOptions.map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "rata" : "rate"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Data inceput polita</label>
                <DateInput
                  value={policyStartDate}
                  min={tomorrowDate}
                  onChange={(v) => setPolicyStartDate(v)}
                />
              </div>
            </div>

            {/* Prior liability toggles (vendor-specific for ABC Insurance) */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previousLiability}
                  onChange={(e) => setPreviousLiability(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">Raspundere civila anterioara</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previousLiabilityDamages}
                  onChange={(e) => setPreviousLiabilityDamages(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">Daune raspundere civila anterioara</span>
              </label>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => isMalpraxisDetailsValid && next()}
              disabled={!isMalpraxisDetailsValid}
              className={`${btn.primary} px-8`}
            >
              <span className="flex items-center gap-2">
                Continua
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Date Asigurat",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {!showDntSubstep ? (
            <>
              <PersonForm value={insured} onChange={setInsured} title="Asigurat (medic)" />

              {/* GDPR notice */}
              <div className="flex items-start gap-3 rounded-xl bg-blue-50/60 p-4">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-sm text-gray-600">
                  Apasand <strong>Continua</strong>, sunteti de acord cu prelucrarea datelor personale
                  conform legislatiei europene GDPR si a legilor asigurarilor.{" "}
                  <button
                    type="button"
                    onClick={() => setShowGdprModal(true)}
                    className="font-semibold text-[#2563EB] underline hover:text-blue-700"
                  >
                    Detalii
                  </button>
                </p>
              </div>

              {/* GDPR details modal */}
              {showGdprModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Politica de prelucrare a datelor personale
                      </h3>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                      <p>
                        In conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastra personale
                        sunt prelucrate in scopul ofertarii si emiterii politelor de asigurare.
                      </p>
                      <p>
                        Datele colectate (CNP/CUI, email, date personale) sunt transmise catre societatile
                        de asigurare partenere exclusiv in scopul generarii ofertelor si emiterii politei selectate.
                      </p>
                      <p>
                        Aveti dreptul de acces, rectificare, stergere si portabilitate a datelor, precum si
                        dreptul de a va opune prelucrarii. Pentru exercitarea acestor drepturi, ne puteti
                        contacta la adresa de email indicata pe site.
                      </p>
                      <p>
                        Datele sunt stocate pe durata necesara indeplinirii scopului prelucrarii si conform
                        cerintelor legale aplicabile in domeniul asigurarilor.
                      </p>
                    </div>
                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => setShowGdprModal(false)}
                        className={`${btn.primary} px-8`}
                      >
                        Am inteles
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button type="button" onClick={prev} className={`${btn.secondary} px-8`}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Inapoi
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => isInsuredStepValid && setShowDntSubstep(true)}
                  disabled={!isInsuredStepValid}
                  className={`${btn.primary} px-8`}
                >
                  <span className="flex items-center gap-2">
                    Continua
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <DntChoice productLabel="Malpraxis" onContinueDirect={() => { setShowDntSubstep(false); next(); }} onBack={() => setShowDntSubstep(false)} />
          )}
        </div>
      ),
    },
    {
      title: "Oferte",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {loadingOffers && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
              <span className="text-sm">Se genereaza ofertele...</span>
            </div>
          )}
          {!loadingOffers && offers.length === 0 && !error && (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
              <span className="text-sm">Se pregatesc ofertele...</span>
            </div>
          )}
          {validOffers.length > 0 && (
            <>
              <h3 className="text-center text-lg font-semibold text-gray-900">Oferte Malpraxis disponibile</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {validOffers.map((offer, i) => {
                  const cardKey = offer.id ? String(offer.id) : `offer-${i}`;
                  return (
                    <OfferCard
                      key={offer.id || i}
                      productName={offer.productName}
                      vendorName={offer.vendorName}
                      vendorLogo={offer.vendorLogo}
                      premium={offer.policyPremium}
                      currency={offer.currency}
                      installments={offer.installments?.map((inst) => ({
                        installmentNo: inst.number,
                        amount: inst.amount,
                        dueDate: inst.dueDate,
                      }))}
                      selected={selectedOffer?.id === offer.id}
                      onSelect={() => { setSelectedOffer(offer); next(); }}
                      onDownload={offer.id ? () => handleDownloadOfferDoc(offer.id, cardKey) : undefined}
                      downloading={downloadingOfferId === offer.id}
                      downloadError={downloadErrors[cardKey]}
                    />
                  );
                })}
              </div>
            </>
          )}
          {/* Collapsible error offers */}
          {errorOffers.length > 0 && !loadingOffers && (
            <div className="rounded-xl border border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowErrorOffers(!showErrorOffers)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <span>Oferte indisponibile ({errorOffers.length})</span>
                <svg className={`h-4 w-4 transition-transform ${showErrorOffers ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showErrorOffers && (
                <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                  {errorOffers.map((offer, i) => (
                    <OfferCard
                      key={`err-${offer.productId}-${i}`}
                      productName={offer.productName}
                      vendorName={offer.vendorName}
                      vendorLogo={offer.vendorLogo}
                      premium={0}
                      currency={offer.currency}
                      error={offer.message || "Eroare"}
                      selected={false}
                      onSelect={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Navigation & retry */}
          {!loadingOffers && (
            <div className="flex justify-center gap-3">
              <button type="button" onClick={prev} className={`${btn.secondary} px-6`}>
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Inapoi
                </span>
              </button>
              {(error || (offers.length > 0 && validOffers.length === 0)) && (
                <button type="button" onClick={handleRetry} className={`${btn.secondary} px-6`}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Reincearca
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Plata",
      content: selectedOffer && orderId && orderHash ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <PaymentFlow
            orderId={orderId}
            offerId={selectedOffer.id}
            orderHash={orderHash}
            amount={selectedOffer.policyPremium}
            currency={selectedOffer.currency}
            productType="MALPRAXIS"
            customerEmail={insured.email}
            onBack={prev}
          />
        </div>
      ) : (
        <p className="text-center text-gray-500">Selectati mai intai o oferta.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Asigurare Malpraxis Medical</h2>
        <p className="mt-0.5 text-sm text-gray-500">Protectie profesionala pentru personalul medical</p>
      </div>
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
      {error && (
        <div className="mt-6 mx-auto max-w-2xl flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
