"use client";

import { Suspense, useState, useEffect, useReducer, useCallback } from "react";
import WizardStepper, {
  useWizardUrlSync,
} from "@/components/shared/WizardStepper";
import PlateInput from "@/components/rca/PlateInput";
import LocalitySelect from "@/components/rca/LocalitySelect";
import CategorySelect from "@/components/rca/CategorySelect";
import VinLookup from "@/components/rca/VinLookup";
import OwnerIdentification from "@/components/rca/OwnerIdentification";
import CompanyDataStep from "@/components/rca/CompanyDataStep";
import DntChoice from "@/components/rca/DntChoice";
import OfferTabs from "@/components/rca/OfferTabs";
import PolicyDetailsForm from "@/components/rca/PolicyDetailsForm";
import AdditionalDriverForm from "@/components/rca/AdditionalDriverForm";
import ReviewSummary from "@/components/rca/ReviewSummary";
import { api, ApiError } from "@/lib/api/client";
import {
  isPostOfferDetailsPFValid,
  isPostOfferDetailsPJValid,
} from "@/lib/utils/formGuards";
import {
  rcaFlowReducer,
  emptyRcaFlowState,
  buildFullPersonFromFlowState,
  toDriverFromAdditional,
  getPlateCountyPrefix,
  findCountyIdForPlate,
  normalizeRcaOffer,
  extractRcaOffers,
  toRcaDate,
  normalizePersonForRca,
  PLATE_COUNTY_MAP,
} from "@/lib/utils/rcaHelpers";
import type { RcaFlowState, SelectedOfferState } from "@/types/rcaFlow";
import type { RcaOfferApi } from "@/lib/utils/rcaHelpers";
import { btn } from "@/lib/ui/tokens";

// ============================================================
// Page wrapper (Suspense boundary for useSearchParams)
// ============================================================

export default function RcaPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-500">Se încarcă...</div>}>
      <RcaPageInner />
    </Suspense>
  );
}

// ============================================================
// Inner page component
// ============================================================

