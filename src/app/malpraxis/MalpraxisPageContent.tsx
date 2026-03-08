"use client";

import { useState, useEffect, useRef } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import { api } from "@/lib/api/client";
import type { PersonRequest } from "@/types/insuretech";
import { calculatePolicyEndDate } from "@/lib/utils/formatters";
import { isPersonValid } from "@/lib/utils/formGuards";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";
import { autoSignConsent } from "@/lib/flows/consent";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildMalpraxisOrderPayload } from "@/lib/flows/payloadBuilders";
import DateInput from "@/components/shared/DateInput";
import { getArray } from "@/lib/utils/dto";
import { btn } from "@/lib/ui/tokens";
import {
  MALPRAXIS_TRACE_HEADER,
  createMalpraxisTraceId,
  logMalpraxisTrace,
  serializeTraceError,
} from "@/lib/debug/malpraxisTrace";

/* ---- Local design tokens (match PAD/Travel) ---- */
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

const normalizeVendorKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const isPharmacistSelection = (...values: Array<string | undefined>) => values.some((value) => /farmac/i.test(value || ""));
const MALPRAXIS_VENDOR_MATRIX = {
  none: {
    noRetro: ["omniasig", "asirom", "signalidunaasigurari", "garanta", "uniqa", "abc", "euroins"],
    retro12Or24: ["omniasig", "asirom", "garanta"],
    retro36: ["omniasig", "asirom"],
  },
  percent: {
    noRetro: ["omniasig", "signalidunaasigurari", "garanta"],
    retro12Or24: ["omniasig", "garanta"],
    retro36: ["omniasig"],
  },
} as const;

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

interface MalpraxisPageContentProps {
  debugEnabled?: boolean;
}

