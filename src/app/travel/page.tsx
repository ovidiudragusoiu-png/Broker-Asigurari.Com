"use client";

import { useState, useEffect, useMemo } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import DntChoice from "@/components/rca/DntChoice";
import { api } from "@/lib/api/client";
import type { PersonRequest } from "@/types/insuretech";
import { isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildOrderPayload } from "@/lib/flows/payloadBuilders";
import { getArray } from "@/lib/utils/dto";
import { birthDateFromCnp } from "@/lib/utils/formatters";
import { btn } from "@/lib/ui/tokens";

interface TravelOfferRaw {
  id: number;
  productId: string;
  policyPremium: number;
  currency: string;
  coverages?: { name: string; sumInsured?: number }[];
  error?: boolean;
  message?: string | null;
  insuredAmount?: string | number;
  insuredAmountCurrency?: string;
  productDetails?: {
    id: number;
    productName: string;
    productSubPackage?: string;
    vendorDetails?: { commercialName: string; linkLogo?: string };
  };
}

interface TravelOffer {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  vendorLogo?: string;
  policyPremium: number;
  currency: string;
  coverages?: { name: string; sumInsured?: number }[];
  insuredAmount?: string | number;
  insuredAmountCurrency?: string;
  packageName?: string;
  error?: string;
}

interface TravelZone {
  code: string;
  name: string;
}

interface TravelPurpose {
  code: string;
  name: string;
}

interface TravelMethod {
  code: string;
  name: string;
}

interface DestinationCountry {
  id: number;
  code: string;
  name: string;
}

// Geographic Europe country codes (ISO 2-letter) for zone filtering
const EUROPE_CODES = new Set([
  "AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE",
  "GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL",
  "MK","NO","PL","PT","RS","SK","SI","ES","SE","CH","UA","GB","VA","SM",
]);

// Add more zone→country-code sets as needed
const ZONE_COUNTRY_MAP: Record<string, Set<string> | null> = {
  // null = show all countries (worldwide)
};

/** Return the country code set for a zone, or null (show all). */
function countrySetForZone(zoneCode: string, zoneName: string): Set<string> | null {
  // Check explicit map first
  if (ZONE_COUNTRY_MAP[zoneCode]) return ZONE_COUNTRY_MAP[zoneCode];
  // Heuristic: zone code or name contains "europ"
  const upper = `${zoneCode} ${zoneName}`.toUpperCase();
  if (upper.includes("EUROP")) return EUROPE_CODES;
  return null; // worldwide / unknown → show all
}

