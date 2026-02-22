"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import AddressForm, { emptyAddress } from "@/components/shared/AddressForm";
import ConsentFlow from "@/components/shared/ConsentFlow";
import PaymentFlow from "@/components/shared/PaymentFlow";
import { api } from "@/lib/api/client";
import type { PersonRequest, AddressRequest } from "@/types/insuretech";
import { formatPrice } from "@/lib/utils/formatters";
import { isAddressValid, isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndSingleOffer } from "@/lib/flows/offerFlow";
import { buildOrderPayload } from "@/lib/flows/payloadBuilders";
import { getArray } from "@/lib/utils/dto";

interface PadOffer {
  id: number;
  premium: number;
  currency: string;
  buildingType: string;
  error?: string;
}

interface PadCesionar {
  id: number;
  name: string;
}

export default function PadPage() {
  // Utils
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<string[]>([]);
  const [cesionari, setCesionari] = useState<PadCesionar[]>([]);

  // Form
  const [buildingType, setBuildingType] = useState("");
  const [environmentType, setEnvironmentType] = useState("");
  const [propertyAddress, setPropertyAddress] = useState<AddressRequest>(emptyAddress());
  const [contractor, setContractor] = useState<PersonRequest>(emptyPersonPF());
  const [insured, setInsured] = useState<PersonRequest>(emptyPersonPF());
  const [sameAsContractor, setSameAsContractor] = useState(true);
  const [selectedCesionari, setSelectedCesionari] = useState<number[]>([]);

  // Order
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderHash, setOrderHash] = useState<string | null>(null);

  // Offer
  const [offer, setOffer] = useState<PadOffer | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentStep, next, prev, goTo } = useWizard(5);
  const isPropertyStepValid =
    !!buildingType && !!environmentType && isAddressValid(propertyAddress);
  const isPeopleStepValid =
    isPersonValid(contractor) && (sameAsContractor || isPersonValid(insured));

  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/paid/pad/utils")
      .then((data) => {
        setBuildingTypes(getArray<string>(data.buildingType));
        setEnvironmentTypes(getArray<string>(data.environmentType));
      })
      .catch(() => setError("Nu am putut incarca utilitarele PAD"));
    api
      .get<PadCesionar[]>("/online/paid/pad/cesionari")
      .then(setCesionari)
      .catch(() => setError("Nu am putut incarca lista de cesionari"));
  }, []);

  const handleCreateOrderAndOffer = async () => {
    setError(null);
    setLoadingOffer(true);

    try {
      const { order, offer: offerRes } = await createOrderAndSingleOffer({
        orderPayload: buildOrderPayload("PAD", contractor, contractor),
        fetchOffer: (createdOrder) =>
          api.post<PadOffer>(
            `/online/offers/paid/pad/v3?orderHash=${createdOrder.hash}`,
            {
              orderId: createdOrder.id,
              buildingType,
              environmentType,
              address: propertyAddress,
              contractorDetails: contractor,
              insuredDetails: sameAsContractor ? contractor : insured,
              cesionari: selectedCesionari.map((id) => ({ cesionarId: id })),
            }
          ),
      });
      setOrderId(order.id);
      setOrderHash(order.hash);
      setOffer(offerRes);
      next();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la generarea ofertei PAD");
    } finally {
      setLoadingOffer(false);
    }
  };

  const steps = [
    {
      title: "Detalii Proprietate",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalii proprietate</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip constructie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {buildingTypes.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mediu</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={environmentType}
                onChange={(e) => setEnvironmentType(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {environmentTypes.map((et) => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">Adresa proprietate</h4>
            <AddressForm value={propertyAddress} onChange={setPropertyAddress} />
          </div>

          {/* Cesionari */}
          {cesionari.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cesionari (banca creditoare)
              </label>
              <select
                multiple
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={selectedCesionari.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                  setSelectedCesionari(selected);
                }}
              >
                {cesionari.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Tineti Ctrl pentru selectie multipla</p>
            </div>
          )}

          <button type="button" onClick={() => isPropertyStepValid && next()} disabled={!isPropertyStepValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            Continua
          </button>
        </div>
      ),
    },
    {
      title: "Date Persoane",
      content: (
        <div className="space-y-6">
          <PersonForm value={contractor} onChange={setContractor} title="Contractant" />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sameAsContractor"
              checked={sameAsContractor}
              onChange={(e) => setSameAsContractor(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="sameAsContractor" className="text-sm text-gray-700">
              Asiguratul este acelasi cu contractantul
            </label>
          </div>

          {!sameAsContractor && (
            <PersonForm value={insured} onChange={setInsured} title="Asigurat" />
          )}

          <div className="flex gap-3">
            <button type="button" onClick={prev} className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Inapoi</button>
            <button type="button" onClick={() => isPeopleStepValid && next()} disabled={!isPeopleStepValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Continua</button>
          </div>
        </div>
      ),
    },
    {
      title: "Consimtamant",
      content: (
        <ConsentFlow
          legalType={contractor.legalType}
          cif={String(contractor.cif)}
          vendorProductType="PAD"
          personData={contractor}
          onComplete={next}
          onError={(msg) => setError(msg)}
        />
      ),
    },
    {
      title: "Oferta PAD",
      content: (
        <div className="space-y-4">
          {!loadingOffer && !offer && (
            <div className="text-center">
              <p className="mb-4 text-gray-600">Generati oferta PAD.</p>
              <button type="button" onClick={handleCreateOrderAndOffer} className="rounded-md bg-blue-700 px-8 py-3 text-sm font-medium text-white hover:bg-blue-800">
                Genereaza oferta
              </button>
            </div>
          )}
          {loadingOffer && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
              Se genereaza oferta PAD...
            </div>
          )}
          {offer && !offer.error && (
            <div className="rounded-lg border-2 border-blue-700 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Oferta PAD</h3>
              <p className="mt-1 text-sm text-gray-600">Tip constructie: {offer.buildingType}</p>
              <p className="mt-4 text-2xl font-bold text-blue-700">{formatPrice(offer.premium, offer.currency)}</p>
              <button type="button" onClick={next} className="mt-4 rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800">
                Continua la plata
              </button>
            </div>
          )}
          {offer?.error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{offer.error}</div>
          )}
        </div>
      ),
    },
    {
      title: "Plata",
      content: offer && !offer.error && orderId && orderHash ? (
        <PaymentFlow
          orderId={orderId}
          offerId={offer.id}
          orderHash={orderHash}
          amount={offer.premium}
          currency={offer.currency}
        />
      ) : (
        <p className="text-gray-500">Generati mai intai oferta PAD.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">PAD - Asigurare Obligatorie Locuinta</h1>
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
