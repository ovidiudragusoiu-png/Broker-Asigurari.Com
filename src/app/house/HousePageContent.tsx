"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import AddressForm, { emptyAddress } from "@/components/shared/AddressForm";

import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import { api } from "@/lib/api/client";
import type { PersonRequest, AddressRequest, PadCesionar } from "@/types/insuretech";
import { isAddressValid, isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildOrderPayload } from "@/lib/flows/payloadBuilders";
import { autoSignConsent } from "@/lib/flows/consent";
import DateInput from "@/components/shared/DateInput";
import { getArray } from "@/lib/utils/dto";
import { formatDateTime } from "@/lib/utils/formatters";
import { dateOfBirthFromCNP } from "@/lib/utils/validation";

interface HouseOffer {
  id: number;
  productId: string;
  productName: string;
  productSubPackage?: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  insuredAmount?: number;
  contentAmount?: number;
  insuredAmountCurrency?: string;
  installments?: { number: number; amount: number; dueDate: string }[];
  message?: string;
  specificDetails?: { code: string; value: unknown }[];
  coverages?: { name: string; sumInsured?: number; premium?: number }[];
  hasApiError?: boolean;
  error?: string;
}

interface SelectOption {
  code: string;
  name: string;
}

interface BuildingStructureOption {
  id: number;
  name: string;
  description: string;
}

interface ConstructionTypeOption {
  id: number;
  name: string;
  description?: string;
}

