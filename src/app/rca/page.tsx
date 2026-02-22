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
import DntChoice from "@/components/rca/DntChoice";
import OfferTabs from "@/components/rca/OfferTabs";
import PolicyDetailsForm from "@/components/rca/PolicyDetailsForm";
import AdditionalDriverForm from "@/components/rca/AdditionalDriverForm";
import ReviewSummary from "@/components/rca/ReviewSummary";
import PaymentConfirmation from "@/components/rca/PaymentConfirmation";
import { api, ApiError } from "@/lib/api/client";
import {
  isPostOfferDetailsPFValid,
  isPostOfferDetailsPJValid,
} from "@/lib/utils/formGuards";
import {
  rcaFlowReducer,
  emptyRcaFlowState,
  buildMinimalPersonForOrder,
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

// ============================================================
// Page wrapper (Suspense boundary for useSearchParams)
// ============================================================

export default function RcaPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-500">Se incarca...</div>}>
      <RcaPageInner />
    </Suspense>
  );
}

// ============================================================
// Inner page component
// ============================================================

function RcaPageInner() {
  const [state, dispatch] = useReducer(rcaFlowReducer, null, emptyRcaFlowState);
  const { currentStep, next, goTo } = useWizardUrlSync(6);
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

  // ----- Session storage persist -----
  useEffect(() => {
    const serializable = { ...state };
    sessionStorage.setItem("rcaWizardState", JSON.stringify(serializable));
  }, [state]);

  // ============================================================
  // Step 3: Create order + generate offers
  // ============================================================

  const handleCreateOrderAndOffers = useCallback(async () => {
    if (state.offers.length > 0 || state.loadingOffers) return;

    dispatch({ type: "SET_LOADING_OFFERS", loading: true });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      // 1. Build person with plate-derived location (resolved during plate entry)
      const minimalPerson = buildMinimalPersonForOrder(
        state.ownerType,
        state.cnpOrCui,
        state.email,
        state.plateCountyId,
        state.plateCityId,
        state.platePostalCode
      );

      // Check consent status and submit if needed
      let consentSigned = false;
      try {
        const consentStatus = await api.get<{ signedDocuments: boolean }>(
          `/online/client/documents/status?legalType=${state.ownerType}&cif=${state.cnpOrCui}&vendorProductType=RCA`
        );
        consentSigned = consentStatus.signedDocuments;
      } catch {
        // Status check failed - assume not signed, proceed to submit
        console.warn("Consent status check failed, will attempt to submit consent");
      }

      if (!consentSigned) {
        const consentData = await api.get<{
          sections: { title: string; questions: { id: string; type?: string; answers: { id: string; defaultValue: string }[] }[] }[];
          communicationChannels: string[];
        }>(
          `/online/client/documents/fetch-questions?legalType=${state.ownerType}&vendorProductType=RCA`
        );

        // Build formInputData matching ConsentFlow format: every answer gets true/false
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
          personBaseRequest: normalizePersonForRca(minimalPerson),
          communicationChannelEmail: true,
          communicationChannelPhoneNo: false,
          communicationChannelAddress: false,
          formInputData,
          vendorProductType: "RCA",
          website: typeof window !== "undefined" ? window.location.origin : "https://www.broker-asigurari.com",
        });

        // Verify consent was accepted
        try {
          const verifyStatus = await api.get<{ signedDocuments: boolean }>(
            `/online/client/documents/status?legalType=${state.ownerType}&cif=${state.cnpOrCui}&vendorProductType=RCA`
          );
          if (!verifyStatus.signedDocuments) {
            console.warn("Consent submitted but status still shows unsigned");
          }
        } catch {
          // Verification failed - continue anyway, order creation will be the real test
        }
      }

      // 2. Get RCA products
      const allRcaProducts = await api.get<
        { id: string | number; productName: string; vendorDetails?: { commercialName?: string; [key: string]: unknown } }[]
      >("/online/products/rca");

      // Log all products for debugging
      console.log("All RCA Products:", allRcaProducts.map(p => ({
        id: p.id,
        name: p.productName,
        vendor: p.vendorDetails?.commercialName,
      })));

      // Log full details for unknown "Anytime" product
      const anytimeProducts = allRcaProducts.filter(p =>
        (p.vendorDetails?.commercialName || "").toLowerCase().includes("anytime")
      );
      if (anytimeProducts.length > 0) {
        console.log("Anytime product FULL details:", JSON.stringify(anytimeProducts, null, 2));
      }

      // Filter: keep only "Hellas Next Ins", exclude plain "Hellas"
      const rcaProducts = allRcaProducts.filter(p => {
        const vendor = (p.vendorDetails?.commercialName || "").toLowerCase();
        if (vendor === "hellas") return false;
        return true;
      });

      console.log(`Products: ${allRcaProducts.length} total → ${rcaProducts.length} after filtering`);

      // 3. Create order with minimal/placeholder person data (reuse minimalPerson from above)
      const order = await api.post<{ id: number; productType: string; hash: string }>(
        "/online/offers/rca/order/v3",
        {
          rcaOwnerDetails: normalizePersonForRca(minimalPerson),
          rcaUserDetails: normalizePersonForRca(minimalPerson),
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
            civ: "S123456",
            registrationCertificateNumber: "S123456",
            rafCode: "RAJ506943",
            mileage: 50000,
            km: 50000,
          },
        }
      );

      console.log("Order created:", JSON.stringify(order, null, 2));
      dispatch({ type: "SET_ORDER", orderId: order.id, orderHash: order.hash });

      // 3. Build placeholder driver for offer requests
      const driver = {
        firstName: state.ownerType === "PF" ? "Test" : "",
        lastName: state.ownerType === "PF" ? "Test" : "",
        cnp: state.cnpOrCui,
        idType: "CI" as const,
        idSeries: "XX",
        idNumber: "000000",
        phoneNumber: "0700000000",
        driverLicenceDate: "2010-02-01T00:00:00",
      };

      // 4. Request offers in batches of 3 to avoid API timeouts
      const BATCH_SIZE = 3;
      const OFFER_TIMEOUT = 60000; // 60s per insurer request
      const results: ReturnType<typeof normalizeRcaOffer>[][] = [];

      for (let i = 0; i < rcaProducts.length; i += BATCH_SIZE) {
        const batch = rcaProducts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            try {
              const vendorName = (product.vendorDetails?.commercialName || "").toLowerCase();

              // Per-insurer RAF code: Omniasig needs MGB_M_RAJ506945
              const rafCode = vendorName.includes("omniasig") ? "MGB_M_RAJ506945" : "RAJ506943";

              // Per-insurer mileage: Grawe - try value 0
              const isGrawe = vendorName.includes("grawe");
              const mileageFields = isGrawe
                ? { mileage: 0, km: 0 }
                : { mileage: 50000, km: 50000 };

              const offerPayload = {
                  orderId: order.id,
                  policyStartDate: toRcaDate(state.startDate),
                  periodMonths: ["1", "2", "3", "6", "12"],
                  isLeasing: false,
                  driversDetails: [driver],
                  rcaProductRequests: [
                    {
                      productId: Number(product.id),
                      specificFields: {
                        civ: "S123456",
                        registrationCertificateNumber: "S123456",
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
              console.error(`Offer error for [${product.vendorDetails?.commercialName || product.productName}]:`, offerErr);
              let errorMessage =
                offerErr instanceof Error ? offerErr.message : "Eroare generare oferta";
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
      console.log(`Offers: ${validOffers.length} valid, ${errorOffers.length} with errors`);
      if (errorOffers.length > 0) {
        console.log("Offer errors:", errorOffers.map((o) => `[${o.vendorName || o.productName}] ${o.error}`));
      }

      if (validOffers.length === 0) {
        const errorDetails = errorOffers
          .map((o) => o.error)
          .filter((e, i, arr) => arr.indexOf(e) === i) // unique errors
          .join("; ");
        dispatch({
          type: "SET_ERROR",
          error: `Nu s-au generat oferte RCA. ${errorDetails || "Verificati datele introduse si incercati din nou."}`,
        });
      }
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : "Eroare la crearea comenzii";
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
  }, [state.offers.length, state.loadingOffers, state.ownerType, state.cnpOrCui, state.email, state.vehicle, state.startDate, state.plateCountyId, state.plateCityId, state.platePostalCode]);

  // ============================================================
  // Step 6: Consent auto-submit + payment
  // ============================================================

  const handleConsentAndPay = async () => {
    if (!state.selectedOffer || !state.orderId || !state.orderHash) return;

    // Skip consent/document signing - handled via GDPR notice + T&C modal in UI
    // The user already agreed through the TermsModal checkbox

    // Create payment link
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const redirectURL = `${baseUrl}/payment/callback?orderId=${state.orderId}&offerId=${state.selectedOffer.offer.id}&orderHash=${state.orderHash}&productType=RCA`;

    const paymentUrl = await api.post<string>(
      `/online/offers/payment/v3?orderHash=${state.orderHash}`,
      { offerId: state.selectedOffer.offer.id, redirectURL },
      { Accept: "text/plain" }
    );

    // 3. Redirect to payment gateway
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
  const handleOwnerIdComplete = () => {
    dispatch({ type: "SET_IDENTIFICATION_SUB_STEP", subStep: "dnt" });
  };

  const handleDntContinue = () => {
    dispatch({ type: "SET_SKIP_DNT", skip: true });
    next(); // Move to step 3
    // Trigger offer generation
    handleCreateOrderAndOffers();
  };

  // Step 3: offer selected
  const handleOfferSelected = (selected: SelectedOfferState) => {
    dispatch({ type: "SELECT_OFFER", selected });
    next(); // Move to step 4
  };

  // Step 4: policy details complete
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
    next(); // Move to step 5
  };

  // Step 5: review confirmed
  const handleReviewConfirm = () => {
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
      case "dnt":
        return <DntChoice onContinueDirect={handleDntContinue} />;
    }
  })();

  const step4Content = (
    <div className="space-y-8">
      <PolicyDetailsForm
        ownerType={state.ownerType}
        registrationCertSeries={state.registrationCertSeries}
        startDate={state.startDate}
        ownerFirstName={state.ownerFirstName}
        ownerLastName={state.ownerLastName}
        companyName={state.companyName}
        registrationNumber={state.registrationNumber}
        idType={state.idType}
        idSeries={state.idSeries}
        idNumber={state.idNumber}
        address={state.address}
        onFieldChange={handlePolicyDetailsFieldChange}
        onAddressChange={(address) => dispatch({ type: "SET_ADDRESS", address })}
        onContinue={() => {}}
        isValid={isPolicyDetailsValid}
      />
      <AdditionalDriverForm
        hasDriver={state.hasAdditionalDriver}
        driver={state.additionalDriver}
        onToggle={(has) => dispatch({ type: "SET_ADDITIONAL_DRIVER_TOGGLE", has })}
        onDriverChange={(driver) => dispatch({ type: "SET_ADDITIONAL_DRIVER", driver })}
        onContinue={handlePolicyDetailsContinue}
      />
    </div>
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
      title: "Detalii polita",
      content: step4Content,
    },
    {
      title: "Sumar",
      content: (
        <ReviewSummary
          state={state}
          onEmailChange={(email) => dispatch({ type: "SET_EMAIL", email })}
          onPhoneChange={(phone) => dispatch({ type: "SET_PHONE", phone })}
          onConfirm={handleReviewConfirm}
        />
      ),
    },
    {
      title: "Plata",
      content: (
        <PaymentConfirmation
          state={state}
          onConsentAndPay={handleConsentAndPay}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
        Asigurare RCA
      </h1>

      {state.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
          <button
            onClick={() => dispatch({ type: "SET_ERROR", error: null })}
            className="ml-2 font-medium underline"
          >
            Inchide
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