function RcaPageInner() {
  const [state, dispatch] = useReducer(rcaFlowReducer, null, emptyRcaFlowState);
  const { currentStep, next, goTo } = useWizardUrlSync(7);
  const [plateCountyName, setPlateCountyName] = useState("");

  // ----- Session storage restore -----
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("rcaWizardState");
      if (saved) {
        const parsed = JSON.parse(saved) as RcaFlowState;
        dispatch({ type: "RESTORE", state: { ...emptyRcaFlowState(), ...parsed } });
      }
    } catch {
      // ignore
    }
  }, []);

  // ----- Session storage persist (exclude sensitive payment/order fields) -----
  useEffect(() => {
    const { orderHash, orderId, ...safeState } = state;
    void orderHash; void orderId; // intentionally excluded from persistence
    sessionStorage.setItem("rcaWizardState", JSON.stringify(safeState));
  }, [state]);

  // ============================================================
  // Step 5: Create order + generate offers (NOW with real data)
  // ============================================================

  const handleCreateOrderAndOffers = useCallback(async () => {
    if (state.offers.length > 0 || state.loadingOffers) return;

    dispatch({ type: "SET_LOADING_OFFERS", loading: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      // Build person with REAL data (collected in steps 3-4)
      const fullPerson = buildFullPersonFromFlowState(state);
      const normalizedPerson = normalizePersonForRca(fullPerson);

      // Auto-sign consent (required by order API) — matches ConsentFlow logic
      try {
        const consentStatus = await api.get<{ signedDocuments: boolean }>(
          `/online/client/documents/status?legalType=${state.ownerType}&cif=${state.cnpOrCui}&vendorProductType=RCA`
        );
        if (!consentStatus.signedDocuments) {
          const consentData = await api.get<{
            sections: { title: string; questions: { id: string; type?: string; hiddenByAnswers?: string[]; answers: { id: string; defaultValue: string; extraField?: { name: string } | null }[] }[] }[];
            communicationChannels: string[];
          }>(
            `/online/client/documents/fetch-questions?legalType=${state.ownerType}&vendorProductType=RCA`
          );

          // Build selectedAnswers respecting question types (oneOf = first/default only)
          const selectedAnswers: Record<string, string[]> = {};
          for (const section of consentData.sections) {
            for (const question of section.questions) {
              if (question.type === "text") continue;
              if (question.type === "checkbox_oneOf") {
                // Only ONE answer allowed — pick default or first
                const def = question.answers.find((a) => a.defaultValue === "true");
                selectedAnswers[question.id] = [def?.id ?? question.answers[0]?.id].filter(Boolean);
              } else {
                // checkbox_allIn — select ALL to auto-accept
                selectedAnswers[question.id] = question.answers.map((a) => a.id);
              }
            }
          }
          const allSelectedIds = Object.values(selectedAnswers).flat();

          // Build formInputData, skipping hidden questions
          const formInputData: Record<string, boolean | string> = {};
          for (const section of consentData.sections) {
            for (const question of section.questions) {
              if (question.hiddenByAnswers?.some((id) => allSelectedIds.includes(id))) continue;
              if (question.type === "text") {
                formInputData[question.id] = "";
              } else {
                const selected = selectedAnswers[question.id] || [];
                for (const answer of question.answers) {
                  formInputData[answer.id] = selected.includes(answer.id);
                }
              }
            }
          }


          await api.post("/online/client/documents/submit-answers", {
            personBaseRequest: normalizedPerson,
            communicationChannelEmail: true,
            communicationChannelPhoneNo: false,
            communicationChannelAddress: false,
            formInputData,
            vendorProductType: "RCA",
            website: typeof window !== "undefined" ? window.location.origin : "https://www.broker-asigurari.com",
          });
        }
      } catch (consentErr) {
        console.error("[RCA] consent submission failed:", consentErr);
        // Continue to order creation — it will fail if consent is truly required
      }

      // 2. Get RCA products
      const allRcaProducts = await api.get<
        { id: string | number; productName: string; vendorDetails?: { commercialName?: string; [key: string]: unknown } }[]
      >("/online/products/rca");

      // Filter: keep only "Hellas Next Ins", exclude plain "Hellas"
      const rcaProducts = allRcaProducts.filter(p => {
        const vendor = (p.vendorDetails?.commercialName || "").toLowerCase();
        if (vendor === "hellas") return false;
        return true;
      });

      // Build driver details with REAL data
      const driversDetails = state.ownerType === "PF"
        ? [{
            firstName: state.ownerFirstName,
            lastName: state.ownerLastName,
            cnp: state.cnpOrCui,
            idType: state.idType || "CI" as const,
            idSeries: state.idSeries || "XX",
            idNumber: state.idNumber || "000000",
            phoneNumber: state.phoneNumber || "0700000000",
            driverLicenceDate: "2010-02-01T00:00:00",
          }]
        : [];

      // 3. Create order with REAL person data
      const order = await api.post<{ id: number; productType: string; hash: string }>(
        "/online/offers/rca/order/v3",
        {
          rcaOwnerDetails: normalizedPerson,
          rcaUserDetails: normalizedPerson,
          vehicleDetails: {
            vin: state.vehicle.vin,
            plateNo: state.vehicle.licensePlate,
            makeId: state.vehicle.makeId,
            commercialName: state.vehicle.model,
            productionYear: state.vehicle.year,
            vehicleCategoryId: state.vehicle.categoryId,
            vehicleSubCategoryId: state.vehicle.subcategoryId,
            fuelTypeId: state.vehicle.fuelTypeId,
            activityTypeId: state.vehicle.activityTypeId,
            engineCapacity: state.vehicle.engineCapacity,
            enginePowerKw: state.vehicle.enginePowerKw,
            maxWeight: state.vehicle.totalWeight,
            seatsNumber: state.vehicle.seats,
            registrationTypeId: state.vehicle.registrationTypeId,
            civ: state.registrationCertSeries,
            registrationCertificateNumber: state.registrationCertSeries,
            rafCode: "RAJ506943",
            mileage: 50000,
            km: 50000,
          },
        }
      );

      dispatch({ type: "SET_ORDER", orderId: order.id, orderHash: order.hash });

      // 4. Request offers in batches of 3 to avoid API timeouts
      const BATCH_SIZE = 3;
      const OFFER_TIMEOUT = 60000; // 60s per insurer request
      const results: ReturnType<typeof normalizeRcaOffer>[][] = [];

      for (let i = 0; i < rcaProducts.length; i += BATCH_SIZE) {
        const batch = rcaProducts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            try {
              const rafCode = "RAJ506943";
              const mileageFields = { mileage: 50000, km: 50000 };

              const offerPayload = {
                  orderId: order.id,
                  policyStartDate: toRcaDate(state.startDate),
                  periodMonths: ["1", "2", "3", "6", "12"],
                  isLeasing: false,
                  driversDetails,
                  rcaProductRequests: [
                    {
                      productId: Number(product.id),
                      specificFields: {
                        civ: state.registrationCertSeries,
                        registrationCertificateNumber: state.registrationCertSeries,
                        rafCode,
                        ...mileageFields,
                        driverLicenceDate: "2010-02-01T00:00:00",
                      },
                    },
                  ],
              };
              const offerResponse = await api.post<RcaOfferApi | RcaOfferApi[]>(
                `/online/offers/rca/v3?orderHash=${order.hash}`,
                offerPayload,
                undefined,
                { timeoutMs: OFFER_TIMEOUT }
              );
              const responseList = extractRcaOffers(offerResponse);

              return responseList.map((raw) =>
                normalizeRcaOffer(
                  raw,
                  product.productName,
                  product.id,
                  product.vendorDetails?.commercialName
                )
              );
            } catch (offerErr) {
              let errorMessage =
                offerErr instanceof Error ? offerErr.message : "Eroare la generarea ofertei";
              if (offerErr instanceof ApiError && offerErr.data && typeof offerErr.data === "object") {
                const apiData = offerErr.data as {
                  message?: string; detail?: string; title?: string;
                  errors?: Record<string, string[]>;
                };
                const details = apiData.errors
                  ? Object.entries(apiData.errors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
                  : null;
                errorMessage = details || apiData.message || apiData.detail || apiData.title || errorMessage;
              }

              return [{
                id: 0,
                productId: product.id,
                productName: product.productName || "RCA",
                vendorName: product.vendorDetails?.commercialName || product.productName || "",
                policyPremium: 0,
                currency: "RON",
                error: errorMessage,
              }];
            }
          })
        );
        results.push(...batchResults);
      }

      const flatResults = results.flat();
      const hasDirectData = flatResults.some((offer) => {
        const normalizedName = (offer.productName || "").toLowerCase();
        return (
          offer.directSettlementPremium != null ||
          offer.policyPremiumWithDirectSettlement != null ||
          offer.withDirectSettlement === true ||
          normalizedName.includes("direct settlement") ||
          normalizedName.includes("decontare")
        );
      });

      dispatch({
        type: "SET_OFFERS",
        offers: flatResults,
        hasDirectSettlementData: hasDirectData,
      });

      const errorOffers = flatResults.filter((o) => o.error);
      const validOffers = flatResults.filter((o) => !o.error);

      if (validOffers.length === 0) {
        const errorDetails = errorOffers
          .map((o) => o.error)
          .filter((e, i, arr) => arr.indexOf(e) === i) // unique errors
          .join("; ");
        dispatch({
          type: "SET_ERROR",
          error: `Nu s-au putut genera oferte RCA. ${errorDetails || "Verificați datele introduse și încercați din nou."}`,
        });
      }
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : "Eroare la crearea comenzii.";
      if (err instanceof ApiError && err.data && typeof err.data === "object") {
        const apiData = err.data as {
          message?: string; detail?: string; title?: string;
          errors?: Record<string, string[]>;
        };
        const details = apiData.errors
          ? Object.entries(apiData.errors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
          : null;
        errorMsg = details || apiData.message || apiData.detail || apiData.title || errorMsg;
      }
      dispatch({ type: "SET_ERROR", error: errorMsg });
      dispatch({ type: "SET_LOADING_OFFERS", loading: false });
    }
  }, [state.offers.length, state.loadingOffers, state.ownerType, state.cnpOrCui, state.email, state.vehicle, state.startDate, state.plateCountyId, state.plateCityId, state.platePostalCode, state.ownerFirstName, state.ownerLastName, state.idType, state.idSeries, state.idNumber, state.phoneNumber, state.address, state.registrationCertSeries, state.companyName, state.registrationNumber, state.caenCode, state.companyTypeId]);

  // ============================================================
  // Step 7: Payment (no more order update needed — order has real data)
  // ============================================================

  const handleConsentAndPay = async () => {
    if (!state.selectedOffer || !state.orderId || !state.orderHash) return;

    // Build real person data
    const fullPerson = buildFullPersonFromFlowState(state);
    const normalizedPerson = normalizePersonForRca(fullPerson);

    // Build driver details: main driver (PF) + additional driver
    const driversDetails: Record<string, unknown>[] = [];
    if (state.ownerType === "PF") {
      driversDetails.push({
        firstName: state.ownerFirstName,
        lastName: state.ownerLastName,
        cnp: state.cnpOrCui,
        idType: state.idType,
        idSeries: state.idSeries,
        idNumber: state.idNumber,
        phoneNumber: state.phoneNumber,
        driverLicenceDate: "2010-02-01T00:00:00",
      });
    }
    if (state.hasAdditionalDriver && state.additionalDriver) {
      const addDriver = toDriverFromAdditional(state.additionalDriver);
      driversDetails.push({
        ...addDriver,
        driverLicenceDate: state.additionalDriver.driverLicenceDate
          ? `${state.additionalDriver.driverLicenceDate}T00:00:00`
          : "2010-02-01T00:00:00",
      });
    }

    // Save policy creation data to sessionStorage (needed after payment redirect)
    const policyData = {
      rcaOwnerDetails: normalizedPerson,
      rcaUserDetails: normalizedPerson,
      driversDetails,
      vehicleDetails: {
        civ: state.registrationCertSeries,
        registrationCertificateNumber: state.registrationCertSeries,
      },
      policyStartDate: toRcaDate(state.startDate),
      email: normalizedPerson.email,
    };
    sessionStorage.setItem("rcaPolicyData", JSON.stringify(policyData));
    if (normalizedPerson.email) {
      sessionStorage.setItem("customerEmail", normalizedPerson.email);
    }

    // Create payment link
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const redirectURL = `${baseUrl}/payment/callback?orderId=${state.orderId}&offerId=${state.selectedOffer.offer.id}&orderHash=${state.orderHash}&productType=RCA`;

    const paymentUrl = await api.post<string>(
      `/online/offers/payment/v3?orderHash=${state.orderHash}`,
      { offerId: state.selectedOffer.offer.id, redirectURL },
      { Accept: "text/plain" }
    );

    // Security: validate payment URL origin before redirect
    const ALLOWED_PAYMENT_ORIGINS = [
      "https://pay.insuretech.ro",
      "https://insuretech.staging.insuretech.ro",
      "https://secure.euplatesc.ro",
    ];
    try {
      const parsed = new URL(paymentUrl as string);
      if (!ALLOWED_PAYMENT_ORIGINS.some((o) => parsed.origin === new URL(o).origin)) {
        throw new Error("URL plata invalid");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "URL plata invalid") throw e;
      throw new Error("URL plata invalid");
    }

    // Clean wizard state but keep policy data for callback
    sessionStorage.removeItem("rcaWizardState");

    window.location.href = paymentUrl as string;
  };

  // ============================================================
  // Step navigation handlers
  // ============================================================

  // Step 1 sub-step handlers
  const handlePlateComplete = async () => {
    const prefix = getPlateCountyPrefix(state.licensePlate);
    const countyName = PLATE_COUNTY_MAP[prefix] || "Bucuresti";

    // Resolve county ID from API
    try {
      const counties = await api.get<{ id: number; name: string }[]>("/online/address/utils/counties");
      const countyId = findCountyIdForPlate(state.licensePlate, counties);

      if (prefix === "B") {
        // Bucharest: auto-resolve first city + postal code, skip locality step
        if (countyId) {
          const cities = await api.get<{ id: number; name: string; uniquePostalCode?: string | null }[]>(
            `/online/address/utils/cities?countyId=${countyId}`
          );
          const firstCity = cities[0];
          // Use the city's postal code, or a known valid Bucharest one
          const bucharestPostal = firstCity?.uniquePostalCode || "030167";
          dispatch({
            type: "SET_PLATE_LOCATION",
            countyId,
            cityId: firstCity?.id ?? null,
            postalCode: bucharestPostal,
          });
        }
        dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "category" });
      } else {
        // Non-Bucharest: store county, show locality dropdown
        setPlateCountyName(countyName);
        dispatch({
          type: "SET_PLATE_LOCATION",
          countyId: countyId,
          cityId: null,
          postalCode: "",
        });
        dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "locality" });
      }
    } catch {
      // API failed - skip locality step, continue with defaults
      dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "category" });
    }
  };

  const handleLocalitySelect = (cityId: number, postalCode: string) => {
    dispatch({
      type: "SET_PLATE_LOCATION",
      countyId: state.plateCountyId,
      cityId,
      postalCode,
    });
    dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "category" });
  };

  const handleCategorySelect = (categoryId: number, subcategoryId: number | null) => {
    dispatch({ type: "SET_CATEGORY", categoryId, subcategoryId });
    dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "vin" });
  };

  const handleVinComplete = () => {
    dispatch({ type: "SET_VEHICLE_SUB_STEP", subStep: "details" });
    next(); // Move to step 2
  };

  // Step 2 sub-step handlers
  const handleOwnerIdComplete = async () => {
    // For PJ, try CUI lookup to auto-fill company data, then show company sub-step
    if (state.ownerType === "PJ" && state.cnpOrCui) {
      try {
        // POST required — the upstream API doesn't support GET for this endpoint
        const company = await api.post<{
          name?: string;
          registrationNumber?: string;
          caenCode?: string | null;
          companyTypeId?: number | null;
        }>(`/online/companies/utils/${state.cnpOrCui}`, {});
        dispatch({
          type: "SET_COMPANY_DATA",
          companyName: company.name || "",
          registrationNumber: company.registrationNumber || "",
          caenCode: company.caenCode ?? null,
          companyTypeId: company.companyTypeId ?? null,
        });
      } catch {
        // Company not found in database — user will fill manually
      }
      // Show company data for review/correction
      dispatch({ type: "SET_IDENTIFICATION_SUB_STEP", subStep: "company" });
    } else {
      dispatch({ type: "SET_IDENTIFICATION_SUB_STEP", subStep: "dnt" });
    }
  };

  const handleCompanyDataContinue = () => {
    dispatch({ type: "SET_IDENTIFICATION_SUB_STEP", subStep: "dnt" });
  };

  const handleDntContinue = () => {
    dispatch({ type: "SET_SKIP_DNT", skip: true });
    next(); // Move to step 3 (CIV + start date)
  };

  // Step 3: CIV + start date complete → move to step 4 (owner details)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const civStepValid = state.registrationCertSeries.trim().length > 0 && state.startDate.length > 0 && state.startDate >= tomorrow;

  const handleCivContinue = () => {
    // Pre-fill address county/city from plate-derived location (for non-Bucharest)
    if (!state.address.countyId && state.plateCountyId) {
      dispatch({
        type: "SET_ADDRESS",
        address: {
          ...state.address,
          countyId: state.plateCountyId,
          cityId: state.plateCityId,
          postalCode: state.address.postalCode || state.platePostalCode || "",
        },
      });
    }
    next(); // Move to step 4
  };

  // Step 4: Owner details complete → move to step 5 (offers)
  const isPolicyDetailsValid = state.ownerType === "PF"
    ? isPostOfferDetailsPFValid({
        ownerFirstName: state.ownerFirstName,
        ownerLastName: state.ownerLastName,
        idSeries: state.idSeries,
        idNumber: state.idNumber,
        address: state.address,
        startDate: state.startDate,
      })
    : isPostOfferDetailsPJValid({
        companyName: state.companyName,
        registrationNumber: state.registrationNumber,
        address: state.address,
        startDate: state.startDate,
      });

  const handlePolicyDetailsFieldChange = (field: string, value: string) => {
    dispatch({ type: "SET_POLICY_DETAILS", details: { [field]: value } as Partial<RcaFlowState> });
  };

  const handlePolicyDetailsContinue = () => {
    next(); // Move to step 5 (offers)
    // Trigger order creation + offer generation with REAL data
    handleCreateOrderAndOffers();
  };

  // Step 5: offer selected
  const handleOfferSelected = (selected: SelectedOfferState) => {
    dispatch({ type: "SELECT_OFFER", selected });
    next(); // Move to step 6
  };

  // ============================================================
  // Step content
  // ============================================================

  const step1Content = (() => {
    switch (state.vehicleSubStep) {
      case "plate":
        return (
          <PlateInput
            value={state.licensePlate}
            onChange={(plate) => dispatch({ type: "SET_PLATE", plate })}
            onContinue={handlePlateComplete}
          />
        );
      case "locality":
        return state.plateCountyId ? (
          <LocalitySelect
            countyId={state.plateCountyId}
            countyName={plateCountyName}
            onSelect={handleLocalitySelect}
          />
        ) : null;
      case "category":
        return <CategorySelect onSelect={handleCategorySelect} />;
      case "vin":
      case "details":
        return (
          <VinLookup
            vehicle={state.vehicle}
            onChange={(v) => dispatch({ type: "SET_VEHICLE", vehicle: v })}
            onContinue={handleVinComplete}
          />
        );
    }
  })();

  const step2Content = (() => {
    switch (state.identificationSubStep) {
      case "owner":
        return (
          <OwnerIdentification
            ownerType={state.ownerType}
            cnpOrCui={state.cnpOrCui}
            email={state.email}
            onOwnerTypeChange={(type) => dispatch({ type: "SET_OWNER_TYPE", ownerType: type })}
            onCnpChange={(value) => dispatch({ type: "SET_CNP_OR_CUI", value })}
            onEmailChange={(email) => dispatch({ type: "SET_EMAIL", email })}
            onContinue={handleOwnerIdComplete}
          />
        );
      case "company":
        return (
          <CompanyDataStep
            companyName={state.companyName}
            registrationNumber={state.registrationNumber}
            caenCode={state.caenCode}
            companyFound={state.companyFound}
            onFieldChange={handlePolicyDetailsFieldChange}
            onCaenChange={(code) => dispatch({ type: "SET_POLICY_DETAILS", details: { caenCode: code } })}
            onContinue={handleCompanyDataContinue}
          />
        );
      case "dnt":
        return <DntChoice onContinueDirect={handleDntContinue} />;
    }
  })();

  // Step 3: CIV + start date
  const step3CivContent = (
    <div className="mx-auto max-w-md space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Completați datele poliței</h2>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        {/* CIV */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Serie carte auto (CIV)
          </label>
          <input
            type="text"
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm uppercase text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
            value={state.registrationCertSeries}
            onChange={(e) => handlePolicyDetailsFieldChange("registrationCertSeries", e.target.value.toUpperCase())}
            placeholder="ex: F123123"
          />
          <p className="mt-1 text-xs text-gray-400">
            La taloanele noi, seria cărții auto nu mai apare. O găsiți în cartea vehiculului.
          </p>
        </div>

        {/* Start date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Data început valabilitate RCA
          </label>
          <input
            type="date"
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
            value={state.startDate}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
            onChange={(e) => handlePolicyDetailsFieldChange("startDate", e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">
            Selectați prima zi după expirarea poliței curente.
          </p>
        </div>
      </div>

      {/* Continue button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={handleCivContinue}
          disabled={!civStepValid}
          className={`${btn.primary} px-8`}
        >
          <span className="flex items-center gap-2">
            Continuă
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );

  // Step 4: Owner details
  const step4DetailsContent = (
    <PolicyDetailsForm
      ownerType={state.ownerType}
      ownerFirstName={state.ownerFirstName}
      ownerLastName={state.ownerLastName}
      companyName={state.companyName}
      registrationNumber={state.registrationNumber}
      caenCode={state.caenCode}
      companyFound={state.companyFound}
      idSeries={state.idSeries}
      idNumber={state.idNumber}
      email={state.email}
      phoneNumber={state.phoneNumber}
      address={state.address}
      isBucharest={getPlateCountyPrefix(state.licensePlate) === "B"}
      onFieldChange={handlePolicyDetailsFieldChange}
      onCaenChange={(code) => dispatch({ type: "SET_POLICY_DETAILS", details: { caenCode: code } })}
      onAddressChange={(address) => dispatch({ type: "SET_ADDRESS", address })}
      onEmailChange={(email) => dispatch({ type: "SET_EMAIL", email })}
      onPhoneChange={(phone) => dispatch({ type: "SET_PHONE", phone })}
      onContinue={handlePolicyDetailsContinue}
      isValid={isPolicyDetailsValid}
    />
  );

  // Step 6: Additional driver
  const step6DriverContent = (
    <AdditionalDriverForm
      hasDriver={state.hasAdditionalDriver}
      driver={state.additionalDriver}
      onToggle={(has) => dispatch({ type: "SET_ADDITIONAL_DRIVER_TOGGLE", has })}
      onDriverChange={(driver) => dispatch({ type: "SET_ADDITIONAL_DRIVER", driver })}
      onContinue={() => next()}
    />
  );

  const steps = [
    {
      title: "Vehicul",
      content: step1Content,
    },
    {
      title: "Identificare",
      content: step2Content,
    },
    {
      title: "Date poliță",
      content: step3CivContent,
    },
    {
      title: "Detalii proprietar",
      content: step4DetailsContent,
    },
    {
      title: "Oferte RCA",
      content: (
        <OfferTabs
          offers={state.offers}
          loading={state.loadingOffers}
          onSelectOffer={handleOfferSelected}
        />
      ),
    },
    {
      title: "Șofer adițional",
      content: step6DriverContent,
    },
    {
      title: "Sumar & Plată",
      content: (
        <ReviewSummary
          state={state}
          onConsentAndPay={handleConsentAndPay}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 00-.879-2.121L16.5 8.259a2.999 2.999 0 00-2.121-.879H5.25a2.25 2.25 0 00-2.25 2.25v8.745c0 .621.504 1.125 1.125 1.125H5.25" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Asigurare RCA</h1>
        <p className="mt-1 text-sm text-gray-500">Compară ofertele și alege cea mai bună asigurare auto</p>
      </div>

      {state.error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="flex-1">{state.error}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_ERROR", error: null })}
            className="shrink-0 font-medium text-red-600 underline hover:text-red-800"
          >
            Închide
          </button>
        </div>
      )}

      <WizardStepper
        steps={steps}
        currentStep={currentStep}
        onStepChange={goTo}
      />
    </div>
  );
}
