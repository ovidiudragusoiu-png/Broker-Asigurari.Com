"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import AddressForm, { emptyAddress } from "@/components/shared/AddressForm";
import ConsentFlow from "@/components/shared/ConsentFlow";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import { api } from "@/lib/api/client";
import type { PersonRequest, AddressRequest } from "@/types/insuretech";
import { isAddressValid, isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildOrderPayload } from "@/lib/flows/payloadBuilders";
import { getArray } from "@/lib/utils/dto";

interface HouseOffer {
  id: number;
  productId: string;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  padOffer?: { id: number; premium: number };
  coverages?: { name: string; sumInsured?: number; premium?: number }[];
  error?: string;
}

interface SelectOption {
  code: string;
  name: string;
}

export default function HousePage() {
  // Utils
  const [constructionTypes, setConstructionTypes] = useState<SelectOption[]>([]);
  const [finishTypes, setFinishTypes] = useState<SelectOption[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<{ id: string; productName: string }[]>([]);

  // House details
  const [constructionTypeCode, setConstructionTypeCode] = useState("");
  const [constructionYear, setConstructionYear] = useState<number | null>(null);
  const [surfaceArea, setSurfaceArea] = useState<number | null>(null);
  const [numberOfRooms, setNumberOfRooms] = useState<number | null>(null);
  const [finishTypeCode, setFinishTypeCode] = useState("");
  const [environmentTypeCode, setEnvironmentTypeCode] = useState("");
  const [houseAddress, setHouseAddress] = useState<AddressRequest>(emptyAddress());

  // Insurance sums
  const [buildingSum, setBuildingSum] = useState<number>(0);
  const [contentSum, setContentSum] = useState<number>(0);
  const [withPad, setWithPad] = useState(false);

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

  const { currentStep, next, prev, goTo } = useWizard(5);
  const isHouseDetailsValid =
    !!constructionTypeCode &&
    !!constructionYear &&
    !!surfaceArea &&
    !!numberOfRooms &&
    !!finishTypeCode &&
    !!environmentTypeCode &&
    isAddressValid(houseAddress) &&
    buildingSum > 0;
  const isContractorValid = isPersonValid(contractor);

  useEffect(() => {
    api
      .get<Record<string, unknown>>("/online/offers/house/comparator/utils")
      .then((data) => {
        setConstructionTypes(getArray<SelectOption>(data.constructionType));
        setFinishTypes(getArray<SelectOption>(data.indoorFinishesTypes));
        setEnvironmentTypes(getArray<SelectOption>(data.environmentType));
      })
      .catch(() => setError("Nu am putut incarca utilitarele pentru locuinta"));
    api
      .get<{ id: string; productName: string }[]>(
        "/online/products/house/facultative"
      )
      .then(setProducts)
      .catch(() => setError("Nu am putut incarca produsele de locuinta"));
  }, []);

  const goodDetails = {
    constructionType: constructionTypeCode,
    constructionYear: constructionYear!,
    surfaceArea: surfaceArea!,
    numberOfRooms: numberOfRooms!,
    indoorFinishesType: finishTypeCode,
    environmentType: environmentTypeCode,
    address: houseAddress,
  };

  const handleCreateOrderAndOffers = async () => {
    setError(null);
    setLoadingOffers(true);

    try {
      const { order, offers: results } = await createOrderAndOffers({
        orderPayload: buildOrderPayload("HOUSE", contractor, contractor, {
          goodDetails,
        }),
        fetchBodies: (createdOrder) =>
          api.post<Record<string, unknown>[]>(
            `/online/offers/house/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
            {
              orderId: createdOrder.id,
              productIds: products.map((p) => p.id),
              goodDetails,
              insuredSums: { buildingSum, contentSum },
              withPad,
            }
          ),
        fetchOffer: (body, createdOrder) =>
          api.post<HouseOffer>(
            `/online/offers/house/comparator/v3?orderHash=${createdOrder.hash}`,
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
      title: "Detalii Locuinta",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalii locuinta</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip constructie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={surfaceArea ?? ""}
                onChange={(e) => setSurfaceArea(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar camere</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={numberOfRooms ?? ""}
                onChange={(e) => setNumberOfRooms(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip finisaj</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={finishTypeCode}
                onChange={(e) => setFinishTypeCode(e.target.value)}
              >
                <option value="">Selecteaza</option>
                {finishTypes.map((f) => (
                  <option key={f.code} value={f.code}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mediu</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={environmentTypeCode}
              onChange={(e) => setEnvironmentTypeCode(e.target.value)}
            >
              <option value="">Selecteaza</option>
              {environmentTypes.map((et) => (
                <option key={et.code} value={et.code}>{et.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">Adresa locuinta</h4>
            <AddressForm value={houseAddress} onChange={setHouseAddress} />
          </div>

          <h4 className="text-sm font-semibold text-gray-700">Sume asigurate</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Suma cladire (EUR)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={buildingSum || ""}
                onChange={(e) => setBuildingSum(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Suma continut (EUR)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={contentSum || ""}
                onChange={(e) => setContentSum(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="withPad"
              checked={withPad}
              onChange={(e) => setWithPad(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="withPad" className="text-sm text-gray-700">
              Include PAD (asigurare obligatorie locuinta)
            </label>
          </div>

          <button type="button" onClick={() => isHouseDetailsValid && next()} disabled={!isHouseDetailsValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            Continua
          </button>
        </div>
      ),
    },
    {
      title: "Date Asigurat",
      content: (
        <div className="space-y-6">
          <PersonForm value={contractor} onChange={setContractor} title="Contractant / Asigurat" />
          <div className="flex gap-3">
            <button type="button" onClick={prev} className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Inapoi</button>
            <button type="button" onClick={() => isContractorValid && next()} disabled={!isContractorValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Continua</button>
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
          vendorProductType="HOUSE"
          personData={contractor}
          onComplete={next}
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
              <p className="mb-4 text-gray-600">Generati ofertele pentru locuinta.</p>
              <button type="button" onClick={handleCreateOrderAndOffers} className="rounded-md bg-blue-700 px-8 py-3 text-sm font-medium text-white hover:bg-blue-800">
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
              <h3 className="text-lg font-semibold text-gray-900">Oferte Locuinta disponibile</h3>
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
                <button type="button" onClick={next} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800">
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
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Asigurare Locuinta</h1>
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