export default function HousePage() {
  // House comparator utils
  const [constructionTypes, setConstructionTypes] = useState<SelectOption[]>([]);
  const [finishTypes, setFinishTypes] = useState<SelectOption[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<SelectOption[]>([]);
  const [occupationTypes, setOccupationTypes] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<{ id: string; productName: string }[]>([]);

  // PAD/order utils (building structures, construction type IDs)
  const [buildingStructures, setBuildingStructures] = useState<BuildingStructureOption[]>([]);
  const [padConstructionTypes, setPadConstructionTypes] = useState<ConstructionTypeOption[]>([]);

  // House details
  const [constructionTypeCode, setConstructionTypeCode] = useState("");
  const [constructionYear, setConstructionYear] = useState<number | null>(null);
  const [surfaceArea, setSurfaceArea] = useState<number | null>(null);
  const [numberOfRooms, setNumberOfRooms] = useState<number | null>(null);
  const [finishTypeCode, setFinishTypeCode] = useState("");
  const [environmentTypeCode, setEnvironmentTypeCode] = useState("");
  const [houseAddress, setHouseAddress] = useState<AddressRequest>(emptyAddress());

  // Property details for order goodDetails
  const [padPropertyType, setPadPropertyType] = useState("A");
  const [buildingStructureTypeId, setBuildingStructureTypeId] = useState("");
  const [padConstructionTypeId, setPadConstructionTypeId] = useState("");
  const [noOfFloors, setNoOfFloors] = useState<number>(0);
  const [occupationType, setOccupationType] = useState("Permanent");

  // Policy start date (default: tomorrow)
  const [policyStartDate, setPolicyStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  // Insurance sums
  const [buildingSum, setBuildingSum] = useState<number>(0);
  const [contentSum, setContentSum] = useState<number>(0);
  const [withPad] = useState(true); // PAD is mandatory for house insurance
  const [hasPreviousPad, setHasPreviousPad] = useState(false);
  const [padPreviousSeries, setPadPreviousSeries] = useState("");
  const [padPreviousNumber, setPadPreviousNumber] = useState("");
  // PAD start date for renewals (user picks from T+5..T+30)
  const [padStartDate, setPadStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });

  // Separate PAD offer (extracted from API response)
  const [padOffer, setPadOffer] = useState<{ id: number; premium: number; currency: string } | null>(null);

  // Cesiune (bank cession)
  const [cesionari, setCesionari] = useState<PadCesionar[]>([]);
  const [wantsCesiune, setWantsCesiune] = useState(false);
  const [cesiuneSearch, setCesiuneSearch] = useState("");
  const [selectedCesionari, setSelectedCesionari] = useState<PadCesionar[]>([]);
  const [cessionMentions, setCessionMentions] = useState("");
  const [firstHomeCessioned, setFirstHomeCessioned] = useState(false);
  const [cessionAmount, setCessionAmount] = useState<number | null>(null);

  // Person
  const [contractor, setContractor] = useState<PersonRequest>(emptyPersonPF());

  // Order
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Offers
  const [offers, setOffers] = useState<HouseOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<HouseOffer | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDntSubstep, setShowDntSubstep] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [downloadingOfferId, setDownloadingOfferId] = useState<number | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  const { currentStep, next, prev, goTo } = useWizard(4);

  // Auto-generate offers when user reaches step 3
  useEffect(() => {
    if (currentStep === 2 && offers.length === 0 && !loadingOffers) {
      handleCreateOrderAndOffers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);
  const isBloc = constructionTypeCode === "Bloc";
  const isHouseDetailsValid =
    !!constructionTypeCode &&
    !!constructionYear &&
    !!surfaceArea &&
    !!numberOfRooms &&
    !!finishTypeCode &&
    !!environmentTypeCode &&
    isAddressValid(houseAddress) &&
    (!isBloc || !!houseAddress.floorId) && // floor required for apartments
    buildingSum > 0 &&
    !!policyStartDate &&
    !!padPropertyType &&
    !!buildingStructureTypeId &&
    !!padConstructionTypeId &&
    noOfFloors >= 0;
  const isContractorValid = isPersonValid(contractor, { skipIdDocument: true });

  // Load house comparator utils
  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/house/comparator/utils")
      .then((data) => {
        setConstructionTypes(getArray<SelectOption>(data.constructionType));
        setFinishTypes(getArray<SelectOption>(data.indoorFinishesTypes));
        setEnvironmentTypes(getArray<SelectOption>(data.environmentType));
        setOccupationTypes(getArray<SelectOption>(data.occupationType));
      })
      .catch(() => setError("Nu am putut incarca utilitarele pentru locuinta"));
    api
      .get<{ id: string; productName: string }[]>(
        "/online/products/house/facultative"
      )
      .then((prods) => {
        setProducts(prods);
        // Fetch building structures & construction types using first product
        if (prods.length > 0) {
          const firstProdId = prods[0].id;
          api
            .get<BuildingStructureOption[]>(`/online/utils/buildingStructures/${firstProdId}`)
            .then(setBuildingStructures)
            .catch(() => {});
          api
            .get<ConstructionTypeOption[]>(`/online/utils/constructionTypes/${firstProdId}`)
            .then(setPadConstructionTypes)
            .catch(() => {});
        }
      })
      .catch(() => setError("Nu am putut incarca produsele de locuinta"));
    api
      .get<{ cesionari: PadCesionar[] }>("/online/paid/pad/cesionari")
      .then((data) => setCesionari(data.cesionari || []))
      .catch(() => {});
  }, []);

  const toggleCesionar = (c: PadCesionar) => {
    setSelectedCesionari((prev) =>
      prev.some((s) => s.cif === c.cif)
        ? prev.filter((s) => s.cif !== c.cif)
        : [...prev, c]
    );
  };

  const handleCreateOrderAndOffers = async () => {
    setError(null);
    setLoadingOffers(true);

    try {
      // Auto-sign consent in background (required by order v3 API)
      try {
        await autoSignConsent(contractor, "HOUSE");
      } catch (consentErr) {
        console.error("[HOUSE] consent submission failed:", consentErr);
      }

      const startDateFormatted = formatDateTime(new Date(policyStartDate));


      // Build goodDetails for order creation (matches InsureTech API schema)
      // constructionType (string name) is required by PAD computation alongside constructionTypeId
      const ctName = padConstructionTypes.find(
        (ct) => ct.id === Number(padConstructionTypeId)
      )?.name || "";
      const orderGoodDetails = {
        goodType: "HOME",
        constructionYear: constructionYear!,
        area: surfaceArea!,
        usableArea: surfaceArea!,
        noOfRooms: numberOfRooms!,
        environmentType: environmentTypeCode,
        padPropertyType,
        noOfFloors,
        noOfConstructedBuildings: 1,
        padBuildingIdentificationMention: null,
        buildingStructureTypeId: Number(buildingStructureTypeId) || 1,
        constructionType: ctName,
        constructionTypeId: Number(padConstructionTypeId) || 1,
        insuredSumTypeId: 1,
        seismicRiskTypeId: 1,
        addressRequest: { ...houseAddress, streetTypeId: houseAddress.streetTypeId ?? 1 },
      };

      // Derive dateOfBirth from CNP and normalize streetTypeId
      const contractorWithDob = {
        ...contractor,
        dateOfBirth: dateOfBirthFromCNP(String(contractor.cif || "")),
        address: {
          ...contractor.address,
          streetTypeId: contractor.address.streetTypeId ?? 1,
        },
      };

      const basePayload = buildOrderPayload("HOUSE", contractorWithDob, contractorWithDob, {
        goodDetails: orderGoodDetails,
      });
      // PAD requires mainInsured quota (ownership %) summing to 100
      const orderPayload = {
        ...basePayload,
        mainInsuredDetails: { ...basePayload.mainInsuredDetails, quota: 100 },
      };

      const { order, offers: results } = await createOrderAndOffers({
        orderPayload,
        fetchBodies: async (createdOrder) => {
          const bodiesPayload = {
              orderId: createdOrder.id,
              productIds: products.map((p) => p.id),
              policyStartDate: startDateFormatted,
              periodMonths: 12,
              installmentsNo: 1,
              requestPAD: withPad,
              ...(withPad
                ? (() => {
                    // New PAD: fixed T+5. Renewal: user-selected date (T+5..T+30)
                    const padStart = hasPreviousPad
                      ? new Date(padStartDate)
                      : (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d; })();
                    const padEnd = new Date(padStart);
                    padEnd.setFullYear(padEnd.getFullYear() + 1);
                    padEnd.setDate(padEnd.getDate() - 1);
                    return {
                      padPolicyStartDate: formatDateTime(padStart),
                      padPolicyEndDate: formatDateTime(padEnd),
                      padPreviousPolicySeries: hasPreviousPad && padPreviousSeries ? padPreviousSeries : null,
                      padPreviousPolicyNumber: hasPreviousPad && padPreviousNumber ? padPreviousNumber : null,
                    };
                  })()
                : {}),
              offerDetails: {
                occupationType,
                indoorFinishesTypes: finishTypeCode,
                buildingInsuredSum: buildingSum,
                contentInsuredSum: contentSum,
                lastFloorApartment: false,
                constructionAuthorization: true,
                constructionAuthorizationRespected: true,
                firstRiskInsurance: true,
                technicalAssistance: true,
                floodAreaDeclaration: false,
                landslidesAreaDeclaration: false,
                avalancheAreaDeclaration: false,
                hasAlarmSystem: false,
                hasFireDetection: false,
                discount: null,
                discountReason: null,
                increase: null,
                increaseReason: null,
                mentions: null,
                // Cesiune — only include when user opted in with at least one bank selected
                ...(wantsCesiune && selectedCesionari.length > 0 ? {
                  cessionMentions: cessionMentions.trim() || null,
                  cessions: selectedCesionari.map((c) => ({ cif: c.cif, name: c.name, cessionRate: firstHomeCessioned ? "50" : "100" })),
                  cessionBegin: policyStartDate + "T00:00:00",
                  cessionEnd: (() => { const d = new Date(policyStartDate); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0] + "T00:00:00"; })(),
                  firstHomeCessioned,
                  ...(firstHomeCessioned ? { cessionRateMFP: "50", cessionAmount: cessionAmount || null } : {}),
                } : {}),
              },
            };
          // v3 bodies endpoint — uses orderHash for session linking
          let bodies: Record<string, unknown>[];
          try {
            bodies = await api.post<Record<string, unknown>[]>(
              `/online/offers/house/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
              bodiesPayload
            );
          } catch (bodiesErr) {
            const e = bodiesErr as { status?: number; message?: string; data?: unknown };
            console.error("[HOUSE] Bodies endpoint FAILED:", e.status, e.message, JSON.stringify(e.data, null, 2));
            throw bodiesErr;
          }
          // Separate PAD bodies from facultative bodies
          const isPadBody = (b: Record<string, unknown>) =>
            String(b.productCode || "").toUpperCase().includes("PAD");
          const padBodies = bodies.filter(isPadBody);
          const facBodies = bodies.filter((b) => !isPadBody(b));
          // Fetch PAD offers — use v3 comparator (same session as house offers)
          if (padBodies.length > 0) {
            for (const rawPadBody of padBodies) {
              try {
                let padOfferResult: Record<string, unknown> | null = null;

                // Ensure PAD body has correct T+5 start date (API requires ≥5 days from today)
                const padStart = hasPreviousPad
                  ? new Date(padStartDate)
                  : (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d; })();
                const padEnd = new Date(padStart);
                padEnd.setFullYear(padEnd.getFullYear() + 1);
                padEnd.setDate(padEnd.getDate() - 1);
                const padBody: Record<string, unknown> = {
                  ...rawPadBody,
                  policyStartDate: formatDateTime(padStart),
                  policyEndDate: formatDateTime(padEnd),
                  padPolicyStartDate: formatDateTime(padStart),
                  padPolicyEndDate: formatDateTime(padEnd),
                };
                // Strategy 1: v3 house comparator (same session as house offers)
                try {
                  const raw = await api.post<Record<string, unknown>>(
                    `/online/offers/house/comparator/v3?orderHash=${createdOrder.hash}`,
                    padBody
                  );
                  if (raw.id && Number(raw.policyPremium) > 0 && raw.error !== true) {
                    padOfferResult = raw;
                  }
                } catch (err1) {
                  console.warn("[HOUSE] PAD v3 comparator failed:", err1);
                }

                // Strategy 2: Non-v3 house comparator (fallback)
                if (!padOfferResult) {
                  try {
                    const raw = await api.post<Record<string, unknown>>(
                      `/online/offers/house/comparator`,
                      padBody
                    );
                    if (raw.id && Number(raw.policyPremium) > 0 && raw.error !== true) {
                      padOfferResult = raw;
                    }
                  } catch (err2) {
                    console.warn("[HOUSE] PAD non-v3 comparator failed:", err2);
                  }
                }

                // Strategy 3: Dedicated PAD endpoint (last resort)
                if (!padOfferResult) {
                  try {
                    const raw = await api.post<Record<string, unknown>>(
                      `/online/offers/paid/pad`,
                      {
                        orderId: padBody.orderId,
                        productId: padBody.productId,
                        policyStartDate: formatDateTime(padStart),
                        policyEndDate: formatDateTime(padEnd),
                        offerDetails: {
                          ...(padBody.padPreviousPolicySeries ? { previousPolicySeries: String(padBody.padPreviousPolicySeries) } : {}),
                          ...(padBody.padPreviousPolicyNumber ? { previousPolicyNumber: String(padBody.padPreviousPolicyNumber) } : {}),
                        },
                      }
                    );
                    if (raw.id && Number(raw.policyPremium) > 0 && raw.error !== true) {
                      padOfferResult = raw;
                    }
                  } catch (err3) {
                    console.warn("[HOUSE] PAD dedicated endpoint failed:", err3);
                  }
                }

                if (padOfferResult) {
                  setPadOffer({
                    id: padOfferResult.id as number,
                    premium: Number(padOfferResult.policyPremium),
                    currency: String(padOfferResult.currency || "RON"),
                  });
                }
              } catch (padErr) {
                console.warn("[HOUSE] PAD offer processing failed:", padErr);
              }
            }
          }
          return facBodies;
        },
        fetchOffer: async (body, createdOrder) => {
          const raw = await api.post<Record<string, unknown>>(
            `/online/offers/house/comparator/v3?orderHash=${createdOrder.hash}`,
            body
          );
          const pd = raw.productDetails as { vendorDetails?: { name?: string; commercialName?: string }; productName?: string; productSubPackage?: string } | undefined;
          return {
            id: raw.id as number,
            productId: String(pd?.productName || raw.productId || ""),
            productName: String(pd?.productName || raw.productName || "Necunoscut"),
            productSubPackage: pd?.productSubPackage ? String(pd.productSubPackage) : undefined,
            vendorName: String(pd?.vendorDetails?.commercialName || pd?.vendorDetails?.name || raw.vendorName || ""),
            policyPremium: Number(raw.policyPremium) || 0,
            currency: String(raw.currency || "EUR"),
            insuredAmount: raw.insuredAmount != null ? Number(raw.insuredAmount) : undefined,
            contentAmount: raw.contentAmount != null ? Number(raw.contentAmount) : undefined,
            insuredAmountCurrency: raw.insuredAmountCurrency ? String(raw.insuredAmountCurrency) : undefined,
            installments: raw.installments as HouseOffer["installments"],
            message: raw.message ? String(raw.message) : undefined,
            specificDetails: raw.specificDetails as HouseOffer["specificDetails"],
            coverages: raw.coverages as HouseOffer["coverages"],
            hasApiError: raw.error === true,
          } as HouseOffer;
        },
        mapOfferError: (body, err) => ({
          id: 0,
          productId: String(body.productId || ""),
          productName: String(body.productName || "Necunoscut"),
          vendorName: "",
          policyPremium: 0,
          currency: "RON",
          error: err instanceof Error ? err.message : "Eroare generare oferta",
        }),
      });

      setOrderId(order.id);
      setOrderHash(order.hash);

      const facultativeOffers = results;

      // If PAD wasn't set during body fetch (no PAD body or fetch failed), use fallback
      if (withPad) {
        setPadOffer((prev) => {
          if (prev && prev.id > 0) return prev; // already set from API
          const padPremium = padPropertyType === "B" ? 50 : 130;
          return { id: 0, premium: padPremium, currency: "RON" };
        });
      } else {
        setPadOffer(null);
      }
      setOffers(facultativeOffers);
    } catch (err) {
      const apiErr = err as { message?: string; data?: unknown };
      const detail = apiErr.data ? JSON.stringify(apiErr.data) : "";
      setError(`${apiErr.message || "Eroare la crearea comenzii"}${detail ? ` | ${detail}` : ""}`);
    } finally {
      setLoadingOffers(false);
    }
  };

  const downloadSingleOfferDoc = async (offerId: number): Promise<boolean> => {
    const data = await api.get<{ url: string }>(
      `/online/offers/${offerId}/document/v3?orderHash=${orderHash}`,
      { timeoutMs: 60000 }
    );
    if (data.url) {
      const safeUrl = new URL(data.url, window.location.origin);
      if (!["http:", "https:"].includes(safeUrl.protocol)) throw new Error("Link invalid");
      window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
      return true;
    }
    throw new Error("Documentul nu este disponibil");
  };

  const handleDownloadOfferDoc = async (offerId: number, key: string) => {
    if (!orderHash) return;
    setDownloadingOfferId(offerId);
    setDownloadErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    try {
      await downloadSingleOfferDoc(offerId);
      // Also download PAD document if PAD is included and has a real API offer
      if (withPad && padOffer && padOffer.id > 0) {
        // Small delay so browser doesn't block the second popup
        await new Promise((r) => setTimeout(r, 500));
        await downloadSingleOfferDoc(padOffer.id).catch(() => {/* PAD doc optional */});
      }
    } catch {
      setDownloadErrors((prev) => ({ ...prev, [key]: "Document indisponibil pentru acest asigurator" }));
    } finally {
      setDownloadingOfferId(null);
    }
  };

  const steps = [
    {
      title: "Detalii Locuinta",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalii locuinta</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip constructie</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={constructionTypeCode}
                onChange={(e) => setConstructionTypeCode(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {constructionTypes.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">An constructie</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={constructionYear ?? ""}
                onChange={(e) => setConstructionYear(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Suprafata (mp)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={surfaceArea ?? ""}
                onChange={(e) => setSurfaceArea(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar camere</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={numberOfRooms ?? ""}
                onChange={(e) => setNumberOfRooms(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar etaje</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={noOfFloors}
                min={0}
                onChange={(e) => setNoOfFloors(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip finisaj</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={finishTypeCode}
                onChange={(e) => setFinishTypeCode(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {finishTypes.map((f) => (
                  <option key={f.code} value={f.code}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mediu</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={environmentTypeCode}
                onChange={(e) => setEnvironmentTypeCode(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {environmentTypes.map((et) => (
                  <option key={et.code} value={et.code}>{et.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip proprietate PAD</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={padPropertyType}
                onChange={(e) => setPadPropertyType(e.target.value)}
              >
                <option value="A">Tip A (beton, caramida)</option>
                <option value="B">Tip B (lemn, chirpici)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Structura cladire</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={buildingStructureTypeId}
                onChange={(e) => setBuildingStructureTypeId(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {buildingStructures.map((bs) => (
                  <option key={bs.id} value={bs.id}>{bs.description || bs.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip constructie PAD</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={padConstructionTypeId}
                onChange={(e) => setPadConstructionTypeId(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {padConstructionTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.description || ct.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tip ocupare</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={occupationType}
              onChange={(e) => setOccupationType(e.target.value)}
            >
              {occupationTypes.length > 0
                ? occupationTypes.map((ot) => (
                    <option key={ot.code} value={ot.code}>{ot.name}</option>
                  ))
                : <>
                    <option value="Permanent">Permanent</option>
                    <option value="Temporar">Temporar / Casa de vacanta</option>
                    <option value="Nelocuit">Nelocuit</option>
                  </>
              }
            </select>
          </div>

          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">Adresa locuinta</h4>
            <AddressForm value={houseAddress} onChange={setHouseAddress} />
            {isBloc && !houseAddress.floorId && (
              <p className="mt-2 text-xs font-medium text-amber-600">Etajul este obligatoriu pentru locuinta tip apartament (Bloc).</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Data inceput polita</label>
            <DateInput
              value={policyStartDate}
              min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()}
              onChange={(v) => setPolicyStartDate(v)}
            />
          </div>

          <h4 className="text-sm font-semibold text-gray-700">Sume asigurate</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Suma cladire (EUR)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={buildingSum || ""}
                onChange={(e) => setBuildingSum(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Suma continut (EUR)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={contentSum || ""}
                onChange={(e) => setContentSum(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* PAD (mandatory) */}
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">PAD inclus (asigurare obligatorie)</p>
                <p className="text-xs text-gray-500">Polita PAD este obligatorie conform legii si va fi emisa impreuna cu asigurarea facultativa.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasPreviousPad"
                checked={hasPreviousPad}
                onChange={(e) => setHasPreviousPad(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="hasPreviousPad" className="text-sm text-gray-600">
                Am deja o polita PAD (reinnoire)
              </label>
            </div>

                {hasPreviousPad && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Serie polita PAD anterioara</label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          value={padPreviousSeries}
                          onChange={(e) => setPadPreviousSeries(e.target.value.toUpperCase())}
                          placeholder="ex: PAD"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Numar polita PAD anterioara</label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          value={padPreviousNumber}
                          onChange={(e) => setPadPreviousNumber(e.target.value)}
                          placeholder="ex: 00198499747"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Data inceput PAD (reinnoire)</label>
                      <DateInput
                        value={padStartDate}
                        onChange={(v) => setPadStartDate(v)}
                        min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()}
                        max={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })()}
                      />
                      <p className="mt-1 text-[10px] text-gray-400">Alege data de inceput ca prima zi dupa ziua de expirare a politei actuale</p>
                    </div>
                  </div>
                )}
          </div>

          {/* Cesiune (bank cession) */}
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <button
              type="button"
              onClick={() => {
                setWantsCesiune(!wantsCesiune);
                if (wantsCesiune) {
                  setSelectedCesionari([]);
                  setCessionMentions("");
                  setFirstHomeCessioned(false);
                  setCessionAmount(null);
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

            {wantsCesiune && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                {/* Search by name or CUI */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Cauta banca dupa nume sau CUI</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
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
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{firstHomeCessioned ? "50%" : "100%"}</span>
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

                {/* Mentions */}
                {selectedCesionari.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Mentiuni cesiune (nr. contract, etc.)</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      placeholder="ex: contract nr. 12345 / 2024"
                      value={cessionMentions}
                      onChange={(e) => setCessionMentions(e.target.value)}
                    />
                  </div>
                )}

                {/* Prima Casa / Noua Casa */}
                {selectedCesionari.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="firstHomeCessioned"
                        checked={firstHomeCessioned}
                        onChange={(e) => { setFirstHomeCessioned(e.target.checked); if (!e.target.checked) setCessionAmount(null); }}
                        className="rounded"
                      />
                      <label htmlFor="firstHomeCessioned" className="text-sm text-gray-700">
                        Program Prima Casa / Noua Casa
                      </label>
                    </div>
                    {firstHomeCessioned && (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Cesiunea se imparte: 50% Ministerul Finantelor (MFP) + 50% banca creditoare</p>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Suma cesionata (EUR)</label>
                          <input
                            type="number"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            value={cessionAmount ?? ""}
                            onChange={(e) => setCessionAmount(e.target.value ? Number(e.target.value) : null)}
                            placeholder="ex: 50000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="button" onClick={() => isHouseDetailsValid && next()} disabled={!isHouseDetailsValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            Continua
          </button>
        </div>
      ),
    },
    {
      title: "Date Asigurat",
      content: !showDntSubstep ? (
        <div className="space-y-6">
          <PersonForm
            value={contractor}
            onChange={setContractor}
            title="Contractant / Asigurat"
            hideIdDocument
            onCopyAddress={() =>
              setContractor((prev) => ({
                ...prev,
                address: { ...houseAddress, addressType: "HOME" },
              }))
            }
            copyAddressLabel="Adresa identica cu locuinta asigurata"
          />
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-gray-600">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>
              Apăsând <strong>Continuă</strong>, sunteți de acord cu prelucrarea datelor personale conform legislației europene GDPR și a legilor asigurărilor.{" "}
              <button type="button" onClick={() => setShowGdprModal(true)} className="font-medium text-blue-600 underline hover:text-blue-800">Detalii</button>
            </span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={prev} className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Inapoi</button>
            <button type="button" onClick={() => isContractorValid && setShowDntSubstep(true)} disabled={!isContractorValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Continuă</button>
          </div>
        </div>
      ) : (
        <DntChoice
          productLabel="Locuință"
          onContinueDirect={() => { setShowDntSubstep(false); next(); }}
          onBack={() => setShowDntSubstep(false)}
        />
      ),
    },
    {
      title: "Oferte",
      content: (
        <div className="space-y-4">
          {/* Property summary bar */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-blue-400">Locuinta asigurata</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-700">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg>
                <span className="font-medium">{constructionYear}</span> · {constructionTypes.find(c => c.code === constructionTypeCode)?.name || constructionTypeCode}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                <span className="font-medium">{surfaceArea} m²</span> · {numberOfRooms} camere
              </span>
              {buildingSum > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  Cladire: <span className="font-medium">{buildingSum.toLocaleString("ro-RO")} EUR</span>
                  {contentSum > 0 && <> · Continut: <span className="font-medium">{contentSum.toLocaleString("ro-RO")} EUR</span></>}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
                Incepe: <span className="font-medium">{policyStartDate}</span>
              </span>
              {withPad && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">+ PAD inclus</span>
              )}
            </div>
          </div>

          {loadingOffers && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
              Se genereaza ofertele...
            </div>
          )}
          {offers.length > 0 && (() => {
            // Only JS/network errors go to "indisponibil" — zero-premium stays in main grid
            const mainOffers = offers.filter((o) => !o.error);
            const failedOffers = offers.filter((o) => !!o.error);

            const SPECIFIC_LABELS: Record<string, string> = {
              PORTABLE_GOODS_INSURED_SUM: "Bunuri portabile",
              GOODS_VALUE_INSURED_SUM: "Valoare bunuri",
              INDOOR_INSTALLATIONS_INSURED_SUM: "Instalatii interioare",
              TECHNICAL_ASSISTANCE: "Asistenta tehnica",
              TENANT_LIABILITY_COVERAGE_INSURED_SUM: "Raspundere chirias",
              LOSE_RENT_INSURED_SUM: "Pierdere chirie",
              GARDEN_COVERAGE_INSURED_SUM: "Gradina",
              PERISHABLE_GOODS_BREAKAGE_INSURED_SUM: "Bunuri perisabile",
              STOLEN_CONSTRUCTION_PARTS_INSURED_SUM: "Parti furate",
            };

            // Group by vendor
            const grouped = mainOffers.reduce<Record<string, HouseOffer[]>>((acc, o) => {
              const key = o.vendorName || "Altii";
              if (!acc[key]) acc[key] = [];
              acc[key].push(o);
              return acc;
            }, {});

            // Sort vendors: those with at least one valid price first
            const sortedVendors = Object.keys(grouped).sort((a, b) => {
              const aHasPrice = grouped[a].some((o) => !o.hasApiError && o.policyPremium > 0);
              const bHasPrice = grouped[b].some((o) => !o.hasApiError && o.policyPremium > 0);
              if (aHasPrice && !bHasPrice) return -1;
              if (!aHasPrice && bHasPrice) return 1;
              return 0;
            });

            const palette = ["bg-blue-600","bg-emerald-600","bg-violet-600","bg-orange-500","bg-rose-600","bg-cyan-600","bg-pink-600"];
            const vendorColors: Record<string, string> = {};
            sortedVendors.forEach((v, i) => { vendorColors[v] = palette[i % palette.length]; });

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mainOffers.filter(o => o.policyPremium > 0).length} oferte disponibile
                  </h3>
                  <button type="button" onClick={() => { setOffers([]); setSelectedOffer(null); setPadOffer(null); setOrderId(null); setOrderHash(null); setError(null); prev(); }} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    Inapoi
                  </button>
                </div>

                {sortedVendors.map((vendor) => { const vendorOffers = grouped[vendor]; return (
                  <div key={vendor}>
                    <div className="mb-3 flex items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${vendorColors[vendor]}`}>
                        {vendor.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{vendor}</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {vendorOffers.map((offer, offerIdx) => {
                        const isSelected = selectedOffer?.id === offer.id;
                        const unavailable = offer.hasApiError || offer.policyPremium === 0;
                        const relevantDetails = (offer.specificDetails || []).filter(
                          (d) => d.value !== 0 && d.value !== false && d.value !== null && SPECIFIC_LABELS[d.code]
                        );
                        const coverages = offer.coverages || [];
                        const totalWithPad = withPad && padOffer
                          ? offer.policyPremium + padOffer.premium
                          : null;

                        return (
                          <div
                            key={`${vendor}-${offer.id ?? offerIdx}`}
                            className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                              unavailable
                                ? "border-gray-100 bg-gray-50 opacity-60"
                                : isSelected
                                  ? "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-500/10"
                                  : "border-gray-200 bg-white"
                            }`}
                          >
                            {/* Header: name + price */}
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{offer.productName}</p>
                                {offer.productSubPackage && (
                                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                    {offer.productSubPackage}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                {unavailable ? (
                                  <div className="text-right">
                                    <span className="text-xs font-medium text-red-400">Indisponibil</span>
                                    {offer.message && (
                                      <p className="mt-0.5 max-w-[160px] text-[10px] leading-tight text-gray-400">
                                        {offer.message.split("|").pop()?.trim()}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xl font-bold text-blue-600 leading-tight">
                                      {offer.policyPremium.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[11px] font-medium text-gray-400">{offer.currency} / an</p>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Sume asigurate */}
                            {!unavailable && (offer.insuredAmount != null || offer.contentAmount != null) && (
                              <div className="mb-3 grid grid-cols-2 gap-2">
                                {offer.insuredAmount != null && offer.insuredAmount > 0 && (
                                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Cladire asigurata</p>
                                    <p className="text-sm font-bold text-slate-800">
                                      {Number(offer.insuredAmount).toLocaleString("ro-RO")}
                                      <span className="ml-1 text-xs font-normal text-slate-400">{offer.insuredAmountCurrency || offer.currency}</span>
                                    </p>
                                  </div>
                                )}
                                {offer.contentAmount != null && offer.contentAmount > 0 && (
                                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Continut asigurat</p>
                                    <p className="text-sm font-bold text-slate-800">
                                      {Number(offer.contentAmount).toLocaleString("ro-RO")}
                                      <span className="ml-1 text-xs font-normal text-slate-400">{offer.currency}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Coverages (named risks with sums) */}
                            {!unavailable && coverages.length > 0 && (
                              <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2">
                                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-400">Riscuri acoperite</p>
                                <div className="space-y-1">
                                  {coverages.map((cov, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                        <svg className="h-2.5 w-2.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        {cov.name}
                                      </span>
                                      {cov.sumInsured != null && cov.sumInsured > 0 && (
                                        <span className="shrink-0 text-[11px] font-semibold text-gray-700">
                                          {Number(cov.sumInsured).toLocaleString("ro-RO")} {offer.currency}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Extra coverages from specificDetails */}
                            {!unavailable && relevantDetails.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1.5">
                                {relevantDetails.map((d) => (
                                  <span key={d.code} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {SPECIFIC_LABELS[d.code]}
                                    {typeof d.value === "number" && d.value > 0 && (
                                      <span className="font-semibold"> {Number(d.value).toLocaleString("ro-RO")}</span>
                                    )}
                                    {typeof d.value === "string" && ` · ${d.value}`}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* PAD breakdown */}
                            {!unavailable && withPad && padOffer && (
                              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-gray-600">Prima locuinta (facultativa)</span>
                                  <span className="font-semibold text-gray-800">{offer.policyPremium.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {offer.currency}</span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between text-[11px]">
                                  <span className="text-gray-600">Prima PAD (PAID)</span>
                                  <span className="font-semibold text-gray-800">{padOffer.premium.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {padOffer.currency}</span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between border-t border-blue-100 pt-1.5 text-[12px]">
                                  <span className="font-semibold text-blue-700">Total de plata</span>
                                  {offer.currency === padOffer.currency ? (
                                    <span className="font-bold text-blue-700">{totalWithPad!.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {offer.currency}</span>
                                  ) : (
                                    <span className="font-bold text-blue-700">{offer.policyPremium.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {offer.currency} + {padOffer.premium.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {padOffer.currency}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Recommendation note */}
                            {!unavailable && offer.message && (() => {
                              const note = offer.message.split("|").pop()?.trim();
                              return note ? (
                                <p className="mb-2 line-clamp-2 rounded-md bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-700">
                                  ℹ {note}
                                </p>
                              ) : null;
                            })()}

                            {/* Installments */}
                            {!unavailable && offer.installments && offer.installments.length > 1 && (
                              <div className="border-t border-gray-100 pt-2">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Rate plata</p>
                                <div className="space-y-0.5">
                                  {offer.installments.map((inst, idx) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-gray-600">
                                      <span>Rata {inst.number}</span>
                                      <span className="font-medium">{Number(inst.amount).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {offer.currency}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action buttons */}
                            {!unavailable && (()=> {
                              const cardKey = offer.id != null ? String(offer.id) : `${vendor}-${offerIdx}`;
                              const dlError = downloadErrors[cardKey];
                              const noId = offer.id == null;
                              return (
                                <div className="mt-3 border-t border-gray-100 pt-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadOfferDoc(offer.id!, cardKey)}
                                      disabled={downloadingOfferId === offer.id || noId}
                                      title={noId ? "Document indisponibil pentru acest asigurator" : undefined}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {downloadingOfferId === offer.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                                      ) : (
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                      )}
                                      Descarca oferta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOffer(offer);
                                        // Save HOUSE policy data for callback page (PAD offer + renewal info)
                                        try {
                                          sessionStorage.setItem("housePolicyData", JSON.stringify({
                                            padOfferId: padOffer && padOffer.id > 0 ? padOffer.id : null,
                                            padPreviousPolicySeries: hasPreviousPad && padPreviousSeries ? padPreviousSeries : null,
                                            padPreviousPolicyNumber: hasPreviousPad && padPreviousNumber ? padPreviousNumber : null,
                                          }));
                                        } catch { /* */ }
                                        next();
                                      }}
                                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                                        isSelected ? "bg-blue-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
                                      }`}
                                    >
                                      {isSelected ? (
                                        <>
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                          Selectata
                                        </>
                                      ) : (
                                        <>
                                          Alege aceasta oferta
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {dlError && (
                                    <p className="mt-1.5 text-[10px] text-amber-600">{dlError}</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ); })}

                {/* JS/network errors */}
                {failedOffers.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-400">Erori tehnice ({failedOffers.length})</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {failedOffers.map((offer, i) => (
                        <div key={offer.id || i} className="rounded-xl border border-red-100 bg-red-50/50 p-3 opacity-60">
                          <p className="text-sm font-medium text-gray-700">{offer.productName || "Necunoscut"}</p>
                          <p className="text-xs text-gray-400">{offer.vendorName}</p>
                          <p className="mt-1 text-xs text-red-500">{offer.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })()}
        </div>
      ),
    },
    {
      title: "Plata",
      content: selectedOffer && orderId && orderHash ? (
        <PaymentFlow
          orderId={orderId}
          offerId={selectedOffer.id}
          orderHash={orderHash}
          amount={selectedOffer.policyPremium}
          currency={selectedOffer.currency}
          productType="HOUSE"
          additionalOfferIds={padOffer && padOffer.id > 0 ? [padOffer.id] : undefined}
          padPremium={withPad && padOffer ? padOffer.premium : undefined}
          padCurrency={withPad && padOffer ? padOffer.currency : undefined}
        />
      ) : (
        <p className="text-gray-500">Selectati mai intai o oferta.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Asigurare Locuinta</h1>
        <p className="mt-1 text-sm text-gray-500">Protectie completa pentru locuinta dumneavoastra</p>
      </div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Inchide</button>
        </div>
      )}
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />


      {/* GDPR Modal */}
      {showGdprModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowGdprModal(false)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Politica de prelucrare a datelor personale</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <p>În conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastră personale sunt prelucrate în scopul ofertării și emiterii polițelor de asigurare.</p>
              <p>Datele colectate (CNP/CUI, email, date personale) sunt transmise către societățile de asigurare partenere exclusiv în scopul generării ofertelor și emiterii poliței selectate.</p>
              <p>Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor, precum și dreptul de a vă opune prelucrării. Pentru exercitarea acestor drepturi, ne puteți contacta la adresa de email indicată pe site.</p>
              <p>Datele sunt stocate pe durata necesară îndeplinirii scopului prelucrării și conform cerințelor legale aplicabile în domeniul asigurărilor.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGdprModal(false)}
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