export default function MalpraxisPage({ debugEnabled = false }: MalpraxisPageContentProps) {
  // Utils
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [authorizationTypes, setAuthorizationTypes] = useState<CodeName[]>([]);
  const [moralDamagesLimits, setMoralDamagesLimits] = useState<CodeName[]>([]);
  const [retroactivePeriods, setRetroactivePeriods] = useState<CodeName[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [installmentsOptions, setInstallmentsOptions] = useState<number[]>([]);
  const [, setVendorSpecificDetails] = useState<VendorSpecificGroup[]>([]);
  const [products, setProducts] = useState<{ id: number; productName: string; vendorDetails?: { name: string; linkLogo?: string } }[]>([]);

  // Form
  const [professionId, setProfessionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [generalLimit, setGeneralLimit] = useState("");
  const [moralDamagesLimit, setMoralDamagesLimit] = useState("");
  const [customMoralDamagesLimitValue, setCustomMoralDamagesLimitValue] = useState("");
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
  const [debugTraceId, setDebugTraceId] = useState<string | null>(null);

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
  const activeRunIdRef = useRef(0);

  const { currentStep, next, prev, goTo } = useWizard(4);
  const [showErrors, setShowErrors] = useState(false);

  const logClientTrace = (
    traceId: string | null,
    phase: string,
    payload?: unknown,
    extra?: { path?: string; status?: number; durationMs?: number }
  ) => {
    logMalpraxisTrace(
      {
        traceId,
        phase,
        path: extra?.path,
        status: extra?.status,
        durationMs: extra?.durationMs,
        payload,
      },
      debugEnabled
    );
  };

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
  const isInsuredStepValid = isPersonValid(insured, { skipIdDocument: true });

  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/malpraxis/comparator/utils")
      .then((data) => {
        setProfessions(getArray<Profession>(data.profession));
        setAuthorizationTypes(getArray<CodeName>(data.operatingAuthorizationType));
        setMoralDamagesLimits(
          getArray<CodeName>(data.moralDamagesLimit)
            .map((m) => m.name === "Fara" ? { ...m, name: "Fără" } : m)
            .sort((a, b) => {
              const na = parseFloat(a.name);
              const nb = parseFloat(b.name);
              if (isNaN(na) && isNaN(nb)) return 0;
              if (isNaN(na)) return 1;
              if (isNaN(nb)) return -1;
              return na - nb;
            })
        );
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
      setDebugTraceId(null);
      setSelectedOffer(null);
    }
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
    ? (() => {
        const end = calculatePolicyEndDate(new Date(policyStartDate));
        // Use UTC date components to avoid timezone offset (T02:00:00 → T00:00:00)
        const y = end.getUTCFullYear();
        const m = String(end.getUTCMonth() + 1).padStart(2, "0");
        const d = String(end.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}T00:00:00`;
      })()
    : "";

  const handleCreateOrderAndOffers = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setError(null);
    setLoadingOffers(true);

    const runId = ++activeRunIdRef.current;
    const currentTraceId = createMalpraxisTraceId();
    const traceHeaders = { [MALPRAXIS_TRACE_HEADER]: currentTraceId };
    setDebugTraceId(currentTraceId);

    try {
      const insuredWithDob: PersonRequest = {
        ...insured,
        address: { ...insured.address, streetTypeId: insured.address.streetTypeId ?? 1 },
        ...(insured.legalType === "PF" && insured.cif
          ? { dateOfBirth: dateOfBirthFromCNP(String(insured.cif)) }
          : {}),
      };

      const isNumericMoralDamagesMode = customMoralDamagesLimitValue.trim().length > 0;
      const retroactivityGroup = retroactivePeriod === "36"
        ? "retro36"
        : retroactivePeriod === "12" || retroactivePeriod === "24"
          ? "retro12Or24"
          : "noRetro";
      const moralDamagesMode = moralDamagesLimit === "0" ? "none" : "percent";
      const allowedVendorKeys: Set<string> | null = isNumericMoralDamagesMode
        ? null
        : new Set(MALPRAXIS_VENDOR_MATRIX[moralDamagesMode][retroactivityGroup]);
      const pharmacistContext = isPharmacistSelection(
        selectedProfession?.name,
        selectedCategory?.name,
        selectedCategory?.type,
        selectedSubcategory?.name,
        selectedSubcategory?.type
      );
      const candidateProducts = products.filter((product) => {
        const vendorKey = normalizeVendorKey(product.vendorDetails?.name || "");
        if (!vendorKey) {
          return false;
        }

        if (vendorKey === "omniasig") {
          const isPharmacistProduct = /farmac/i.test(product.productName || "");
          if (pharmacistContext !== isPharmacistProduct) {
            return false;
          }
        }

        return allowedVendorKeys ? allowedVendorKeys.has(vendorKey) : true;
      });
      const selectedProductIds = candidateProducts.map((product) => product.id);
      logClientTrace(currentTraceId, "client_snapshot", {
        selectedProfession: selectedProfession
          ? { code: selectedProfession.code, name: selectedProfession.name }
          : null,
        selectedCategory: selectedCategory
          ? { type: selectedCategory.type, name: selectedCategory.name }
          : null,
        selectedSubcategory: selectedSubcategory
          ? { type: selectedSubcategory.type, name: selectedSubcategory.name }
          : null,
        effectiveComparatorId,
        generalLimit,
        moralDamagesLimit,
        customMoralDamagesLimit: customMoralDamagesLimitValue,
        authorizationTypeCode,
        retroactivePeriod,
        installmentsNo,
        selectedProductIds,
        allowedVendors: allowedVendorKeys ? Array.from(allowedVendorKeys) : "eligibility-driven",
        pharmacistContext,
        isNumericMoralDamagesMode,
      });

      await autoSignConsent(insuredWithDob, "MALPRAXIS");

      const normalizedProfessionId = String(effectiveComparatorId ?? professionId);
      const normalizedCategory = selectedCategory?.type || categoryId;
      const normalizedGeneralLimit = generalLimit.trim();
      const normalizedOperatingAuthorizationType = Number.parseInt(authorizationTypeCode, 10);
      const normalizedRetroactivePeriod = retroactivePeriod;
      const offerDetails: Record<string, unknown> = {
        malpraxisProfessionId: normalizedProfessionId,
        category: normalizedCategory,
        categoryType: effectiveCategoryType,
        generalLimit: normalizedGeneralLimit,
        moralDamagesLimit: Number(moralDamagesLimit) || 0,
        customMoralDamagesLimit: customMoralDamagesLimitValue ? Number(customMoralDamagesLimitValue) : null,
        currency: currencyId,
        operatingAuthorizationType: Number.isFinite(normalizedOperatingAuthorizationType)
          ? normalizedOperatingAuthorizationType
          : 0,
        installmentsNo,
        retroactivePeriod: normalizedRetroactivePeriod,
      };
      logClientTrace(currentTraceId, "offer_details_normalized", { offerDetails });

      const moralPct = Number(moralDamagesLimit) || 0;
      const moralAmount = String(Math.round((Number(generalLimit) || 0) * moralPct / 100));
      const specificDetails: { code: string; value: string | null }[] = [
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: normalizedGeneralLimit || null },
        { code: "OPERATING_LICENSE_TYPE", value: authorizationTypeCode || "0" },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: moralAmount },
        { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: moralAmount },
        { code: "PREVIOUS_CIVIL_LIABILITY", value: previousLiability ? "DA" : "NU" },
        { code: "PRIOR_CIVIL_LIABILITY_DAMAGES", value: previousLiabilityDamages ? "DA" : "NU" },
      ];
      const mergeComparatorSpecificDetails = (bodySpecificDetails: unknown) => {
        const merged = new Map<string, Record<string, unknown>>();

        for (const detail of specificDetails) {
          merged.set(detail.code, { ...detail });
        }

        if (!Array.isArray(bodySpecificDetails)) {
          return Array.from(merged.values());
        }

        for (const entry of bodySpecificDetails) {
          if (!entry || typeof entry !== "object") {
            continue;
          }

          const detailRecord = entry as Record<string, unknown>;
          const code = typeof detailRecord.code === "string" ? detailRecord.code : "";
          if (!code) {
            continue;
          }

          const requestDetail = merged.get(code);
          const requestValue = requestDetail?.value;
          const entryValue = detailRecord.value;
          const shouldRestoreRequestValue =
            code === "EVENT_LIMIT_INSURED_AMOUNT" &&
            (entryValue === 0 || entryValue === "0" || entryValue == null || entryValue === "") &&
            requestValue != null &&
            requestValue !== "" &&
            requestValue !== 0 &&
            requestValue !== "0";

          merged.set(
            code,
            shouldRestoreRequestValue
              ? { ...detailRecord, value: requestValue }
              : { ...(requestDetail || {}), ...detailRecord }
          );
        }

        return Array.from(merged.values());
      };

      const startDateFormatted = `${policyStartDate}T00:00:00`;
      const requestedProductIds = selectedProductIds.map((productId) => String(productId));
      let eligibleProductIds = requestedProductIds;
      const eligibilityPath = "/online/offers/malpraxis/comparator/products/eligible";
      const eligibilityPayload = {
        clientId: Number(insured.cif) || 0,
        productIds: requestedProductIds,
        policyStartDate: startDateFormatted,
        policyEndDate,
        offerDetails,
      };
      let ineligibleOffers: MalpraxisOffer[] = [];

      try {
        logClientTrace(currentTraceId, "eligibility_request", eligibilityPayload, { path: eligibilityPath });
        const eligible = await api.post<{ productId: number; isEligible: boolean; reason: string | null }[]>(
          eligibilityPath,
          eligibilityPayload,
          traceHeaders
        );
        logClientTrace(currentTraceId, "eligibility_response", eligible, { path: eligibilityPath });
        const eligibleProductIdSet = new Set(
          eligible.filter((product) => product.isEligible).map((product) => String(product.productId))
        );
        eligibleProductIds = requestedProductIds.filter((productId) => eligibleProductIdSet.has(productId));
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
      } catch (eligibilityErr) {
        logClientTrace(
          currentTraceId,
          "eligibility_error",
          { error: serializeTraceError(eligibilityErr) },
          { path: eligibilityPath }
        );
      }

      if (eligibleProductIds.length === 0) {
        logClientTrace(currentTraceId, "offers_ready", { orderId: null, orderHash: null, offers: ineligibleOffers });
        setOffers(ineligibleOffers);
        return;
      }

      const { order, offers: results } = await createOrderAndOffers({
        orderPayload: buildMalpraxisOrderPayload(insuredWithDob),
        fetchBodies: async (createdOrder) => {
          const bodiesPath = "/online/offers/malpraxis/comparator/bodies/v3";
          const bodiesPayload = {
            orderId: createdOrder.id,
            productIds: eligibleProductIds,
            policyStartDate: startDateFormatted,
            policyEndDate,
            offerDetails,
            specificDetails,
          };

          logClientTrace(currentTraceId, "bodies_request", bodiesPayload, { path: bodiesPath });
          const bodies = await api.post<Record<string, unknown>[]>(
            `${bodiesPath}?orderHash=${createdOrder.hash}`,
            bodiesPayload,
            traceHeaders
          );
          logClientTrace(
            currentTraceId,
            "bodies_response",
            {
              bodies: bodies.map((body) => ({
                productId: body.productId,
                productCode: body.productCode,
                specificDetails: body.specificDetails,
              })),
            },
            { path: bodiesPath }
          );
          return bodies;
        },
        fetchOffer: async (body, createdOrder) => {
          const comparatorPath = "/online/offers/malpraxis/comparator/v3";
          const bodyObject = body as Record<string, unknown>;
          const comparatorPayload = {
            ...bodyObject,
            offerDetails: {
              ...((bodyObject.offerDetails as Record<string, unknown> | undefined) || {}),
              ...offerDetails,
            },
            specificDetails: mergeComparatorSpecificDetails(bodyObject.specificDetails),
          };

          logClientTrace(currentTraceId, "comparator_request", comparatorPayload, { path: comparatorPath });
          const result = await api.post<MalpraxisOffer[]>(
            `${comparatorPath}?orderHash=${createdOrder.hash}`,
            comparatorPayload,
            traceHeaders
          );
          logClientTrace(currentTraceId, "comparator_response", result, { path: comparatorPath });

          const offer = Array.isArray(result) ? result[0] : (result as unknown as MalpraxisOffer);
          const bodyProductId = Number(bodyObject.productId || 0);
          const responseProduct = (offer as { product?: Record<string, unknown> }).product;
          const responseVendorDetails = responseProduct?.vendorDetails as Record<string, unknown> | undefined;
          const resolvedProductId = Number(
            offer?.productId ||
            offer?.productDetails?.id ||
            responseProduct?.id ||
            bodyProductId ||
            0
          );
          const prod = products.find((product) => product.id === resolvedProductId || product.id === bodyProductId);
          const vendorName =
            offer.productDetails?.vendorDetails?.commercialName ||
            (responseVendorDetails?.commercialName as string | undefined) ||
            (responseVendorDetails?.name as string | undefined) ||
            prod?.vendorDetails?.name ||
            "";
          const logo =
            offer.productDetails?.vendorDetails?.linkLogo ||
            (responseVendorDetails?.linkLogo as string | undefined);
          const normalizedOffer = {
            ...offer,
            productId: resolvedProductId,
            productName: vendorName
              ? `${vendorName} Malpraxis`
              : ((responseProduct?.productName as string | undefined) || prod?.productName || "Malpraxis"),
            vendorName,
            vendorLogo: logo || undefined,
          };

          logClientTrace(currentTraceId, "normalized_offer", normalizedOffer, { path: comparatorPath });
          return normalizedOffer;
        },
        mapOfferError: (body, err) => {
          const bodyObject = body as Record<string, unknown>;
          logClientTrace(
            currentTraceId,
            "comparator_error",
            {
              productCode: bodyObject.productCode,
              error: serializeTraceError(err),
            },
            { path: "/online/offers/malpraxis/comparator/v3" }
          );
          const pid = Number(bodyObject.productId || 0);
          const prod = products.find((product) => product.id === pid);
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

      const coveredProductIds = new Set(results.map((result) => String(result.productId)));
      const droppedOffers: MalpraxisOffer[] = eligibleProductIds
        .filter((pid) => !coveredProductIds.has(pid))
        .map((pid) => {
          coveredProductIds.add(pid);
          const numericProductId = Number(pid);
          const prod = products.find((product) => product.id === numericProductId);
          const vName = prod?.vendorDetails?.name || "";
          return {
            id: 0,
            productId: numericProductId,
            productName: vName ? `${vName} Malpraxis` : "Malpraxis",
            vendorName: vName,
            vendorLogo: undefined,
            policyPremium: 0,
            currency: "RON",
            error: true,
            message: "Produsul nu este disponibil pentru configuratia selectata",
          };
        });

      const uniqueIneligible = ineligibleOffers.filter((offer) => !coveredProductIds.has(String(offer.productId)));

      if (runId !== activeRunIdRef.current) {
        return;
      }

      setOrderId(order.id);
      setOrderHash(order.hash);

      const allOffers = [...results, ...droppedOffers, ...uniqueIneligible];
      const seenErrorVendors = new Set(
        allOffers
          .filter((offer) => !offer.error)
          .map((offer) => normalizeVendorKey(offer.vendorName || offer.productName || ""))
          .filter(Boolean)
      );
      const deduped = allOffers.filter((offer) => {
        if (!offer.error) return true;
        const vendorKey = normalizeVendorKey(offer.vendorName || offer.productName || "");
        if (!vendorKey) return true;
        if (seenErrorVendors.has(vendorKey)) return false;
        seenErrorVendors.add(vendorKey);
        return true;
      });

      logClientTrace(currentTraceId, "offers_ready", {
        orderId: order.id,
        orderHash: order.hash,
        offers: deduped,
      });
      setOffers(deduped);
    } catch (err) {
      if (runId !== activeRunIdRef.current) {
        return;
      }
      logClientTrace(currentTraceId, "offer_generation_error", { error: serializeTraceError(err) });
      const apiErr = err as { message?: string; data?: unknown };
      const detail = apiErr.data ? JSON.stringify(apiErr.data) : "";
      setError(`${apiErr.message || "Eroare la crearea comenzii"}${detail ? ` | ${detail}` : ""}`);
    } finally {
      if (runId === activeRunIdRef.current) {
        generatingRef.current = false;
        setLoadingOffers(false);
      }
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
    setDebugTraceId(null);
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
            <div className="space-y-3">
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

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Suma asigurata</label>
                <input
                  type="text"
                  className={inputCls}
                  value={generalLimit}
                  onChange={(e) => setGeneralLimit(e.target.value)}
                  placeholder="ex: 50000"
                />
              </div>
              <div>
                <label className={labelCls}>Limita daune morale (%)</label>
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
              <div>
                <label className={labelCls}>Limita personalizata daune morale</label>
                <input
                  type="text"
                  className={inputCls}
                  value={customMoralDamagesLimitValue}
                  onChange={(e) => setCustomMoralDamagesLimitValue(e.target.value)}
                  placeholder={currencyId || "EUR"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
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
              <PersonForm value={insured} onChange={setInsured} title="Asigurat (medic)" hideIdDocument showErrors={showErrors} />

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
                  onClick={() => { if (isInsuredStepValid) { setShowErrors(false); setShowDntSubstep(true); } else { setShowErrors(true); } }}
                  disabled={false}
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
            debugTraceId={debugTraceId || undefined}
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










