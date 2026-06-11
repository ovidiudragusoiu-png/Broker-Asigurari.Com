"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import WizardStepper, { useWizardUrlSync } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import MalpraxisAgreementsForm from "@/components/malpraxis/MalpraxisAgreementsForm";
import { api } from "@/lib/api/client";
import {
  fetchOfferDocument,
  openDocumentInNewTab,
} from "@/lib/api/documentsClient";
import type { PersonRequest } from "@/types/insuretech";
import { calculatePolicyEndDate } from "@/lib/utils/formatters";
import { isPersonValid } from "@/lib/utils/formGuards";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";
import { MALPRAXIS_AGREEMENTS_INITIAL } from "@/lib/flows/malpraxisAgreementsCopy";
import { useConsentWizardPersistence } from "@/lib/flows/useConsentWizardPersistence";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildMalpraxisOrderPayload } from "@/lib/flows/payloadBuilders";
import {
  buildAbcClaimSpecificDetails,
  buildMalpraxisBodiesPayload,
  buildMalpraxisComparatorPayload,
  buildMalpraxisEligibilityPayload,
  buildMalpraxisOfferDetails,
  buildMalpraxisMoralSublimitValues,
  groupMalpraxisEligibilityBatches,
  inferMalpraxisProductCode,
  inferMalpraxisProductCodeByProductId,
  parseMalpraxisMoralDamagesSelection,
  type MalpraxisSpecificDetail,
} from "@/lib/flows/malpraxisOfferPayload";
import {
  buildMalpraxisProductMatrix,
  getIncludedProductIdsFromMatrix,
  mapMatrixExcludedToOffers,
} from "@/lib/flows/malpraxisProductMatrix";
import {
  fetchMalpraxisInsurerOffer,
  getInsurerRetryHintMessage,
  inferInsurerAdjustmentFields,
  mergeInsurerOverrideIntoInput,
  resolveInsurerOverride,
  type MalpraxisInsurerOverride,
} from "@/lib/flows/malpraxisInsurerRetry";
import MalpraxisInsurerRetryCard from "@/components/malpraxis/MalpraxisInsurerRetryCard";
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
/** Malpraxis offers use a single installment (field removed from UI). */
const MALPRAXIS_INSTALLMENTS_NO = 1;
const detailsErrBorder =
  "!border-red-300 focus:!border-red-500 focus:!ring-red-500/20";

function getMalpraxisDetailsMissingLabels(input: {
  professionId: string;
  categoryId: string;
  needsSubcategory: boolean;
  subcategoryId: string;
  generalLimit: string;
  moralDamagesLimit: string;
  authorizationTypeCode: string;
  currencyId: string;
  retroactivePeriod: string;
  policyStartDate: string;
}): string[] {
  const missing: string[] = [];
  if (!input.professionId.trim()) missing.push("Profesie");
  if (!input.categoryId.trim()) missing.push("Categorie");
  if (input.needsSubcategory && !input.subcategoryId.trim()) missing.push("Specialitate");
  if (!input.generalLimit.trim()) missing.push("Suma asigurata");
  if (!input.moralDamagesLimit.trim()) missing.push("Limita daune morale (%)");
  if (!input.authorizationTypeCode.trim()) missing.push("Tip autorizatie");
  if (!input.currencyId.trim()) missing.push("Moneda");
  if (!input.retroactivePeriod.trim()) missing.push("Perioada retroactiva");
  if (!input.policyStartDate.trim()) missing.push("Data inceput polita");
  return missing;
}

const normalizeVendorKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const isPharmacistSelection = (...values: Array<string | undefined>) => values.some((value) => /farmac/i.test(value || ""));
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

