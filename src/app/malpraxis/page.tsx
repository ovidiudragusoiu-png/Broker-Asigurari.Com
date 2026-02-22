"use client";

import { useState, useEffect } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import PersonForm, { emptyPersonPF } from "@/components/shared/PersonForm";
import ConsentFlow from "@/components/shared/ConsentFlow";
import OfferCard from "@/components/shared/OfferCard";
import PaymentFlow from "@/components/shared/PaymentFlow";
import { api } from "@/lib/api/client";
import type { PersonRequest } from "@/types/insuretech";
import { formatDateTime, calculatePolicyEndDate } from "@/lib/utils/formatters";
import { isPersonValid } from "@/lib/utils/formGuards";
import { createOrderAndOffers } from "@/lib/flows/offerFlow";
import { buildMalpraxisOrderPayload } from "@/lib/flows/payloadBuilders";
import { getArray } from "@/lib/utils/dto";

interface MalpraxisOffer {
  id: number;
  productId: number;
  productName: string;
  vendorName: string;
  policyPremium: number;
  currency: string;
  installments?: { number: number; amount: number; dueDate: string }[];
  error?: boolean;
  message?: string | null;
  productDetails?: { id: number; productName: string; vendorDetails?: { commercialName: string } };
}

interface Profession {
  code: string;
  name: string;
  categories: Category[];
}

interface Category {
  type: string;
  name: string;
  subcategories?: { type: string; name: string; comparatorId?: number; defaultLimit?: string }[];
}

interface CodeName {
  code: string;
  name: string;
}

export default function MalpraxisPage() {
  // Utils
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [authorizationTypes, setAuthorizationTypes] = useState<CodeName[]>([]);
  const [moralDamagesLimits, setMoralDamagesLimits] = useState<CodeName[]>([]);
  const [retroactivePeriods, setRetroactivePeriods] = useState<CodeName[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [installmentsOptions, setInstallmentsOptions] = useState<number[]>([]);
  const [products, setProducts] = useState<{ id: number; productName: string; vendorDetails?: { name: string } }[]>([]);

  // Form
  const [professionId, setProfessionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [generalLimit, setGeneralLimit] = useState("");
  const [moralDamagesLimit, setMoralDamagesLimit] = useState("");
  const [currencyId, setCurrencyId] = useState("RON");
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

  const { currentStep, next, prev, goTo } = useWizard(5);
  const isMalpraxisDetailsValid =
    !!professionId &&
    !!categoryId &&
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
      })
      .catch(() => setError("Nu am putut incarca utilitarele Malpraxis"));
    api
      .get<{ id: number; productName: string; vendorDetails?: { name: string } }[]>(
        "/online/products/malpraxis"
      )
      .then(setProducts)
      .catch(() => setError("Nu am putut incarca produsele Malpraxis"));
  }, []);

  const selectedProfession = professions.find((p) => p.code === professionId);
  const categories = selectedProfession?.categories || [];
  const selectedCategory = categories.find((c) => c.type === categoryId);

  const policyEndDate = policyStartDate
    ? formatDateTime(calculatePolicyEndDate(new Date(policyStartDate)))
    : "";

  const handleCreateOrderAndOffers = async () => {
    setError(null);
    setLoadingOffers(true);

    try {
      const offerDetails = {
        malpraxisProfessionId: professionId,
        category: categoryId,
        categoryType: selectedCategory?.type || categoryType,
        generalLimit,
        customMoralDamagesLimit: Number(moralDamagesLimit) || 0,
        moralDamagesLimit: Number(moralDamagesLimit) || 0,
        currency: currencyId,
        operatingAuthorizationType: Number(authorizationTypeCode) || 0,
        installmentsNo,
        retroactivePeriod,
      };

      const startDateFormatted = formatDateTime(new Date(policyStartDate));

      const { order, offers: results } = await createOrderAndOffers({
        orderPayload: buildMalpraxisOrderPayload(insured),
        fetchBodies: (createdOrder) =>
          api.post<Record<string, unknown>[]>(
            `/online/offers/malpraxis/comparator/bodies/v3?orderHash=${createdOrder.hash}`,
            {
              orderId: createdOrder.id,
              productIds: products.map((p) => p.id),
              policyStartDate: startDateFormatted,
              policyEndDate,
              offerDetails,
              specificDetails: [],
            }
          ),
        fetchOffer: async (body, createdOrder) => {
          const offer = await api.post<MalpraxisOffer>(
            `/online/offers/malpraxis/comparator/v3?orderHash=${createdOrder.hash}`,
            body
          );
          return {
            ...offer,
            productName: offer.productDetails?.productName || "Necunoscut",
            vendorName: offer.productDetails?.vendorDetails?.commercialName || "",
          };
        },
        mapOfferError: (body, err) => ({
          id: 0,
          productId: Number(body.productId || 0),
          productName: "Necunoscut",
          vendorName: "",
          policyPremium: 0,
          currency: "RON",
          error: true,
          message: err instanceof Error ? err.message : "Eroare generare oferta",
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
      title: "Detalii Malpraxis",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Detalii asigurare malpraxis</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Profesie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={professionId}
                onChange={(e) => {
                  setProfessionId(e.target.value);
                  setCategoryId("");
                  setCategoryType("");
                }}
              >
                <option value="">Selecteaza profesia</option>
                {professions.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Categorie / Specialitate</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.type === e.target.value);
                  setCategoryId(e.target.value);
                  setCategoryType(cat?.type || "");
                }}
              >
                <option value="">Selecteaza categoria</option>
                {categories.map((c) => (
                  <option key={c.type} value={c.type}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Limita generala (suma asigurata)</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={generalLimit}
                onChange={(e) => setGeneralLimit(e.target.value)}
                placeholder="ex: 50000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Limita daune morale</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tip autorizatie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Perioada retroactiva</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numar rate</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={installmentsNo}
                onChange={(e) => setInstallmentsNo(Number(e.target.value))}
              >
                {installmentsOptions.map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "rata" : "rate"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data inceput polita</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={policyStartDate}
                onChange={(e) => setPolicyStartDate(e.target.value)}
              />
            </div>
          </div>

          <button type="button" onClick={() => isMalpraxisDetailsValid && next()} disabled={!isMalpraxisDetailsValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            Continua
          </button>
        </div>
      ),
    },
    {
      title: "Date Asigurat",
      content: (
        <div className="space-y-6">
          <PersonForm value={insured} onChange={setInsured} title="Asigurat (medic)" />
          <div className="flex gap-3">
            <button type="button" onClick={prev} className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Inapoi</button>
            <button type="button" onClick={() => isInsuredStepValid && next()} disabled={!isInsuredStepValid} className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Continua</button>
          </div>
        </div>
      ),
    },
    {
      title: "Consimtamant",
      content: (
        <ConsentFlow
          legalType={insured.legalType}
          cif={String(insured.cif)}
          vendorProductType="MALPRAXIS"
          personData={insured}
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
              <p className="mb-4 text-gray-600">Generati ofertele de malpraxis.</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Oferte Malpraxis disponibile</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer, i) => (
                  <OfferCard
                    key={offer.id || i}
                    productName={offer.productName}
                    vendorName={offer.vendorName}
                    premium={offer.policyPremium}
                    currency={offer.currency}
                    installments={offer.installments?.map((inst) => ({
                      installmentNo: inst.number,
                      amount: inst.amount,
                      dueDate: inst.dueDate,
                    }))}
                    error={offer.error ? (offer.message || "Eroare") : undefined}
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
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Asigurare Malpraxis Medical</h1>
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
