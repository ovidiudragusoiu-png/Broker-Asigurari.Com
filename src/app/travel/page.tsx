"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import ConsentFlow from "@/components/shared/ConsentFlow";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import { api } from "@/lib/api/client";
import type { PersonRequest } from "@/types/insuretech";
import { isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildOrderPayload } from "@/lib/flows/payloadBuilders";
import { getArray } from "@/lib/utils/dto";

interface TravelOffer {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  coverages?: { name: string; sumInsured?: number }[];
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

export default function TravelPage() {
  // Utils
  const [zones, setZones] = useState<TravelZone[]>([]);
  const [purposes, setPurposes] = useState<TravelPurpose[]>([]);
  const [products, setProducts] = useState<{ id: string; productName: string }[]>([]);

  // Trip details
  const [zoneId, setZoneId] = useState<string>("");
  const [purposeId, setPurposeId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [numberOfTravelers, setNumberOfTravelers] = useState(1);
  const [travelers, setTravelers] = useState<PersonRequest[]>([emptyPersonPF()]);

  // Order state
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Offers state
  const [offers, setOffers] = useState<TravelOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<TravelOffer | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentStep, next, prev, goTo } = useWizard(5);
  const isTripStepValid =
    !!zoneId &&
    !!purposeId &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate &&
    numberOfTravelers > 0;
  const isTravelersStepValid = travelers.every(isPersonValid);

  // Load utils on mount
  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/travel/comparator/utils")
      .then((data) => {
        setZones(getArray<TravelZone>(data.travelZone));
        setPurposes(getArray<TravelPurpose>(data.travelPurpose));
      })
      .catch(() => setError("Nu am putut incarca utilitarele pentru Travel"));
    api
      .get<{ id: string; productName: string }[]>("/online/products/travel")
      .then(setProducts)
      .catch(() => setError("Nu am putut incarca produsele Travel"));
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

  const handleCreateOrderAndOffers = async () => {
    setError(null);
    setLoadingOffers(true);

    try {
      const { order, offers: results } = await createOrderAndOffers({
        orderPayload: buildOrderPayload(
          "TRAVEL",
          travelers[0],
          travelers[0]
        ),
        fetchBodies: (createdOrder) =>
          api.post<Record<string, unknown>[]>(
            `/online/offers/travel/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
            {
              orderId: createdOrder.id,
              productIds: products.map((p) => p.id),
              travelZoneId: zoneId,
              startDate,
              endDate,
              purposeId,
              numberOfTravelers,
              travelerDetails: travelers,
            }
          ),
        fetchOffer: (body, createdOrder) =>
          api.post<TravelOffer>(
            `/online/offers/travel/comparator/v3?orderHash=${createdOrder.hash}`,
            body
          ),
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
      setOffers(results);
      next();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la crearea comenzii");
    } finally {
      setLoadingOffers(false);
    }
  };

  const steps = [
    {
      title: "Detalii Calatorie",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalii calatorie</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Zona de calatorie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <option value="">Selecteaza zona</option>
                {zones.map((z) => (
                  <option key={z.code} value={z.code}>{z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Scopul calatoriei</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={purposeId}
                onChange={(e) => setPurposeId(e.target.value)}
              >
                <option value="">Selecteaza scopul</option>
                {purposes.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data plecare</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data intoarcere</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Numar calatori</label>
            <input
              type="number"
              min={1}
              max={10}
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={numberOfTravelers}
              onChange={(e) => setNumberOfTravelers(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <button
            type="button"
            onClick={() => isTripStepValid && next()}
            disabled={!isTripStepValid}
            className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Continua
          </button>
        </div>
      ),
    },
    {
      title: "Date Calatori",
      content: (
        <div className="space-y-6">
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
            />
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={prev} className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Inapoi
            </button>
            <button type="button" onClick={() => isTravelersStepValid && next()} disabled={!isTravelersStepValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              Continua
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Consimtamant",
      content: (
        <ConsentFlow
          legalType={travelers[0]?.legalType || "PF"}
          cif={String(travelers[0]?.cif || "")}
          vendorProductType="TRAVEL"
          personData={travelers[0]}
          onComplete={() => {
            next();
          }}
          onError={(msg) => setError(msg)}
        />
      ),
    },
    {
      title: "Oferte",
      content: (
        <div className="space-y-4">
          {!loadingOffers && offers.length === 0 && (
            <div className="text-center">
              <p className="mb-4 text-gray-600">Generati ofertele de calatorie.</p>
              <button
                type="button"
                onClick={handleCreateOrderAndOffers}
                className="rounded-md bg-blue-700 px-8 py-3 text-sm font-medium text-white hover:bg-blue-800"
              >
                Genereaza oferte
              </button>
            </div>
          )}
          {loadingOffers && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
              Se genereaza ofertele...
            </div>
          )}
          {offers.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-gray-900">Oferte Travel disponibile</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer, i) => (
                  <OfferCard
                    key={offer.id || i}
                    productName={offer.productName}
                    vendorName={offer.vendorName}
                    premium={offer.policyPremium}
                    currency={offer.currency}
                    coverages={offer.coverages?.map((c) => ({ name: c.name, sumInsured: c.sumInsured }))}
                    error={offer.error}
                    selected={selectedOffer?.id === offer.id}
                    onSelect={() => !offer.error && setSelectedOffer(offer)}
                  />
                ))}
              </div>
              {selectedOffer && (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Continua la plata
                </button>
              )}
            </>
          )}
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
        />
      ) : (
        <p className="text-gray-500">Selectati mai intai o oferta.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Asigurare de Calatorie</h1>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Inchide</button>
        </div>
      )}
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
    </div>
  );
}
