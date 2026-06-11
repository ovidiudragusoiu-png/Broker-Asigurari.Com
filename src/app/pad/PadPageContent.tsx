"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import WizardStepper, { useWizardUrlSync } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import AddressForm, { emptyAddress } from "@/components/shared/AddressForm";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import PadAgreementsForm from "@/components/pad/PadAgreementsForm";
import { api } from "@/lib/api/client";
import {
  fetchOfferDocument,
  openDocumentInNewTab,
} from "@/lib/api/documentsClient";
import type { PersonRequest, AddressRequest, PadCesionar } from "@/types/insuretech";
import { formatPrice } from "@/lib/utils/formatters";
import {
  normalizeAddressForInsuretech,
  normalizePadPropertyAddressForInsuretech,
} from "@/lib/utils/addressNormalize";
import { isAddressValid, isPersonValid } from "@/lib/utils/formGuards";
import { getArray } from "@/lib/utils/dto";
import { btn } from "@/lib/ui/tokens";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";
import DateInput from "@/components/shared/DateInput";
import RuralAddressHint from "@/components/shared/RuralAddressHint";
import { isRuralEnvironment } from "@/lib/utils/ruralAddress";
import {
  constructionTypeNameForPadOrder,
  defaultBuildingStructureIdForPad,
  defaultConstructionTypeIdForPad,
  fetchBuildingStructureOptions,
  fetchPadConstructionTypeOptions,
  fetchPadProductIds,
  isPadPostalCodeRecognized,
  padProductIdForBuildingType,
  postPadOffer,
  type LabeledIdOption,
} from "@/lib/flows/padPropertyUtils";
import { presentPadOfferErrorWithContext } from "@/lib/flows/padOfferMessages";
import { PAD_AGREEMENTS_INITIAL } from "@/lib/flows/padAgreementsCopy";
import { useConsentWizardPersistence } from "@/lib/flows/useConsentWizardPersistence";

interface PadOfferApi {
  id: number;
  policyPremium: number;
  currency: string;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  productDetails?: { productName?: string; vendorDetails?: { linkLogo?: string } };
  error: boolean;
  message?: string;
}

const TRUST_BADGES = [
  "Autorizare ASF: RAJ506943",
  "Date securizate (SSL)",
  "Partener MaxyGo Broker de Asigurare SRL",
];
const REMAINING_BY_STEP = ["~2 min ramase", "~90 sec ramase", "~45 sec ramase", "Ultimul pas"];

const requiredMark = <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>;

const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const padFieldErrorSuffix =
  "!border-red-300 bg-red-50/40 focus:!border-red-500 focus:!ring-red-500/20";

function padSelectClass(invalid: boolean) {
  return invalid ? `${selectCls} ${padFieldErrorSuffix}` : selectCls;
}

function padInputClass(invalid: boolean) {
  return invalid ? `${inputCls} ${padFieldErrorSuffix}` : inputCls;
}

function PadFieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-medium text-gray-500">
      {children}
      {required ? requiredMark : null}
    </label>
  );
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export default function PadPage() {
  /* ---- Utils from API ---- */
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<string[]>([]);
  const [padProductIds, setPadProductIds] = useState<Map<string, number> | null>(null);
  const [padProductIdsReady, setPadProductIdsReady] = useState(false);
  const [buildingStructures, setBuildingStructures] = useState<LabeledIdOption[]>([]);
  const [constructionTypes, setConstructionTypes] = useState<LabeledIdOption[]>([]);
  const [cesionari, setCesionari] = useState<PadCesionar[]>([]);

  /* ---- Step 1: Property details ---- */
  const [padPropertyType, setPadPropertyType] = useState("");
  const [environmentType, setEnvironmentType] = useState("");
  const [buildingStructureTypeId, setBuildingStructureTypeId] = useState("");
  const [constructionTypeId, setConstructionTypeId] = useState("");
  const [constructionYear, setConstructionYear] = useState("");
  const [area, setArea] = useState("");
  const [noOfRooms, setNoOfRooms] = useState("");
  const [noOfFloors, setNoOfFloors] = useState("");
  const [noOfConstructedBuildings, setNoOfConstructedBuildings] = useState("1");
  const [propertyAddress, setPropertyAddress] = useState<AddressRequest>(emptyAddress());
  const [wantsCesiune, setWantsCesiune] = useState(false);
  const [cesiuneSearch, setCesiuneSearch] = useState("");
  const [selectedCesionari, setSelectedCesionari] = useState<PadCesionar[]>([]);
  const [notesCesionari, setNotesCesionari] = useState("");
  const [isRenewal, setIsRenewal] = useState(false);
  const [previousPolicySeries] = useState("RA-065");
  const [previousPolicyNumber, setPreviousPolicyNumber] = useState("");
  const [policyStartDate, setPolicyStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5); // T+5 rule for new policies
    return d.toISOString().split("T")[0];
  });

  /* ---- Step 2: People ---- */
  const [contractor, setContractor] = useState<PersonRequest>(emptyPersonPF());
  const [insured, setInsured] = useState<PersonRequest>(emptyPersonPF());
  const [sameAsContractor, setSameAsContractor] = useState(true);
  /* ---- Order & Offer ---- */
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);
  const [offer, setOffer] = useState<PadOfferApi | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [downloadingOffer, setDownloadingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    agreementAnswers: padAgreementAnswers,
    setAgreementAnswers: setPadAgreementAnswers,
    dntWaiverAccepted,
    setDntWaiverAccepted,
    syncPersonKey: syncPadConsentPersonKey,
    shouldSkipConsentFlow: shouldSkipPadConsentFlow,
    markConsentCompleted: markPadConsentCompleted,
  } = useConsentWizardPersistence(PAD_AGREEMENTS_INITIAL);

  const { currentStep, substep, next, prev, goTo, setSubstep, clearSubstep } =
    useWizardUrlSync(4);
  const [showErrors, setShowErrors] = useState(false);
  const offersStepIndex = 2; // 0-indexed: Property, People, Offer, Payment
  const peopleStepIndex = 1;
  const showDnt = currentStep === peopleStepIndex && substep === "dnt";
  const showConsent = currentStep === peopleStepIndex && substep === "consent";
  const isOffersStep = currentStep === offersStepIndex;
  const hideMarketingSidebar = isOffersStep || showDnt || showConsent;

  /* ---- Clear stale offer/order when navigating back to earlier steps ---- */
  useEffect(() => {
    if (currentStep < 2) {
      setOffer(null);
      setOrderId(null);
      setOrderHash(null);
      setError(null);
    }
  }, [currentStep]);

  /* ---- Auto-generate offer when reaching step 3 (index 2) ---- */
  useEffect(() => {
    if (currentStep === 2 && padProductIdsReady && !offer && !loadingOffer) {
      handleCreateOrderAndOffer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, padProductIdsReady]);

  useEffect(() => {
    syncPadConsentPersonKey(String(contractor.cif || "").trim());
  }, [contractor.cif, syncPadConsentPersonKey]);

  /* ---- Validation ---- */
  const isPropertyStepValid =
    !!padPropertyType &&
    !!environmentType &&
    !!buildingStructureTypeId &&
    !!constructionTypeId &&
    !!constructionYear && Number(constructionYear) > 1800 &&
    !!area && Number(area) > 0 &&
    !!noOfRooms && Number(noOfRooms) > 0 &&
    noOfFloors !== "" && Number(noOfFloors) >= 0 &&
    !!noOfConstructedBuildings && Number(noOfConstructedBuildings) > 0 &&
    !!policyStartDate &&
    (!isRenewal || (!!previousPolicySeries.trim() && !!previousPolicyNumber.trim())) &&
    isAddressValid(propertyAddress);

  const isPeopleStepValid =
    isPersonValid(contractor, { skipIdDocument: true }) && (sameAsContractor || isPersonValid(insured, { skipIdDocument: true }));

  const step1FieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const step2FormRef = useRef<HTMLDivElement>(null);

  const padStep1Errors = {
    padPropertyType: !padPropertyType,
    environmentType: !environmentType,
    buildingStructure: !buildingStructureTypeId,
    constructionType: !constructionTypeId,
    constructionYear: !constructionYear || Number(constructionYear) <= 1800,
    area: !area || Number(area) <= 0,
    noOfRooms: !noOfRooms || Number(noOfRooms) <= 0,
    noOfFloors: noOfFloors === "" || Number(noOfFloors) < 0,
    noOfConstructedBuildings: !noOfConstructedBuildings || Number(noOfConstructedBuildings) <= 0,
    policyStartDate: !policyStartDate,
    previousPolicyNumber: isRenewal && !previousPolicyNumber.trim(),
    address: !isAddressValid(propertyAddress),
  };

  const PAD_STEP1_FIELD_ORDER = [
    "padPropertyType",
    "environmentType",
    "buildingStructure",
    "constructionType",
    "constructionYear",
    "area",
    "noOfRooms",
    "noOfFloors",
    "noOfConstructedBuildings",
    "previousPolicyNumber",
    "policyStartDate",
    "address",
  ] as const;

  const showStep1FieldError = (key: keyof typeof padStep1Errors) =>
    showErrors && padStep1Errors[key];

  const setStep1FieldRef = (key: string) => (el: HTMLElement | null) => {
    step1FieldRefs.current[key] = el;
  };

  const focusFirstPadStep1Error = () => {
    const first = PAD_STEP1_FIELD_ORDER.find((key) => padStep1Errors[key]);
    if (!first) return;
    const el = step1FieldRefs.current[first];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([readonly]), select, textarea"
    );
    focusable?.focus({ preventScroll: true });
  };

  const handlePadStep1Continue = () => {
    if (isPropertyStepValid) {
      setShowErrors(false);
      next();
      return;
    }
    setShowErrors(true);
    requestAnimationFrame(() => focusFirstPadStep1Error());
  };

  const handlePadStep2Continue = () => {
    if (isPeopleStepValid) {
      setShowErrors(false);
      const personKey = String(contractor.cif || "").trim();
      if (shouldSkipPadConsentFlow(personKey)) {
        next();
        return;
      }
      setSubstep("dnt");
      return;
    }
    setShowErrors(true);
    requestAnimationFrame(() => {
      step2FormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  /* ---- Fetch PAD utils ---- */
  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/paid/pad/utils")
      .then((data) => {
        setBuildingTypes(getArray<string>(data.buildingType));
        setEnvironmentTypes(getArray<string>(data.environmentType));
      })
      .catch(() => setError("Nu am putut incarca utilitarele PAD"));
    api
      .get<{ cesionari: PadCesionar[] }>("/online/paid/pad/cesionari")
      .then((data) => setCesionari(data.cesionari || []))
      .catch(() => setError("Nu am putut incarca lista de cesionari"));
    void fetchPadProductIds()
      .then(setPadProductIds)
      .catch(() => {})
      .finally(() => setPadProductIdsReady(true));
  }, []);

  /* Fetch building structures & construction types when PAD type selected */
  useEffect(() => {
    if (!padPropertyType) return;

    setBuildingStructureTypeId("");
    setConstructionTypeId("");

    const productId = padProductIdForBuildingType(padPropertyType, padProductIds);
    let cancelled = false;

    void (async () => {
      const [structures, constructions] = await Promise.all([
        fetchBuildingStructureOptions(productId),
        fetchPadConstructionTypeOptions(productId),
      ]);
      if (cancelled) return;
      setBuildingStructures(structures);
      setConstructionTypes(constructions);
    })();

    return () => {
      cancelled = true;
    };
  }, [padPropertyType, padProductIds]);

  /* Sensible defaults per PAD tip (Bloc/apartament vs Casa) */
  useEffect(() => {
    if (!padPropertyType) return;
    const defaultCt = defaultConstructionTypeIdForPad(padPropertyType);
    const defaultStruct = defaultBuildingStructureIdForPad(padPropertyType);
    if (defaultCt) setConstructionTypeId(defaultCt);
    if (defaultStruct) setBuildingStructureTypeId(defaultStruct);
  }, [padPropertyType]);

  /* Toggle cesionar selection */
  const toggleCesionar = (c: PadCesionar) => {
    setSelectedCesionari((prev) =>
      prev.some((s) => s.cif === c.cif)
        ? prev.filter((s) => s.cif !== c.cif)
        : [...prev, c]
    );
  };

  /* ---- Create order + offer (non-v3 endpoints) ---- */
  const handleCreateOrderAndOffer = async () => {
    setError(null);
    setLoadingOffer(true);

    try {
      if (
        propertyAddress.cityId &&
        !(await isPadPostalCodeRecognized(
          Number(propertyAddress.cityId),
          propertyAddress.streetName || "",
          propertyAddress.postalCode || "",
          { isRural: isRuralEnvironment(environmentType) }
        ))
      ) {
        setError(
          "Codul poștal nu este recunoscut de PAID. Selectați strada din lista de sugestii după ce tastați minim 3 caractere."
        );
        return;
      }

      const startDate = new Date(policyStartDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1); // T+1year-1day per PAD docs

      const normalizeAddress = (addr: typeof propertyAddress) =>
        normalizeAddressForInsuretech(addr);

      const contractorNorm = {
        ...contractor,
        address: normalizeAddress(contractor.address),
        ...(contractor.legalType === "PF" && contractor.cif
          ? { dateOfBirth: dateOfBirthFromCNP(String(contractor.cif)) }
          : {}),
      };
      const insuredNorm = sameAsContractor
        ? contractorNorm
        : {
            ...insured,
            address: normalizeAddress(insured.address),
            ...(insured.legalType === "PF" && insured.cif
              ? { dateOfBirth: dateOfBirthFromCNP(String(insured.cif)) }
              : {}),
          };

      // 1. Create order — always fresh so padPropertyType/product stay in sync
      const order = await api.post<{ id: number; productType: string; hash: string }>(
        "/online/offers/order/v3",
        {
          vendorProductType: "PAD",
          mainInsuredDetails: { ...insuredNorm, policyPartyType: "INSURED", quota: 100 },
          contractorDetails: { ...contractorNorm, policyPartyType: "CONTRACTOR" },
          clientDetails: insuredNorm,
          goodDetails: {
            goodType: "HOME",
            padPropertyType,
            environmentType,
            buildingStructureTypeId: Number(buildingStructureTypeId),
            padBuildingIdentificationMention: null,
            constructionType: constructionTypeNameForPadOrder(
              constructionTypeId,
              constructionTypes,
              padPropertyType
            ),
            constructionTypeId: Number(constructionTypeId),
            constructionYear: Number(constructionYear),
            area: Number(area),
            noOfRooms: Number(noOfRooms),
            noOfFloors: Number(noOfFloors),
            usableArea: Number(area),
            noOfConstructedBuildings: Number(noOfConstructedBuildings),
            addressRequest: normalizePadPropertyAddressForInsuretech(propertyAddress),
          },
        }
      );

      const currentOrderId = order.id;
      const currentOrderHash = order.hash;
      setOrderId(order.id);
      setOrderHash(order.hash);

      if (!currentOrderId || !currentOrderHash) {
        setError("Nu am putut crea comanda PAD. Reîncercați.");
        return;
      }

      // 2. Create offer — POST /online/offers/paid/pad/v3
      const totalCesionari = selectedCesionari.length;
      const padProductId = padProductIdForBuildingType(padPropertyType, padProductIds);

      const offerRes = await postPadOffer<PadOfferApi>(currentOrderHash, {
        orderId: currentOrderId,
        productId: padProductId,
        policyStartDate: policyStartDate + "T00:00:00",
        policyEndDate: endDate.toISOString().split("T")[0] + "T00:00:00",
        offerDetails: {
          previousPolicySeries: isRenewal && previousPolicySeries.trim()
            ? previousPolicySeries.trim()
            : null,
          previousPolicyNumber: isRenewal && previousPolicyNumber.trim()
            ? previousPolicyNumber.trim()
            : null,
          notesCesionari: notesCesionari.trim() || null,
          cesionari: selectedCesionari.map((c, i) => ({
            cif: c.cif,
            name: c.name,
            legalType: c.legalType,
            quota: totalCesionari === 1
              ? 100
              : i < totalCesionari - 1
                ? Math.floor(100 / totalCesionari)
                : 100 - Math.floor(100 / totalCesionari) * (totalCesionari - 1),
          })),
        },
      });

      const offerErrorContext = {
        padPropertyType,
        productId: padProductId,
      };

      if (offerRes.error) {
        setError(presentPadOfferErrorWithContext(offerRes.message, offerErrorContext));
      } else {
        setOffer(offerRes);
      }
    } catch (err) {
      const apiErr = err as { message?: string; data?: { detail?: string } };
      const raw =
        apiErr.data?.detail ||
        apiErr.message ||
        "Eroare la generarea ofertei PAD";
      setError(
        presentPadOfferErrorWithContext(raw, {
          padPropertyType,
          productId: padProductIdForBuildingType(padPropertyType, padProductIds),
        })
      );
    } finally {
      setLoadingOffer(false);
    }
  };

  /* ---- Download offer PDF ---- */
  const handleDownloadOffer = async () => {
    if (!offer || !orderHash) return;
    setDownloadingOffer(true);
    try {
      const data = await fetchOfferDocument(offer.id, orderHash);
      openDocumentInNewTab(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la descarcare");
    } finally {
      setDownloadingOffer(false);
    }
  };

  /* ============================================================ */
  /* Steps                                                        */
  /* ============================================================ */
  const steps = [
    /* ---------- Step 1: Detalii Proprietate ---------- */
    {
      title: "Detalii Proprietate",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Main card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            {/* Row 1: PAD type + Environment */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div ref={setStep1FieldRef("padPropertyType")}>
                <PadFieldLabel required>Tip PAD</PadFieldLabel>
                <select
                  className={padSelectClass(showStep1FieldError("padPropertyType"))}
                  value={padPropertyType}
                  onChange={(e) => setPadPropertyType(e.target.value)}
                >
                  <option value="">Selecteaza tipul</option>
                  {buildingTypes.map((bt) => (
                    <option key={bt} value={bt}>
                      Tip {bt}
                    </option>
                  ))}
                </select>
                <FieldError show={showStep1FieldError("padPropertyType")} message="Selectati tipul PAD" />
              </div>
              <div ref={setStep1FieldRef("environmentType")}>
                <PadFieldLabel required>Mediu</PadFieldLabel>
                <select
                  className={padSelectClass(showStep1FieldError("environmentType"))}
                  value={environmentType}
                  onChange={(e) => setEnvironmentType(e.target.value)}
                >
                  <option value="">Selecteaza mediul</option>
                  {environmentTypes.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
                <FieldError show={showStep1FieldError("environmentType")} message="Selectati mediul" />
              </div>
            </div>

            {/* Row 2: Building structure + Construction type (shown after PAD type selected) */}
            {padPropertyType && (
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div ref={setStep1FieldRef("buildingStructure")}>
                  <PadFieldLabel required>Structura cladire</PadFieldLabel>
                  <select
                    className={padSelectClass(showStep1FieldError("buildingStructure"))}
                    value={buildingStructureTypeId}
                    onChange={(e) => setBuildingStructureTypeId(e.target.value)}
                  >
                    <option value="">Selecteaza structura</option>
                    {buildingStructures.map((bs) => (
                      <option key={bs.id} value={bs.id}>
                        {bs.description}
                      </option>
                    ))}
                  </select>
                  <FieldError show={showStep1FieldError("buildingStructure")} message="Selectati structura cladirii" />
                </div>
                <div ref={setStep1FieldRef("constructionType")}>
                  <PadFieldLabel required>Tip constructie</PadFieldLabel>
                  <select
                    className={padSelectClass(showStep1FieldError("constructionType"))}
                    value={constructionTypeId}
                    onChange={(e) => setConstructionTypeId(e.target.value)}
                  >
                    <option value="">Selecteaza tipul</option>
                    {constructionTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.description}
                      </option>
                    ))}
                  </select>
                  <FieldError show={showStep1FieldError("constructionType")} message="Selectati tipul de constructie" />
                </div>
              </div>
            )}

            {/* Row 3: Year + Area */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div ref={setStep1FieldRef("constructionYear")}>
                <PadFieldLabel required>An constructie</PadFieldLabel>
                <input
                  type="number"
                  className={padInputClass(showStep1FieldError("constructionYear"))}
                  placeholder="ex: 2005"
                  value={constructionYear}
                  onChange={(e) => setConstructionYear(e.target.value)}
                  min={1800}
                  max={2030}
                />
                <FieldError show={showStep1FieldError("constructionYear")} message="Introduceti anul constructiei" />
              </div>
              <div ref={setStep1FieldRef("area")}>
                <PadFieldLabel required>Suprafata (mp)</PadFieldLabel>
                <input
                  type="number"
                  className={padInputClass(showStep1FieldError("area"))}
                  placeholder="ex: 70"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  min={1}
                />
                <FieldError show={showStep1FieldError("area")} message="Introduceti suprafata" />
              </div>
            </div>

            {/* Row 4: Rooms + Floors + Buildings */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div ref={setStep1FieldRef("noOfRooms")}>
                <PadFieldLabel required>Nr. camere</PadFieldLabel>
                <input
                  type="number"
                  className={padInputClass(showStep1FieldError("noOfRooms"))}
                  placeholder="ex: 2"
                  value={noOfRooms}
                  onChange={(e) => setNoOfRooms(e.target.value)}
                  min={1}
                />
                <FieldError show={showStep1FieldError("noOfRooms")} message="Introduceti numarul de camere" />
              </div>
              <div ref={setStep1FieldRef("noOfFloors")}>
                <PadFieldLabel required>Nr. etaje</PadFieldLabel>
                <input
                  type="number"
                  className={padInputClass(showStep1FieldError("noOfFloors"))}
                  placeholder="ex: 4"
                  value={noOfFloors}
                  onChange={(e) => setNoOfFloors(e.target.value)}
                  min={0}
                />
                <FieldError show={showStep1FieldError("noOfFloors")} message="Introduceti numarul de etaje" />
              </div>
              <div ref={setStep1FieldRef("noOfConstructedBuildings")}>
                <PadFieldLabel required>Nr. cladiri</PadFieldLabel>
                <input
                  type="number"
                  className={padInputClass(showStep1FieldError("noOfConstructedBuildings"))}
                  placeholder="1"
                  value={noOfConstructedBuildings}
                  onChange={(e) => setNoOfConstructedBuildings(e.target.value)}
                  min={1}
                />
                <FieldError show={showStep1FieldError("noOfConstructedBuildings")} message="Introduceti numarul de cladiri" />
              </div>
            </div>

            {/* Policy type: New vs Renewal */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Perioada polita</span>
              </div>

              {/* New / Renewal toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewal(false);
                    const d = new Date();
                    d.setDate(d.getDate() + 5);
                    setPolicyStartDate(d.toISOString().split("T")[0]);
                  }}
                  className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    !isRenewal
                      ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                      : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Polita noua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewal(true);
                    // Renewal: default to tomorrow, user can pick up to T+30
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setPolicyStartDate(d.toISOString().split("T")[0]);
                  }}
                  className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isRenewal
                      ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                      : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Reinnoire polita
                </button>
              </div>

              {/* Renewal: previous policy fields */}
              {isRenewal && (
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <PadFieldLabel>Serie polita anterioara</PadFieldLabel>
                    <input
                      type="text"
                      className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                      value={previousPolicySeries}
                      readOnly
                    />
                  </div>
                  <div ref={setStep1FieldRef("previousPolicyNumber")}>
                    <PadFieldLabel required>Numar polita anterioara</PadFieldLabel>
                    <input
                      type="text"
                      className={padInputClass(showStep1FieldError("previousPolicyNumber"))}
                      placeholder="ex: 123456"
                      value={previousPolicyNumber}
                      onChange={(e) => setPreviousPolicyNumber(e.target.value)}
                    />
                    <FieldError show={showStep1FieldError("previousPolicyNumber")} message="Introduceti numarul politei anterioare" />
                  </div>
                </div>
              )}

              {/* Start date */}
              <div ref={setStep1FieldRef("policyStartDate")} className="max-w-xs">
                <PadFieldLabel required>
                  Data inceput polita
                  {!isRenewal && (
                    <span className="ml-1 font-normal text-gray-400">(azi + 5 zile, cfm. legii)</span>
                  )}
                  {isRenewal && (
                    <span className="ml-1 font-normal text-gray-400">(max. azi + 30 zile)</span>
                  )}
                </PadFieldLabel>
                {isRenewal ? (
                  <DateInput
                    value={policyStartDate}
                    min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })()}
                    onChange={(v) => setPolicyStartDate(v)}
                    className={padInputClass(showStep1FieldError("policyStartDate"))}
                  />
                ) : (
                  <DateInput
                    value={policyStartDate}
                    onChange={() => {}}
                    readOnly
                    className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                  />
                )}
                <FieldError show={showStep1FieldError("policyStartDate")} message="Selectati data de inceput" />
              </div>
            </div>

            {/* Property address */}
            <div
              ref={setStep1FieldRef("address")}
              className={`border-t pt-4 ${showStep1FieldError("address") ? "border-red-200" : "border-gray-100"}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-500">
                  Adresa proprietate
                  {requiredMark}
                </span>
              </div>
              {isRuralEnvironment(environmentType) && <RuralAddressHint />}
              <p className="mb-2 text-xs text-gray-500">
                Selectați strada din sugestii (min. 3 caractere) pentru cod poștal valid la ofertare PAD.
              </p>
              <AddressForm value={propertyAddress} onChange={setPropertyAddress} showErrors={showErrors} />
              <FieldError
                show={showStep1FieldError("address")}
                message="Completati adresa proprietatii (judet, localitate, strada, numar, cod postal)"
              />
            </div>
          </div>

          {/* Cesiune toggle */}
          <button
            type="button"
            onClick={() => {
              setWantsCesiune(!wantsCesiune);
              if (wantsCesiune) {
                setSelectedCesionari([]);
                setNotesCesionari("");
              }
            }}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
              wantsCesiune
                ? "border-[#2563EB] bg-blue-50/60"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                wantsCesiune ? "border-[#2563EB] bg-[#2563EB]" : "border-gray-300 bg-white"
              }`}
            >
              {wantsCesiune && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Cesiune catre banca creditoare</p>
              <p className="text-xs text-gray-500">Polita va fi cesionata in favoarea bancii</p>
            </div>
          </button>

          {/* Cesionari details — shown when toggle is on */}
          {wantsCesiune && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              {/* Search by name or CUI */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Cauta banca dupa nume sau CUI</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="ex: BRD, Transilvania, 5022670..."
                  value={cesiuneSearch}
                  onChange={(e) => setCesiuneSearch(e.target.value)}
                />
              </div>

              {/* Filtered results */}
              {cesiuneSearch.trim().length >= 2 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {cesionari
                    .filter((c) => {
                      const q = cesiuneSearch.toLowerCase();
                      return c.name.toLowerCase().includes(q) || c.cif.includes(q);
                    })
                    .map((c) => {
                      const isSelected = selectedCesionari.some((s) => s.cif === c.cif);
                      return (
                        <button
                          key={c.cif}
                          type="button"
                          onClick={() => {
                            toggleCesionar(c);
                            setCesiuneSearch("");
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs font-medium transition-all duration-200 ${
                            isSelected
                              ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                              : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                          <span className="flex-1">{c.name}</span>
                          <span className="text-gray-400">CUI: {c.cif}</span>
                        </button>
                      );
                    })}
                  {cesionari.filter((c) => {
                    const q = cesiuneSearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.cif.includes(q);
                  }).length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">Niciun rezultat gasit</p>
                  )}
                </div>
              )}

              {/* Selected banks */}
              {selectedCesionari.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <span className="text-xs font-medium text-gray-500">Banci selectate</span>
                  {selectedCesionari.map((c) => (
                    <div key={c.cif} className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2">
                      <span className="flex-1 text-xs font-medium text-blue-800">{c.name}</span>
                      <span className="text-xs text-blue-600">CUI: {c.cif}</span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">100%</span>
                      <button
                        type="button"
                        onClick={() => toggleCesionar(c)}
                        className="text-blue-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {selectedCesionari.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Mentiuni cesiune (nr. contract, etc.)</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="ex: contract nr. 12345 / 2024"
                    value={notesCesionari}
                    onChange={(e) => setNotesCesionari(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Continue */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handlePadStep1Continue}
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
        </div>
      ),
    },

    /* ---------- Step 2: Date Persoane ---------- */
    {
      title: "Date Persoane",
      content: showConsent ? (
        <PadAgreementsForm
          personData={{
            ...contractor,
            address: normalizeAddressForInsuretech(contractor.address),
            ...(contractor.legalType === "PF" && contractor.cif
              ? { dateOfBirth: dateOfBirthFromCNP(String(contractor.cif)) }
              : {}),
          }}
          answers={padAgreementAnswers}
          onAnswersChange={setPadAgreementAnswers}
          onComplete={() => {
            markPadConsentCompleted(String(contractor.cif || "").trim());
            next();
          }}
          onError={(msg) => setError(msg)}
          onBack={() => {
            setSubstep("dnt");
          }}
          backLabel="Inapoi la alegerea modului de continuare"
        />
      ) : showDnt ? (
        <DntChoice
          productLabel="PAD"
          waiverAccepted={dntWaiverAccepted}
          onWaiverAcceptedChange={setDntWaiverAccepted}
          onContinueDirect={() => {
            setSubstep("consent");
          }}
          onBack={clearSubstep}
          backLabel="Inapoi la date persoane"
        />
      ) : (
        <div ref={step2FormRef} className="mx-auto max-w-2xl space-y-4">
          <PersonForm
            value={contractor}
            onChange={setContractor}
            title="Contractant"
            hideIdDocument
            showErrors={showErrors}
            onCopyAddress={() =>
              setContractor((prev) => ({
                ...prev,
                address: { ...propertyAddress, addressType: "HOME" as const },
              }))
            }
            copyAddressLabel="Copiaza adresa proprietatii"
          />

          {/* Same as contractor toggle */}
          <button
            type="button"
            onClick={() => setSameAsContractor(!sameAsContractor)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
              sameAsContractor
                ? "border-[#2563EB] bg-blue-50/60"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                sameAsContractor ? "border-[#2563EB] bg-[#2563EB]" : "border-gray-300 bg-white"
              }`}
            >
              {sameAsContractor && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Asiguratul este acelasi cu contractantul</p>
              <p className="text-xs text-gray-500">Datele contractantului vor fi folosite si pentru asigurat</p>
            </div>
          </button>

          {!sameAsContractor && (
            <PersonForm value={insured} onChange={setInsured} title="Asigurat" hideIdDocument showErrors={showErrors} />
          )}

          <div className="flex justify-center gap-3 pt-2">
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
              onClick={handlePadStep2Continue}
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
        </div>
      ),
    },

    /* ---------- Step 3: Oferta PAD ---------- */
    {
      title: "Oferta PAD",
      content: (
        <div className="mx-auto max-w-lg space-y-6">
          {(loadingOffer || (!offer && !error)) && (
            <div className="flex flex-col items-center gap-3 py-12">
              <span className="h-10 w-10 animate-spin rounded-full border-3 border-[#2563EB] border-t-transparent" />
              <p className="text-sm font-medium text-gray-500">Se genereaza oferta PAD...</p>
              <p className="text-xs text-gray-400">Va rugam nu inchideti aceasta pagina</p>
            </div>
          )}

          {offer && !offer.error && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* Offer header */}
                <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
                  {offer.productDetails?.vendorDetails?.linkLogo && (
                    <img
                      src={offer.productDetails.vendorDetails.linkLogo}
                      alt=""
                      className="h-10 w-10 rounded-xl object-contain"
                    />
                  )}
                  {!offer.productDetails?.vendorDetails?.linkLogo && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {offer.productDetails?.productName || `Polita PAD ${padPropertyType}`}
                    </p>
                    <p className="text-xs text-gray-500">Asigurare obligatorie locuinta</p>
                  </div>
                </div>

                {/* Price */}
                <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50/50 to-white px-5 py-5 text-center">
                  <p className="text-xs font-medium text-gray-400">Prima de asigurare</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {formatPrice(offer.policyPremium, offer.currency)}
                  </p>
                </div>

                {/* Download offer */}
                <div className="border-t border-gray-100 px-5 py-3">
                  <button
                    type="button"
                    onClick={handleDownloadOffer}
                    disabled={downloadingOffer}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {downloadingOffer ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                    {downloadingOffer ? "Se descarca..." : "Descarca oferta (PDF)"}
                  </button>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button type="button" onClick={prev} className={`${btn.secondary} px-6`}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Inapoi
                  </span>
                </button>
                <button type="button" onClick={next} className={`${btn.primary} px-8`}>
                  <span className="flex items-center gap-2">
                    Continua la plata
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          )}

          {offer?.error && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {offer.message || "Eroare la generarea ofertei"}
              </div>
              <div className="text-center">
                <button type="button" onClick={prev} className={`${btn.secondary} px-6`}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Inapoi
                  </span>
                </button>
              </div>
            </div>
          )}

          {!loadingOffer && !offer && error && (
            <div className="text-center">
              <button type="button" onClick={prev} className={`${btn.secondary} px-6`}>
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Inapoi
                </span>
              </button>
            </div>
          )}
        </div>
      ),
    },

    /* ---------- Step 4: Plata ---------- */
    {
      title: "Plata",
      content:
        offer && !offer.error && orderId && orderHash ? (
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Offer summary card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
                {offer.productDetails?.vendorDetails?.linkLogo ? (
                  <img
                    src={offer.productDetails.vendorDetails.linkLogo}
                    alt=""
                    className="h-10 w-10 rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {offer.productDetails?.productName || `Polita PAD ${padPropertyType}`}
                  </p>
                  <p className="text-xs text-gray-500">Asigurare obligatorie locuinta / din {policyStartDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-400">Prima</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(offer.policyPremium, offer.currency)}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 px-5 py-2">
                <button
                  type="button"
                  onClick={handleDownloadOffer}
                  disabled={downloadingOffer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  {downloadingOffer ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                  {downloadingOffer ? "Se descarca..." : "Descarca oferta (PDF)"}
                </button>
              </div>
            </div>

            <PaymentFlow
              orderId={orderId}
              offerId={offer.id}
              orderHash={orderHash}
              amount={offer.policyPremium}
              currency={offer.currency}
              productType="PAD"
              onBack={prev}
            />
          </div>
        ) : (
          <p className="text-center text-gray-500">Generati mai intai oferta PAD.</p>
        ),
    },
  ];

  return (
    <div className={`mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:px-6 lg:px-8 ${hideMarketingSidebar ? "max-w-4xl" : "max-w-6xl"}`}>
      <div className={hideMarketingSidebar ? "space-y-8" : "grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"}>
        {!hideMarketingSidebar && (
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-900/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Asigurare PAD online, fara complicatii</h1>
            <p className="mt-4 text-base leading-relaxed text-blue-50">Parcurgi pasii esentiali si emiti polita obligatorie pentru locuinta in acelasi flux clar.</p>
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
