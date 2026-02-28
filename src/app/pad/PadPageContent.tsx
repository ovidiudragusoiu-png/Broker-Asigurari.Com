"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import AddressForm, { emptyAddress } from "@/components/shared/AddressForm";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import { api } from "@/lib/api/client";
import type { PersonRequest, AddressRequest, PadCesionar } from "@/types/insuretech";
import { formatPrice } from "@/lib/utils/formatters";
import { isAddressValid, isPersonValid } from "@/lib/utils/formGuards";
import { getArray } from "@/lib/utils/dto";
import { btn } from "@/lib/ui/tokens";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";
import { autoSignConsent } from "@/lib/flows/consent";
import DateInput from "@/components/shared/DateInput";

/* Local types for API responses not in shared types */
interface BuildingStructureOption {
  id: number;
  name: string;
  description: string;
}

interface ConstructionTypeOption {
  id: number;
  name: string;
  description: string;
}

interface PadOfferApi {
  id: number;
  policyPremium: number;
  currency: string;
  installments?: { installmentNo: number; amount: number; dueDate: string }[];
  productDetails?: { productName?: string; vendorDetails?: { linkLogo?: string } };
  error: boolean;
  message?: string;
}

const PAD_PRODUCT_ID = 1270;

export default function PadPage() {
  /* ---- Utils from API ---- */
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<string[]>([]);
  const [buildingStructures, setBuildingStructures] = useState<BuildingStructureOption[]>([]);
  const [constructionTypes, setConstructionTypes] = useState<ConstructionTypeOption[]>([]);
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
  const [previousPolicySeries, setPreviousPolicySeries] = useState("RA-065");
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
  const [showDnt, setShowDnt] = useState(false);

  /* ---- Order & Offer ---- */
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);
  const [offer, setOffer] = useState<PadOfferApi | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [downloadingOffer, setDownloadingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentStep, next, prev, goTo } = useWizard(4);

  /* ---- Clear stale offer/order when navigating back to earlier steps ---- */
  useEffect(() => {
    if (currentStep < 2) {
      setOffer(null);
      setOrderId(null);
      setOrderHash(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  /* ---- Auto-generate offer when reaching step 3 (index 2) ---- */
  useEffect(() => {
    if (currentStep === 2 && !offer && !loadingOffer) {
      handleCreateOrderAndOffer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  /* ---- Validation ---- */
  const isPropertyStepValid =
    !!padPropertyType &&
    !!environmentType &&
    !!buildingStructureTypeId &&
    !!constructionTypeId &&
    !!constructionYear && Number(constructionYear) > 1800 &&
    !!area && Number(area) > 0 &&
    !!noOfRooms && Number(noOfRooms) > 0 &&
    !!noOfFloors && Number(noOfFloors) > 0 &&
    !!noOfConstructedBuildings && Number(noOfConstructedBuildings) > 0 &&
    !!policyStartDate &&
    (!isRenewal || (!!previousPolicySeries.trim() && !!previousPolicyNumber.trim())) &&
    isAddressValid(propertyAddress);

  const isPeopleStepValid =
    isPersonValid(contractor, { skipIdDocument: true }) && (sameAsContractor || isPersonValid(insured, { skipIdDocument: true }));

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
  }, []);

  /* Fetch building structures & construction types when PAD type selected */
  useEffect(() => {
    if (!padPropertyType) return;
    setBuildingStructures([]);
    setConstructionTypes([]);
    setBuildingStructureTypeId("");
    setConstructionTypeId("");
    api
      .get<BuildingStructureOption[]>(`/online/utils/buildingStructures/${PAD_PRODUCT_ID}`)
      .then(setBuildingStructures)
      .catch(() => {});
    api
      .get<ConstructionTypeOption[]>(`/online/utils/constructionTypes/${PAD_PRODUCT_ID}`)
      .then(setConstructionTypes)
      .catch(() => {});
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
      const insuredPerson = sameAsContractor ? contractor : insured;
      const startDate = new Date(policyStartDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1); // T+1year-1day per PAD docs

      // 0. Auto-submit consent (same approach as RCA/Travel)
      try {
        await autoSignConsent(contractor, "PAD");
      } catch {
        // Consent check/submit failed — continue anyway, order creation will validate
      }

      // Normalize persons: add dateOfBirth (PF) + streetTypeId
      const normalizeAddress = (addr: typeof propertyAddress) => ({
        ...addr,
        streetTypeId: addr.streetTypeId ?? 1,
      });

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

      // 1. Create order — POST /online/offers/order/v3
      let currentOrderId = orderId;
      let currentOrderHash = orderHash;

      if (!currentOrderId) {
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
              constructionTypeId: Number(constructionTypeId),
              constructionYear: Number(constructionYear),
              area: Number(area),
              noOfRooms: Number(noOfRooms),
              noOfFloors: Number(noOfFloors),
              usableArea: Number(area),
              noOfConstructedBuildings: Number(noOfConstructedBuildings),
              addressRequest: normalizeAddress(propertyAddress),
            },
          }
        );

        currentOrderId = order.id;
        currentOrderHash = order.hash;
        setOrderId(order.id);
        setOrderHash(order.hash);
      }

      // 2. Create offer — POST /online/offers/paid/pad/v3
      const totalCesionari = selectedCesionari.length;
      const offerRes = await api.post<PadOfferApi>(
        `/online/offers/paid/pad/v3?orderHash=${currentOrderHash}`,
        {
          orderId: currentOrderId,
          productId: PAD_PRODUCT_ID,
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
        }
      );

      if (offerRes.error) {
        setError(offerRes.message || "Eroare la generarea ofertei PAD");
      } else {
        setOffer(offerRes);
      }
    } catch (err) {
      const apiErr = err as { message?: string; data?: unknown };
      const detail = apiErr.data ? JSON.stringify(apiErr.data) : "";
      setError(
        `${apiErr.message || "Eroare la generarea ofertei PAD"}${detail ? ` | ${detail}` : ""}`
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
      const data = await api.get<{ url: string }>(
        `/online/offers/${offer.id}/document/v3?orderHash=${orderHash}`,
        { timeoutMs: 60000 }
      );
      if (data.url) {
        const safeUrl = new URL(data.url, window.location.origin);
        if (!["http:", "https:"].includes(safeUrl.protocol)) {
          throw new Error("Linkul documentului este invalid");
        }
        window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Link-ul documentului nu este disponibil");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la descarcare");
    } finally {
      setDownloadingOffer(false);
    }
  };

  /* ---- CSS helpers ---- */
  const selectCls =
    "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
  const inputCls =
    "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";

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
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Tip PAD</label>
                <select
                  className={selectCls}
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
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Mediu</label>
                <select
                  className={selectCls}
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
              </div>
            </div>

            {/* Row 2: Building structure + Construction type (shown after PAD type selected) */}
            {padPropertyType && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Structura cladire</label>
                  <select
                    className={selectCls}
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
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tip constructie</label>
                  <select
                    className={selectCls}
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
                </div>
              </div>
            )}

            {/* Row 3: Year + Area */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">An constructie</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 2005"
                  value={constructionYear}
                  onChange={(e) => setConstructionYear(e.target.value)}
                  min={1800}
                  max={2030}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Suprafata (mp)</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 70"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            {/* Row 4: Rooms + Floors + Buildings */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Nr. camere</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 2"
                  value={noOfRooms}
                  onChange={(e) => setNoOfRooms(e.target.value)}
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Nr. etaje</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="ex: 4"
                  value={noOfFloors}
                  onChange={(e) => setNoOfFloors(e.target.value)}
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Nr. cladiri</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="1"
                  value={noOfConstructedBuildings}
                  onChange={(e) => setNoOfConstructedBuildings(e.target.value)}
                  min={1}
                />
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
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Serie polita anterioara</label>
                    <input
                      type="text"
                      className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                      value={previousPolicySeries}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Numar polita anterioara</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="ex: 123456"
                      value={previousPolicyNumber}
                      onChange={(e) => setPreviousPolicyNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Start date */}
              <div className="max-w-xs">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Data inceput polita
                  {!isRenewal && (
                    <span className="ml-1 text-gray-400">(azi + 5 zile, cfm. legii)</span>
                  )}
                  {isRenewal && (
                    <span className="ml-1 text-gray-400">(max. azi + 30 zile)</span>
                  )}
                </label>
                {isRenewal ? (
                  <DateInput
                    value={policyStartDate}
                    min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })()}
                    onChange={(v) => setPolicyStartDate(v)}
                  />
                ) : (
                  <DateInput
                    value={policyStartDate}
                    onChange={() => {}}
                    readOnly
                    className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                  />
                )}
              </div>
            </div>

            {/* Property address */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Adresa proprietate</span>
              </div>
              <AddressForm value={propertyAddress} onChange={setPropertyAddress} />
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
              onClick={() => isPropertyStepValid && next()}
              disabled={!isPropertyStepValid}
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
      content: showDnt ? (
        <DntChoice
          productLabel="PAD"
          onContinueDirect={() => { setShowDnt(false); next(); }}
          onBack={() => setShowDnt(false)}
          backLabel="Inapoi la date persoane"
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          <PersonForm
            value={contractor}
            onChange={setContractor}
            title="Contractant"
            hideIdDocument
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
            <PersonForm value={insured} onChange={setInsured} title="Asigurat" hideIdDocument />
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
              onClick={() => isPeopleStepValid && setShowDnt(true)}
              disabled={!isPeopleStepValid}
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
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header — above wizard indicators */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Asigurare PAD</h2>
        <p className="mt-0.5 text-sm text-gray-500">Asigurarea obligatorie pentru locuinta dumneavoastra</p>
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