export default function TravelPage() {
  // Utils
  const [zones, setZones] = useState<TravelZone[]>([]);
  const [purposes, setPurposes] = useState<TravelPurpose[]>([]);
  const [methods, setMethods] = useState<TravelMethod[]>([]);
  const [countries, setCountries] = useState<DestinationCountry[]>([]);
  const [products, setProducts] = useState<{ id: string; productName: string }[]>([]);

  // Trip details (zone/purpose/method are string codes per API docs)
  const [travelZone, setTravelZone] = useState<string>("");
  const [destinationCountryId, setDestinationCountryId] = useState<string>("");
  const [travelPurpose, setTravelPurpose] = useState<string>("");
  const [travelMethod, setTravelMethod] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [numberOfTravelers, setNumberOfTravelers] = useState(1);
  const [travelers, setTravelers] = useState<PersonRequest[]>([emptyPersonPF()]);

  // Optional coverage options
  const [summerSports, setSummerSports] = useState(false);
  const [winterSports, setWinterSports] = useState(false);
  const [withStorno, setWithStorno] = useState(false);
  const [stornoInsuredValueEUR, setStornoInsuredValueEUR] = useState<number | "">("");
  const [stornoStartDate, setStornoStartDate] = useState("");
  const [roadAssistance, setRoadAssistance] = useState(false);
  const [vehiclePlateNo, setVehiclePlateNo] = useState("");
  const [vehicleVIN, setVehicleVIN] = useState("");
  const [vehicleFirstRegistration, setVehicleFirstRegistration] = useState("");
  const [isClientInRomania, setIsClientInRomania] = useState(true);

  // Order state
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Offers state
  const [offers, setOffers] = useState<TravelOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<TravelOffer | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDntSubstep, setShowDntSubstep] = useState(false);
  const [downloadingOfferId, setDownloadingOfferId] = useState<number | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  // Filter countries based on selected travel zone
  const filteredCountries = useMemo(() => {
    if (!travelZone) return countries;
    const selectedZone = zones.find((z) => z.code === travelZone);
    const allowed = countrySetForZone(travelZone, selectedZone?.name || "");
    if (!allowed) return countries; // worldwide → all
    return countries.filter((c) => allowed.has(c.code));
  }, [travelZone, countries, zones]);

  const { currentStep, next, prev, goTo } = useWizard(4);
  const isTripStepValid =
    !!travelZone &&
    !!destinationCountryId &&
    !!travelPurpose &&
    !!travelMethod &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate &&
    numberOfTravelers > 0;
  const isTravelersStepValid = travelers.every((t) => isPersonValid(t));

  // Load utils on mount
  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/travel/comparator/utils")
      .then((data) => {
        setZones(getArray<TravelZone>(data.travelZone));
        setPurposes(getArray<TravelPurpose>(data.travelPurpose));
        setMethods(getArray<TravelMethod>(data.travelMethod));
      })
      .catch(() => setError("Nu am putut incarca utilitarele pentru Travel"));
    api
      .get<{ id: string; productName: string }[]>("/online/products/travel")
      .then(setProducts)
      .catch(() => setError("Nu am putut incarca produsele Travel"));
    api
      .get<DestinationCountry[]>("/online/address/utils/countries")
      .then(setCountries)
      .catch(() => setError("Nu am putut incarca lista de tari"));
  }, []);

  // Sync travelers array with numberOfTravelers
  useEffect(() => {
    setTravelers((prev) => {
      if (prev.length < numberOfTravelers) {
        return [
          ...prev,
          ...Array.from(
            { length: numberOfTravelers - prev.length },
            () => emptyPersonPF()
          ),
        ];
      }
      return prev.slice(0, numberOfTravelers);
    });
  }, [numberOfTravelers]);

  // Clear stale offers/order when navigating back to trip or travelers steps
  const offersStepIndex = 2; // 0-indexed: Trip, Travelers, Offers, Payment
  useEffect(() => {
    if (currentStep < offersStepIndex) {
      setOffers([]);
      setSelectedOffer(null);
      setOrderId(null);
      setOrderHash(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Auto-generate offers when entering the Offers step
  useEffect(() => {
    if (currentStep === offersStepIndex && offers.length === 0 && !loadingOffers && !error) {
      handleCreateOrderAndOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleCreateOrderAndOffers = async () => {
    setError(null);
    setLoadingOffers(true);

    try {
      // Normalize travelers: default streetTypeId to 1 ("Strada") when null
      const normalizedTravelers = travelers.map((t) => ({
        ...t,
        address: { ...t.address, streetTypeId: t.address.streetTypeId ?? 1 },
      }));

      // Auto-sign consent documents (same as RCA flow)
      const firstTraveler = normalizedTravelers[0];
      const cifStr = String(firstTraveler.cif || "");
      const legalType = firstTraveler.legalType;

      let consentSigned = false;
      try {
        const consentStatus = await api.get<{ signedDocuments: boolean }>(
          `/online/client/documents/status?legalType=${legalType}&cif=${cifStr}&vendorProductType=TRAVEL`
        );
        consentSigned = consentStatus.signedDocuments;
      } catch {
        // Status check failed - assume not signed
      }

      if (!consentSigned) {
        const consentData = await api.get<{
          sections: { title: string; questions: { id: string; type?: string; answers: { id: string; defaultValue: string }[] }[] }[];
          communicationChannels: string[];
        }>(
          `/online/client/documents/fetch-questions?legalType=${legalType}&vendorProductType=TRAVEL`
        );

        const formInputData: Record<string, boolean | string> = {};
        for (const section of consentData.sections) {
          for (const question of section.questions) {
            if (question.type === "text") {
              formInputData[question.id] = "";
            } else {
              for (const answer of question.answers) {
                formInputData[answer.id] = answer.defaultValue === "true";
              }
            }
          }
        }

        await api.post("/online/client/documents/submit-answers", {
          personBaseRequest: firstTraveler,
          communicationChannelEmail: true,
          communicationChannelPhoneNo: false,
          communicationChannelAddress: false,
          formInputData,
          vendorProductType: "TRAVEL",
          website: typeof window !== "undefined" ? window.location.origin : "https://www.broker-asigurari.com",
        });
      }

      // Add dateOfBirth to travelers (yyyy-MM-dd format per API docs)
      const travelersWithDob = normalizedTravelers.map((t) => {
        const bd = t.legalType === "PF" ? birthDateFromCnp(t.cif) : null;
        return {
          ...t,
          dateOfBirth: bd || undefined,
        };
      });

      // Build order payload with mainInsured + otherInsuredsDetails per API docs
      const mainInsured = travelersWithDob[0];
      const otherInsureds = travelersWithDob.slice(1);
      const orderPayload = {
        ...buildOrderPayload("TRAVEL", mainInsured, mainInsured),
        ...(otherInsureds.length > 0 && {
          otherInsuredsDetails: otherInsureds.map((t) => ({
            ...t,
            policyPartyType: "INSURED",
          })),
        }),
      };

      const { order, offers: results } = await createOrderAndOffers<Record<string, unknown>, TravelOffer[]>({
        orderPayload,
        fetchBodies: async (createdOrder) => {
          // Bodies payload per API docs: NO travelerDetails, correct offerDetails field names
          const payload = {
            orderId: createdOrder.id,
            productIds: products.map((p) => Number(p.id)),
            policyStartDate: `${startDate}T00:00:00`,
            policyEndDate: `${endDate}T00:00:00`,
            offerDetails: {
              travelZone,
              travelPurpose,
              travelMethod,
              destinationCountryId: Number(destinationCountryId),
              residencyCountryId: 185,
              summerSports,
              winterSports,
              withStorno,
              ...(withStorno && stornoInsuredValueEUR && {
                stornoInsuredValueEUR: Number(stornoInsuredValueEUR),
                stornoStartDate: stornoStartDate ? `${stornoStartDate}T00:00:00` : undefined,
              }),
              roadAssistance,
              ...(roadAssistance && {
                ...(vehiclePlateNo && { vehiclePlateNo }),
                ...(vehicleVIN && { vehicleVIN }),
                ...(vehicleFirstRegistration && { vehicleFirstRegistration: `${vehicleFirstRegistration}T00:00:00` }),
              }),
              isClientInRomania,
            },
          };
          return api.post<Record<string, unknown>[]>(
            `/online/offers/travel/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
            payload
          );
        },
        fetchOffer: async (body, createdOrder) => {
          // Comparator returns an ARRAY of offers per the API docs
          const rawArr = await api.post<TravelOfferRaw[]>(
            `/online/offers/travel/comparator/v3?orderHash=${createdOrder.hash}`,
            body
          );
          const items = Array.isArray(rawArr) ? rawArr : [rawArr];
          if (items.length === 0) {
            return [{
              id: 0,
              productId: String((body as Record<string, unknown>).productId || ""),
              productName: "Necunoscut",
              vendorName: "",
              policyPremium: 0,
              currency: "RON",
              error: "Nu s-a primit nicio oferta",
            }];
          }
          return items.map((raw) => ({
            ...raw,
            productName: raw.productDetails?.productName || "Necunoscut",
            vendorName: raw.productDetails?.vendorDetails?.commercialName || "",
            vendorLogo: raw.productDetails?.vendorDetails?.linkLogo || undefined,
            packageName: raw.productDetails?.productSubPackage || undefined,
            insuredAmount: raw.insuredAmount,
            insuredAmountCurrency: raw.insuredAmountCurrency,
            error: raw.error ? (raw.message || "Eroare generare oferta") : undefined,
          }));
        },
        mapOfferError: (body, err) => ([{
          id: 0,
          productId: String(body.productId || ""),
          productName: String(body.productName || "Necunoscut"),
          vendorName: "",
          policyPremium: 0,
          currency: "RON",
          error: err instanceof Error ? err.message : "Eroare generare oferta",
        }]),
      });

      setOrderId(order.id);
      setOrderHash(order.hash);
      setOffers(results.flat());
    } catch (err) {
      const apiErr = err as { message?: string; data?: unknown };
      const detail = apiErr.data ? JSON.stringify(apiErr.data) : "";
      setError(`${apiErr.message || "Eroare la crearea comenzii"}${detail ? ` | ${detail}` : ""}`);
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleDownloadOfferDoc = async (offerId: number, cardKey: string) => {
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

  const steps = [
    {
      title: "Detalii Calatorie",
      content: (() => {
        const selectCls = "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
        const inputCls = "w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm transition-colors duration-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
        const toggleCls = (on: boolean) => `flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs font-medium transition-all duration-200 ${on ? "border-[#2563EB] bg-blue-50/60 text-blue-700" : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"}`;
        return (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Main card — destination + trip + travelers */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Zona</label>
                <select className={selectCls} value={travelZone} onChange={(e) => { setTravelZone(e.target.value); setDestinationCountryId(""); }}>
                  <option value="">Selecteaza zona</option>
                  {zones.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Tara destinatie</label>
                <select className={selectCls} value={destinationCountryId} onChange={(e) => setDestinationCountryId(e.target.value)}>
                  <option value="">Selecteaza tara</option>
                  {filteredCountries.filter((c) => c.code !== "RO").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Scopul calatoriei</label>
                <select className={selectCls} value={travelPurpose} onChange={(e) => setTravelPurpose(e.target.value)}>
                  <option value="">Selecteaza scopul</option>
                  {purposes.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Mijloc de transport</label>
                <select className={selectCls} value={travelMethod} onChange={(e) => setTravelMethod(e.target.value)}>
                  <option value="">Selecteaza transportul</option>
                  {methods.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Data plecare</label>
                <input type="date" className={selectCls} value={startDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => { const v = e.target.value; setStartDate(v); if (endDate && endDate < v) setEndDate(v); else if (!endDate && v) setEndDate(v); }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Data intoarcere</label>
                <input type="date" className={selectCls} value={endDate} min={startDate || new Date().toISOString().split("T")[0]} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Travelers inline */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-medium text-gray-700">Numar calatori</span>
              <div className="flex items-center">
                <button type="button" onClick={() => setNumberOfTravelers(Math.max(1, numberOfTravelers - 1))} className="flex h-8 w-8 items-center justify-center rounded-l-lg border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                </button>
                <div className="flex h-8 w-10 items-center justify-center border-y-2 border-gray-200 bg-white text-sm font-bold text-gray-900">{numberOfTravelers}</div>
                <button type="button" onClick={() => setNumberOfTravelers(Math.min(10, numberOfTravelers + 1))} className="flex h-8 w-8 items-center justify-center rounded-r-lg border-2 border-l-0 border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Options — compact toggles */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Optiuni suplimentare</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => setSummerSports(!summerSports)} className={toggleCls(summerSports)}>
                ☀️ Sporturi vara
                {summerSports && <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
              <button type="button" onClick={() => setWinterSports(!winterSports)} className={toggleCls(winterSports)}>
                ⛷️ Sporturi iarna
                {winterSports && <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
              <button type="button" onClick={() => setWithStorno(!withStorno)} className={toggleCls(withStorno)}>
                🔄 Storno
                {withStorno && <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
              <button type="button" onClick={() => setRoadAssistance(!roadAssistance)} className={toggleCls(roadAssistance)}>
                🚗 Asist. rutiera
                {roadAssistance && <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
            </div>

            {/* Storno sub-fields */}
            {withStorno && (
              <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Valoare asigurata (EUR)</label>
                  <input type="number" min={1} placeholder="ex: 2000" className={inputCls} value={stornoInsuredValueEUR} onChange={(e) => setStornoInsuredValueEUR(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Data rezervare</label>
                  <input type="date" className={inputCls} value={stornoStartDate} onChange={(e) => setStornoStartDate(e.target.value)} />
                </div>
              </div>
            )}

            {/* Road assistance sub-fields */}
            {roadAssistance && (
              <div className="mt-2 grid grid-cols-3 gap-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Nr. inmatriculare</label>
                  <input type="text" placeholder="B 123 ABC" className={inputCls} value={vehiclePlateNo} onChange={(e) => setVehiclePlateNo(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Serie sasiu (VIN)</label>
                  <input type="text" placeholder="WVWZZZ3CZ..." className={inputCls} value={vehicleVIN} onChange={(e) => setVehicleVIN(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Prima inmatriculare</label>
                  <input type="date" className={inputCls} value={vehicleFirstRegistration} onChange={(e) => setVehicleFirstRegistration(e.target.value)} />
                </div>
              </div>
            )}

            {/* Client in Romania — inline toggle */}
            <div className="mt-2">
              <button type="button" onClick={() => setIsClientInRomania(!isClientInRomania)} className={`${toggleCls(isClientInRomania)} w-full`}>
                📍 Clientul se afla in Romania
                {isClientInRomania && <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
            </div>
          </div>

          {/* Continue */}
          <div className="text-center pt-1">
            <button type="button" onClick={() => isTripStepValid && next()} disabled={!isTripStepValid} className={btn.primary}>
              <span className="flex items-center justify-center gap-2">
                Continua
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </span>
            </button>
          </div>
        </div>
        );
      })(),
    },
    {
      title: "Date Calatori",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {!showDntSubstep ? (
            <>
              {travelers.map((traveler, i) => (
                <PersonForm
                  key={i}
                  value={traveler}
                  onChange={(val) => {
                    const updated = [...travelers];
                    updated[i] = val;
                    setTravelers(updated);
                  }}
                  title={`Calator ${i + 1}`}
                  onCopyAddress={i > 0 ? () => {
                    const updated = [...travelers];
                    updated[i] = { ...updated[i], address: { ...travelers[0].address } };
                    setTravelers(updated);
                  } : undefined}
                  copyAddressLabel="Copiaza adresa de la Calator 1"
                />
              ))}
              {/* GDPR notice */}
              <div className="flex items-start gap-3 rounded-xl bg-blue-50/60 p-4">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-sm text-gray-600">
                  Apăsând <strong>Continuă</strong>, sunteți de acord cu prelucrarea datelor personale
                  conform legislației europene GDPR și a legilor asigurărilor.{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(!showPrivacy)}
                    className="font-semibold text-[#2563EB] underline hover:text-blue-700"
                  >
                    Detalii
                  </button>
                </p>
              </div>

              {/* Privacy policy modal */}
              {showPrivacy && (
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
                        În conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastră personale
                        sunt prelucrate în scopul ofertării și emiterii polițelor de asigurare.
                      </p>
                      <p>
                        Datele colectate (CNP/CUI, email, date personale) sunt transmise către societățile
                        de asigurare partenere exclusiv în scopul generării ofertelor și emiterii poliței selectate.
                      </p>
                      <p>
                        Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor, precum și
                        dreptul de a vă opune prelucrării. Pentru exercitarea acestor drepturi, ne puteți
                        contacta la adresa de email indicată pe site.
                      </p>
                      <p>
                        Datele sunt stocate pe durata necesară îndeplinirii scopului prelucrării și conform
                        cerințelor legale aplicabile în domeniul asigurărilor.
                      </p>
                    </div>
                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => setShowPrivacy(false)}
                        className={`${btn.primary} px-8`}
                      >
                        Am înțeles
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button type="button" onClick={prev} className={`${btn.secondary} px-8`}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    Inapoi
                  </span>
                </button>
                <button type="button" onClick={() => isTravelersStepValid && setShowDntSubstep(true)} disabled={!isTravelersStepValid} className={`${btn.primary} px-8`}>
                  <span className="flex items-center gap-2">
                    Continua
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </span>
                </button>
              </div>
            </>
          ) : (
            <DntChoice productLabel="Travel" onContinueDirect={() => { setShowDntSubstep(false); next(); }} onBack={() => setShowDntSubstep(false)} />
          )}
        </div>
      ),
    },
    {
      title: "Oferte",
      content: (
        <div className="space-y-4">
          {/* Back button */}
          <button type="button" onClick={prev} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors duration-200 hover:text-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Inapoi la date calatori
          </button>
          {!loadingOffers && offers.length === 0 && !error && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
              Se pregatesc ofertele...
            </div>
          )}
          {loadingOffers && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
              Se genereaza ofertele...
            </div>
          )}
          {offers.length > 0 && (() => {
            // Separate valid offers from errors, sort valid by vendor then price
            const validOffers = offers
              .filter((o) => !o.error)
              .sort((a, b) => a.vendorName.localeCompare(b.vendorName) || a.policyPremium - b.policyPremium);
            const errorOffers = offers.filter((o) => !!o.error);

            // Group by vendor
            const grouped = validOffers.reduce<Record<string, TravelOffer[]>>((acc, offer) => {
              const key = offer.vendorName || "Altele";
              (acc[key] ||= []).push(offer);
              return acc;
            }, {});
            const vendorNames = Object.keys(grouped);

            // Build badges for active options
            const offerBadges: string[] = [];
            if (withStorno && stornoInsuredValueEUR) offerBadges.push(`Storno ${stornoInsuredValueEUR} EUR`);
            else if (withStorno) offerBadges.push("Storno inclus");
            if (roadAssistance) offerBadges.push("Asistenta rutiera");

            return (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  Oferte Travel disponibile
                  <span className="ml-2 text-sm font-normal text-gray-400">({validOffers.length} oferte)</span>
                </h3>

                {vendorNames.map((vendor) => {
                  const vendorOffers = grouped[vendor];
                  const logo = vendorOffers[0]?.vendorLogo;
                  return (
                    <div key={vendor} className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                        {logo ? (
                          <img src={logo} alt={vendor} className="h-7 w-7 rounded object-contain" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-400">
                            {vendor.charAt(0)}
                          </div>
                        )}
                        <h4 className="text-sm font-semibold text-gray-700">{vendor}</h4>
                        <span className="text-xs text-gray-400">({vendorOffers.length})</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {vendorOffers.map((offer, i) => {
                          const cardKey = offer.id ? String(offer.id) : `${vendor}-${i}`;
                          return (
                            <OfferCard
                              key={offer.id || i}
                              productName={offer.packageName ? `${offer.productName} — ${offer.packageName}` : offer.productName}
                              vendorName={vendor}
                              vendorLogo={offer.vendorLogo}
                              premium={offer.policyPremium}
                              currency={offer.currency}
                              insuredAmount={offer.insuredAmount ? Number(offer.insuredAmount) : undefined}
                              insuredAmountCurrency={offer.insuredAmountCurrency}
                              coverages={offer.coverages?.map((c) => ({ name: c.name, sumInsured: c.sumInsured }))}
                              badges={offerBadges.length > 0 ? offerBadges : undefined}
                              priceNote={numberOfTravelers > 1 ? `total pentru ${numberOfTravelers} calatori` : undefined}
                              selected={selectedOffer?.id === offer.id}
                              onSelect={() => { setSelectedOffer(offer); next(); }}
                              onDownload={offer.id ? () => handleDownloadOfferDoc(offer.id, cardKey) : undefined}
                              downloading={downloadingOfferId === offer.id}
                              downloadError={downloadErrors[cardKey]}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Error offers collapsed */}
                {errorOffers.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                      {errorOffers.length} oferte indisponibile
                    </summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {errorOffers.map((offer, i) => (
                        <OfferCard
                          key={offer.id || `err-${i}`}
                          productName={offer.packageName ? `${offer.productName} — ${offer.packageName}` : offer.productName}
                          vendorName={offer.vendorName}
                          vendorLogo={offer.vendorLogo}
                          premium={offer.policyPremium}
                          currency={offer.currency}
                          error={offer.error}
                        />
                      ))}
                    </div>
                  </details>
                )}

              </>
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
          productType="TRAVEL"
          customerEmail={travelers[0]?.email || ""}
          onBack={prev}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Asigurare de Calatorie</h1>
        <p className="mt-1 text-sm text-gray-500">Calatoreste in siguranta oriunde in lume</p>
      </div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 font-medium underline">Inchide</button>
        </div>
      )}
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
    </div>
  );
}