/** Maps Insuretech utils entries ({ id } or { value }) to dropdown { code, name }. */
function toCodeNameOptions(items: unknown): CodeName[] {
  return getArray<{ code?: string; value?: string | number; id?: string | number; name?: string }>(
    items
  )
    .map((item, index) => {
      const raw = item.code ?? item.value ?? item.id;
      const code = raw != null && raw !== "" ? String(raw) : `__missing-${index}`;
      const name =
        typeof item.name === "string" && item.name.trim() !== "" ? item.name : code;
      return { code, name };
    })
    .filter((item) => !item.code.startsWith("__missing-"));
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

const TRUST_BADGES = [
  "Autorizare ASF: RAJ506943",
  "Date securizate (SSL)",
  "Partener MaxyGo Broker de Asigurare SRL",
];
const REMAINING_BY_STEP = ["~2 min ramase", "~90 sec ramase", "~45 sec ramase", "Ultimul pas"];

export default function MalpraxisPage({ debugEnabled = false }: MalpraxisPageContentProps) {
  // Utils
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [authorizationTypes, setAuthorizationTypes] = useState<CodeName[]>([]);
  const [moralDamagesLimits, setMoralDamagesLimits] = useState<CodeName[]>([]);
  const [retroactivePeriods, setRetroactivePeriods] = useState<CodeName[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
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
  const [insurerOverrides, setInsurerOverrides] = useState<Record<number, MalpraxisInsurerOverride>>({});
  const [retryingInsurerId, setRetryingInsurerId] = useState<number | null>(null);

  // ABC claim booleans (utils: KNOWLEDGE_* / REGISTERED_*; comparator wire: PREVIOUS_* / PRIOR_*)
  const [knowledgeCompensationClaims, setKnowledgeCompensationClaims] = useState(false);
  const [registeredCompensationClaims, setRegisteredCompensationClaims] = useState(false);

  // GDPR & DNT
  const [showGdprModal, setShowGdprModal] = useState(false);
  // Download state (per-card)
  const [downloadingOfferId, setDownloadingOfferId] = useState<number | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  // Guard against double offer generation
  const generatingRef = useRef(false);
  const activeRunIdRef = useRef(0);

  const {
    agreementAnswers: malpraxisAgreementAnswers,
    setAgreementAnswers: setMalpraxisAgreementAnswers,
    dntWaiverAccepted,
    setDntWaiverAccepted,
    syncPersonKey: syncMalpraxisConsentPersonKey,
    shouldSkipConsentFlow: shouldSkipMalpraxisConsentFlow,
    markConsentCompleted: markMalpraxisConsentCompleted,
  } = useConsentWizardPersistence(MALPRAXIS_AGREEMENTS_INITIAL);

  const { currentStep, substep, next, prev, goTo, setSubstep, clearSubstep } =
    useWizardUrlSync(4);
  const [showErrors, setShowErrors] = useState(false);
  const [showDetailsErrors, setShowDetailsErrors] = useState(false);
  const offersStepIndex = 2; // 0-indexed: Details, Insured, Offers, Payment
  const insuredStepIndex = 1;
  const showDntSubstep =
    currentStep === insuredStepIndex && substep === "dnt";
  const showConsent =
    currentStep === insuredStepIndex && substep === "consent";
  const isOffersStep = currentStep === offersStepIndex;
  const hideMarketingSidebar = isOffersStep || showDntSubstep || showConsent;

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

  const malpraxisDetailsMissingLabels = getMalpraxisDetailsMissingLabels({
    professionId,
    categoryId,
    needsSubcategory,
    subcategoryId,
    generalLimit,
    moralDamagesLimit,
    authorizationTypeCode,
    currencyId,
    retroactivePeriod,
    policyStartDate,
  });
  const isMalpraxisDetailsValid = malpraxisDetailsMissingLabels.length === 0;
  const isInsuredStepValid = isPersonValid(insured, { skipIdDocument: true });

  useEffect(() => {
    syncMalpraxisConsentPersonKey(String(insured.cif || "").trim());
  }, [insured.cif, syncMalpraxisConsentPersonKey]);

  const handleInsuredStepContinue = () => {
    if (!isInsuredStepValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    const personKey = String(insured.cif || "").trim();
    if (shouldSkipMalpraxisConsentFlow(personKey)) {
      next();
      return;
    }
    setSubstep("dnt");
  };

  const detailsFieldCls = (isMissing: boolean) =>
    isMissing && showDetailsErrors ? `${selectCls} ${detailsErrBorder}` : selectCls;
  const detailsInputCls = (isMissing: boolean) =>
    isMissing && showDetailsErrors ? `${inputCls} ${detailsErrBorder}` : inputCls;

  const handleDetailsContinue = () => {
    if (isMalpraxisDetailsValid) {
      setShowDetailsErrors(false);
      next();
      return;
    }
    setShowDetailsErrors(true);
  };

  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/malpraxis/comparator/utils")
      .then((data) => {
        setProfessions(getArray<Profession>(data.profession));
        setAuthorizationTypes(toCodeNameOptions(data.operatingAuthorizationType));
        setMoralDamagesLimits(
          toCodeNameOptions(data.moralDamagesLimit)
            .map((m) => ({
              ...m,
              name: m.name === "Fara" ? "Fără" : m.name,
            }))
            .sort((a, b) => {
              const na = parseFloat(a.name);
              const nb = parseFloat(b.name);
              if (isNaN(na) && isNaN(nb)) return 0;
              if (isNaN(na)) return 1;
              if (isNaN(nb)) return -1;
              return na - nb;
            })
        );
        setRetroactivePeriods(toCodeNameOptions(data.retroactivePeriod));
        setCurrencies(
          getArray<{ id?: string; name?: string } | string>(data.currency).map((c) =>
            typeof c === "string" ? c : String(c.id ?? c.name ?? "")
          ).filter(Boolean)
        );
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

  useEffect(() => {
    const hasValid = offers.some((offer) => !offer.error);
    const hasErrors = offers.some((offer) => offer.error);
    if (hasValid && hasErrors) {
      setShowErrorOffers(true);
    }
  }, [offers]);

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
    setInsurerOverrides({});

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

        return true;
      });
      const moralDamagesSelectionForMatrix = parseMalpraxisMoralDamagesSelection({
        moralDamagesLimit,
        customMoralDamagesLimit: customMoralDamagesLimitValue,
        generalLimit: generalLimit.trim(),
      });
      const productMatrix = buildMalpraxisProductMatrix(
        candidateProducts,
        moralDamagesSelectionForMatrix,
        retroactivePeriod
      );
      const selectedProductIds = getIncludedProductIdsFromMatrix(productMatrix);
      const matrixExcludedOffers = mapMatrixExcludedToOffers(productMatrix, candidateProducts);
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
        installmentsNo: MALPRAXIS_INSTALLMENTS_NO,
        selectedProductIds,
        productMatrix,
        pharmacistContext,
      });

      const offerDetails = buildMalpraxisOfferDetails({
        malpraxisProfessionId: effectiveComparatorId ?? professionId,
        category: selectedCategory?.type || categoryId,
        categoryType: effectiveCategoryType,
        generalLimit: generalLimit.trim(),
        moralDamagesLimit,
        customMoralDamagesLimit: customMoralDamagesLimitValue,
        currency: currencyId,
        operatingAuthorizationType: authorizationTypeCode,
        installmentsNo: MALPRAXIS_INSTALLMENTS_NO,
        retroactivePeriod,
      });
      const moralDamagesSelection = parseMalpraxisMoralDamagesSelection({
        moralDamagesLimit,
        customMoralDamagesLimit: customMoralDamagesLimitValue,
        generalLimit: offerDetails.generalLimit,
      });
      logClientTrace(currentTraceId, "offer_details_normalized", {
        offerDetails,
        moralDamagesSelection,
      });

      // Homogeneous SUBLIMIT_MORAL_DAMAGE_* for the bodies/v3 + comparator/v3
      // client-side request. The proxy normalizer (normalizeMalpraxisPostBody)
      // also re-derives this value per-product, so any productCode here only
      // affects the bodies/v3 hint and is harmless: buildMalpraxisMoralSublimitValues
      // now returns the derived EUR amount for every productCode (matches
      // March 6 working Garanta wire when moral=0 → "0", and emits the EUR
      // amount when moral > 0).
      const moralSublimitsForBodies = buildMalpraxisMoralSublimitValues(
        "GARANTA_MALPRAXIS",
        moralDamagesSelection,
        offerDetails
      );

      const specificDetails: MalpraxisSpecificDetail[] = [
        { code: "EVENT_LIMIT_INSURED_AMOUNT", value: offerDetails.generalLimit },
        { code: "OPERATING_LICENSE_TYPE", value: authorizationTypeCode || "0" },
        {
          code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT",
          value: moralSublimitsForBodies.perEvent,
        },
        {
          code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD",
          value: moralSublimitsForBodies.perPeriod,
        },
        ...buildAbcClaimSpecificDetails({
          knowledgeCompensationClaims,
          registeredCompensationClaims,
        }),
      ];

      const startDateFormatted = `${policyStartDate}T00:00:00`;
      const requestedProductIds = selectedProductIds.map((productId) => String(productId));
      const matrixExcludedMalpraxisOffers: MalpraxisOffer[] = matrixExcludedOffers.map(
        (offer) => ({
          id: 0,
          productId: offer.productId,
          productName: offer.vendorName ? `${offer.vendorName} Malpraxis` : "Malpraxis",
          vendorName: offer.vendorName,
          vendorLogo: undefined,
          policyPremium: 0,
          currency: "RON",
          error: true,
          message: offer.message,
        })
      );

      if (requestedProductIds.length === 0) {
        logClientTrace(currentTraceId, "offers_ready", {
          orderId: null,
          orderHash: null,
          offers: matrixExcludedMalpraxisOffers,
        });
        setOffers(matrixExcludedMalpraxisOffers);
        return;
      }

      let eligibleProductIds = requestedProductIds;
      const matrixIncludedIdSet = new Set(requestedProductIds);
      const eligibilityPath = "/online/offers/malpraxis/comparator/products/eligible";
      const eligibilityBatches = groupMalpraxisEligibilityBatches(
        candidateProducts
          .filter((product) => matrixIncludedIdSet.has(String(product.id)))
          .map((product) => ({
            productId: product.id,
            productCode: inferMalpraxisProductCode(
              product.vendorDetails?.name || "",
              product.productName || ""
            ),
          })),
        {
          malpraxisProfessionId: effectiveComparatorId ?? professionId,
          category: selectedCategory?.type || categoryId,
          categoryType: effectiveCategoryType,
          generalLimit: generalLimit.trim(),
          moralDamagesLimit,
          customMoralDamagesLimit: customMoralDamagesLimitValue,
          currency: currencyId,
          operatingAuthorizationType: authorizationTypeCode,
          installmentsNo: MALPRAXIS_INSTALLMENTS_NO,
          retroactivePeriod,
        },
        moralDamagesSelection
      );
      let ineligibleOffers: MalpraxisOffer[] = [];

      try {
        logClientTrace(currentTraceId, "eligibility_request", eligibilityBatches, { path: eligibilityPath });
        const eligibleNested = await Promise.all(
          eligibilityBatches.map((batch) =>
            api.post<{ productId: number; isEligible: boolean; reason: string | null }[]>(
              eligibilityPath,
              buildMalpraxisEligibilityPayload({
                clientId: Number(insured.cif) || 0,
                productIds: batch.productIds,
                policyStartDate: startDateFormatted,
                policyEndDate,
                offerDetails: batch.offerDetails,
              }),
              traceHeaders
            )
          )
        );
        const eligible = eligibleNested.flat();
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
          const bodiesPayload = buildMalpraxisBodiesPayload({
            orderId: createdOrder.id,
            productIds: eligibleProductIds.map((productId) => Number(productId)),
            policyStartDate: startDateFormatted,
            policyEndDate,
            offerDetails,
            specificDetails,
          });

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
          const comparatorPayload = buildMalpraxisComparatorPayload(
            bodyObject,
            offerDetails,
            specificDetails,
            { moralDamagesSelection }
          );

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

      const allOffers = [
        ...results,
        ...droppedOffers,
        ...uniqueIneligible,
        ...matrixExcludedMalpraxisOffers,
      ];
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
      const res = await fetchOfferDocument(offerId, orderHash);
      openDocumentInNewTab(res);
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
    setInsurerOverrides({});
    handleCreateOrderAndOffers();
  };

  const malpraxisGlobalFormSlice = useMemo(
    () => ({
      moralDamagesLimit,
      customMoralDamagesLimit: customMoralDamagesLimitValue,
      retroactivePeriod,
      generalLimit: generalLimit.trim(),
    }),
    [moralDamagesLimit, customMoralDamagesLimitValue, retroactivePeriod, generalLimit]
  );

  const buildMalpraxisFormInput = (override?: MalpraxisInsurerOverride) => {
    const resolved = override ?? {
      moralDamagesLimit,
      customMoralDamagesLimit: customMoralDamagesLimitValue,
      retroactivePeriod,
    };
    return mergeInsurerOverrideIntoInput(
      {
        malpraxisProfessionId: effectiveComparatorId ?? professionId,
        category: selectedCategory?.type || categoryId,
        categoryType: effectiveCategoryType,
        generalLimit: generalLimit.trim(),
        moralDamagesLimit: resolved.moralDamagesLimit,
        customMoralDamagesLimit: resolved.customMoralDamagesLimit,
        currency: currencyId,
        operatingAuthorizationType: authorizationTypeCode,
        installmentsNo: MALPRAXIS_INSTALLMENTS_NO,
        retroactivePeriod: resolved.retroactivePeriod,
      },
      resolved
    );
  };

  const buildSpecificDetailsForQuote = (
    productCode: string,
    offerDetails: ReturnType<typeof buildMalpraxisOfferDetails>,
    moralSelection: ReturnType<typeof parseMalpraxisMoralDamagesSelection>
  ): MalpraxisSpecificDetail[] => {
    const moralSublimits = buildMalpraxisMoralSublimitValues(
      productCode,
      moralSelection,
      offerDetails
    );
    return [
      { code: "EVENT_LIMIT_INSURED_AMOUNT", value: offerDetails.generalLimit },
      { code: "OPERATING_LICENSE_TYPE", value: authorizationTypeCode || "0" },
      { code: "SUBLIMIT_MORAL_DAMAGE_PER_EVENT", value: moralSublimits.perEvent },
      { code: "SUBLIMIT_MORAL_DAMAGE_PER_INSURANCE_PERIOD", value: moralSublimits.perPeriod },
      ...buildAbcClaimSpecificDetails({
        knowledgeCompensationClaims,
        registeredCompensationClaims,
      }),
    ];
  };

  const normalizeMalpraxisOfferFromApi = (
    raw: Record<string, unknown>,
    productId: number
  ): MalpraxisOffer => {
    const responseProduct = raw.product as Record<string, unknown> | undefined;
    const responseVendorDetails = responseProduct?.vendorDetails as Record<string, unknown> | undefined;
    const prod = products.find((product) => product.id === productId);
    const vendorName =
      (raw.productDetails as { vendorDetails?: { commercialName?: string } } | undefined)?.vendorDetails
        ?.commercialName ||
      (responseVendorDetails?.commercialName as string | undefined) ||
      (responseVendorDetails?.name as string | undefined) ||
      prod?.vendorDetails?.name ||
      "";
    const logo =
      (raw.productDetails as { vendorDetails?: { linkLogo?: string } } | undefined)?.vendorDetails
        ?.linkLogo || (responseVendorDetails?.linkLogo as string | undefined);

    const policyPremium = Number(raw.policyPremium ?? 0);
    const hasError = Boolean(raw.error);

    return {
      id: Number(raw.id ?? 0),
      productId,
      productName: vendorName ? `${vendorName} Malpraxis` : "Malpraxis",
      vendorName,
      vendorLogo: logo || undefined,
      policyPremium,
      currency: String(raw.currency || "EUR"),
      error: hasError,
      message: hasError ? String(raw.message || "Oferta indisponibila") : null,
      installments: raw.installments as MalpraxisOffer["installments"],
      productDetails: raw.productDetails as MalpraxisOffer["productDetails"],
    };
  };

  const handleRetryInsurer = async (failedOffer: MalpraxisOffer) => {
    if (!orderId || !orderHash || !policyStartDate) {
      return;
    }

    const productId = failedOffer.productId;
    const product = products.find((item) => item.id === productId);
    const productCode =
      inferMalpraxisProductCode(product?.vendorDetails?.name || "", product?.productName || "") ||
      inferMalpraxisProductCodeByProductId(productId) ||
      "";

    if (!productCode) {
      return;
    }

    const override = resolveInsurerOverride(
      malpraxisGlobalFormSlice,
      productCode,
      failedOffer.message || "",
      insurerOverrides[productId]
    );
    setInsurerOverrides((prev) => ({ ...prev, [productId]: override }));
    setRetryingInsurerId(productId);

    const formInput = buildMalpraxisFormInput(override);
    const offerDetails = buildMalpraxisOfferDetails(formInput);
    const moralSelection = parseMalpraxisMoralDamagesSelection({
      moralDamagesLimit: String(formInput.moralDamagesLimit ?? "0"),
      customMoralDamagesLimit: String(formInput.customMoralDamagesLimit ?? ""),
      generalLimit: offerDetails.generalLimit,
    });
    const specificDetails = buildSpecificDetailsForQuote(productCode, offerDetails, moralSelection);
    const startDateFormatted = `${policyStartDate}T00:00:00`;
    const traceHeaders = debugTraceId ? { [MALPRAXIS_TRACE_HEADER]: debugTraceId } : undefined;

    try {
      const result = await fetchMalpraxisInsurerOffer({
        orderId,
        orderHash,
        productId,
        productCode,
        clientId: Number(insured.cif) || 0,
        policyStartDate: startDateFormatted,
        policyEndDate,
        formInput,
        specificDetails,
        traceHeaders,
      });

      let updated: MalpraxisOffer;
      if (!result.isEligible) {
        updated = {
          id: 0,
          productId,
          productName: failedOffer.productName,
          vendorName: failedOffer.vendorName,
          vendorLogo: failedOffer.vendorLogo,
          policyPremium: 0,
          currency: "RON",
          error: true,
          message: result.eligibilityReason || result.errorMessage || "Produsul nu este eligibil",
        };
      } else if (result.offer) {
        updated = normalizeMalpraxisOfferFromApi(result.offer, productId);
        if (!updated.vendorName) {
          updated.vendorName = failedOffer.vendorName;
        }
        if (!updated.productName) {
          updated.productName = failedOffer.productName;
        }
        if (!updated.vendorLogo) {
          updated.vendorLogo = failedOffer.vendorLogo;
        }
      } else {
        updated = {
          id: 0,
          productId,
          productName: failedOffer.productName,
          vendorName: failedOffer.vendorName,
          vendorLogo: failedOffer.vendorLogo,
          policyPremium: 0,
          currency: "RON",
          error: true,
          message: result.errorMessage || "Eroare generare oferta",
        };
      }

      setOffers((prev) => prev.map((offer) => (offer.productId === productId ? updated : offer)));
    } finally {
      setRetryingInsurerId(null);
    }
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
                  id="malpraxis-field-profession"
                  className={detailsFieldCls(!professionId.trim())}
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
                  className={detailsFieldCls(!categoryId.trim())}
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
                  className={detailsFieldCls(needsSubcategory && !subcategoryId.trim())}
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
                  className={detailsInputCls(!generalLimit.trim())}
                  value={generalLimit}
                  onChange={(e) => setGeneralLimit(e.target.value)}
                  placeholder="ex: 50000"
                />
              </div>
              <div>
                <label className={labelCls}>Limita daune morale (%)</label>
                <select
                  id="malpraxis-field-moral-percent"
                  className={detailsFieldCls(!moralDamagesLimit.trim())}
                  value={moralDamagesLimit}
                  onChange={(e) => {
                    setMoralDamagesLimit(e.target.value);
                    if (e.target.value && e.target.value !== "0") {
                      setCustomMoralDamagesLimitValue("");
                    }
                  }}
                >
                  <option value="">Selecteaza</option>
                  {moralDamagesLimits.map((m, i) => (
                    <option key={m.code || `moral-${i}`} value={m.code}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  Limita personalizata daune morale (suma fixa)
                </label>
                <input
                  id="malpraxis-field-moral-custom"
                  type="text"
                  className={inputCls}
                  value={customMoralDamagesLimitValue}
                  onChange={(e) => {
                    setCustomMoralDamagesLimitValue(e.target.value);
                    if (e.target.value.trim()) {
                      setMoralDamagesLimit("0");
                    }
                  }}
                  placeholder={`Suma in ${currencyId || "EUR"} (Euroins, Asirom…)`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Tip autorizatie</label>
                <select
                  id="malpraxis-field-authorization"
                  className={detailsFieldCls(!authorizationTypeCode.trim())}
                  value={authorizationTypeCode}
                  onChange={(e) => setAuthorizationTypeCode(e.target.value)}
                >
                  <option value="">Selecteaza</option>
                  {authorizationTypes.map((a, i) => (
                    <option key={a.code || `auth-${i}`} value={a.code}>{a.name}</option>
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
                  id="malpraxis-field-retroactive"
                  className={detailsFieldCls(!retroactivePeriod.trim())}
                  value={retroactivePeriod}
                  onChange={(e) => setRetroactivePeriod(e.target.value)}
                >
                  <option value="">Selecteaza</option>
                  {retroactivePeriods.map((r, i) => (
                    <option key={r.code || `retro-${i}`} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Data inceput polita</label>
              <DateInput
                value={policyStartDate}
                min={tomorrowDate}
                onChange={(v) => setPolicyStartDate(v)}
                className={detailsInputCls(!policyStartDate.trim())}
              />
            </div>

            <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={knowledgeCompensationClaims}
                  onChange={(e) => setKnowledgeCompensationClaims(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs leading-snug text-gray-700">
                  Ați avut răspundere civilă profesională anterioară?
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={registeredCompensationClaims}
                  onChange={(e) => setRegisteredCompensationClaims(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs leading-snug text-gray-700">
                  Au existat daune din răspundere civilă profesională anterioară?
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {!isMalpraxisDetailsValid && (
              <p className="max-w-md text-center text-xs text-amber-800">
                {showDetailsErrors ? "Completeaza campurile obligatorii: " : "Lipseste: "}
                <span className="font-medium">{malpraxisDetailsMissingLabels.join(", ")}</span>.
              </p>
            )}
            <button
              type="button"
              onClick={handleDetailsContinue}
              className={`${btn.primary} px-8 ${!isMalpraxisDetailsValid ? "opacity-70" : ""}`}
            >
              <span className="flex items-center gap-2">
                Continua
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
            {showDetailsErrors && !isMalpraxisDetailsValid && (
              <p className="text-xs text-gray-500">Campurile lipsa sunt marcate cu rosu.</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Date Asigurat",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {showConsent ? (
            <MalpraxisAgreementsForm
              personData={{
                ...insured,
                address: { ...insured.address, streetTypeId: insured.address.streetTypeId ?? 1 },
                ...(insured.legalType === "PF" && insured.cif
                  ? { dateOfBirth: dateOfBirthFromCNP(String(insured.cif)) }
                  : {}),
              }}
              answers={malpraxisAgreementAnswers}
              onAnswersChange={setMalpraxisAgreementAnswers}
              onComplete={() => {
                markMalpraxisConsentCompleted(String(insured.cif || "").trim());
                next();
              }}
              onError={(msg) => setError(msg)}
              onBack={() => {
                setSubstep("dnt");
              }}
              backLabel="Inapoi la alegerea modului de continuare"
            />
          ) : !showDntSubstep ? (
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
                  onClick={handleInsuredStepContinue}
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
            <DntChoice
              productLabel="Malpraxis"
              waiverAccepted={dntWaiverAccepted}
              onWaiverAcceptedChange={setDntWaiverAccepted}
              onContinueDirect={() => {
                setSubstep("consent");
              }}
              onBack={clearSubstep}
              backLabel="Inapoi la date asigurat"
            />
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
                <span>
                  {validOffers.length === 0
                    ? `De ce nu au ofertat asigurătorii (${errorOffers.length})`
                    : `Oferte indisponibile (${errorOffers.length})`}
                </span>
                <svg className={`h-4 w-4 transition-transform ${showErrorOffers ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showErrorOffers && (
                <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                  {errorOffers.map((offer, i) => {
                    const product = products.find((item) => item.id === offer.productId);
                    const productCode =
                      inferMalpraxisProductCode(
                        product?.vendorDetails?.name || "",
                        product?.productName || ""
                      ) || inferMalpraxisProductCodeByProductId(offer.productId) || "";
                    const rawMessage = offer.message || "";
                    const adjustableFields = inferInsurerAdjustmentFields(
                      productCode,
                      rawMessage
                    );
                    const override = resolveInsurerOverride(
                      malpraxisGlobalFormSlice,
                      productCode,
                      rawMessage,
                      insurerOverrides[offer.productId]
                    );
                    const hintMessage = getInsurerRetryHintMessage(productCode, rawMessage);

                    if (adjustableFields.length === 0) {
                      return (
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
                      );
                    }

                    return (
                      <MalpraxisInsurerRetryCard
                        key={`retry-${offer.productId}-${i}`}
                        productName={offer.productName}
                        vendorName={offer.vendorName}
                        vendorLogo={offer.vendorLogo}
                        hintMessage={hintMessage}
                        adjustableFields={adjustableFields}
                        override={override}
                        moralOptions={moralDamagesLimits}
                        retroactiveOptions={retroactivePeriods}
                        retrying={retryingInsurerId === offer.productId}
                        onOverrideChange={(next) =>
                          setInsurerOverrides((prev) => ({
                            ...prev,
                            [offer.productId]: next,
                          }))
                        }
                        onRetry={() => handleRetryInsurer(offer)}
                      />
                    );
                  })}
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
    <div className={`mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:px-6 lg:px-8 ${hideMarketingSidebar ? (isOffersStep ? "max-w-7xl" : "max-w-4xl") : "max-w-6xl"}`}>
      <div className={hideMarketingSidebar ? "space-y-8" : "grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"}>
        {!hideMarketingSidebar && (
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-900/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Asigurare Malpraxis Medical, flux clar</h1>
            <p className="mt-4 text-base leading-relaxed text-blue-50">Configurezi limitele, verifici ofertele eligibile si continui rapid catre plata securizata.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-2">
              {TRUST_BADGES.map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </aside>
        )}
        <main className={`space-y-5 ${hideMarketingSidebar ? "w-full" : ""}`}>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <WizardStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={goTo}
              remainingText={REMAINING_BY_STEP[currentStep]}
            />
            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
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
        </main>
      </div>
    </div>
  );
}










