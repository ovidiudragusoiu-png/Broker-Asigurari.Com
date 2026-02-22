"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";
import { btn } from "@/lib/ui/tokens";

function isValidPositiveInt(value: string | null): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) > 0;
}

// Shape of the policy creation API response
interface PolicyEntry {
  policyId: number | null;
  offerId: number;
  policyDetails: {
    series: string | null;
    number: string | null;
    policyIssueDate: string | null;
    policyStartDate: string | null;
    policyEndDate: string | null;
    error: boolean;
    message: string | null;
  };
  productDetails?: {
    vendorDetails?: { commercialName?: string };
  };
}

interface PolicyCreateResponse {
  orderId: number;
  policies: PolicyEntry[];
}

function PaymentCallbackContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const message = params.get("message");
  const offerId = params.get("offerId");
  const orderHash = params.get("orderHash");
  const productType = (params.get("productType") || "").toUpperCase();

  const [policyCreated, setPolicyCreated] = useState(false);
  const [policyResponse, setPolicyResponse] =
    useState<PolicyCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const autoEmitAttempted = useRef(false);

  const normalizedStatus = (status || "").toUpperCase();
  const isSuccess = normalizedStatus === "APPROVED";
  const hasRequiredParams = isValidPositiveInt(offerId) && !!orderHash;

  const createPolicy = async () => {
    if (!isValidPositiveInt(offerId) || !orderHash) {
      setError("Parametrii de plată sunt invalizi.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const endpoint =
        productType === "RCA"
          ? `/online/policies/rca/v3?orderHash=${orderHash}`
          : `/online/policies/v3?orderHash=${orderHash}`;

      let payload: Record<string, unknown>;
      if (productType === "RCA") {
        let savedData: Record<string, unknown> = {};
        try {
          const raw = sessionStorage.getItem("rcaPolicyData");
          console.log("rcaPolicyData from sessionStorage:", raw ? JSON.parse(raw) : "NOT FOUND");
          if (raw) savedData = JSON.parse(raw);
        } catch {
          // Proceed without saved data
        }

        payload = {
          rcaOfferId: Number(offerId),
          paymentMethodType: "CardOnline",
          ...savedData,
        };
        console.log("Policy creation payload:", JSON.stringify(payload, null, 2));

        sessionStorage.removeItem("rcaPolicyData");
      } else {
        payload = { offerId: Number(offerId), paymentMethodType: "CardOnline" };
      }

      const result = await api.post<PolicyCreateResponse>(
        endpoint,
        payload,
        undefined,
        { timeoutMs: 120000 }
      );
      console.log("Policy creation response:", JSON.stringify(result, null, 2));
      setPolicyResponse(result);

      // Check if policy was actually created (API returns 200 even on failure)
      const policy = result.policies?.[0];
      if (policy?.policyDetails?.error) {
        setError(
          policy.policyDetails.message ||
            "Eroare la generarea poliței. Vă rugăm încercați din nou."
        );
      } else {
        setPolicyCreated(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la crearea poliței.");
    } finally {
      setCreating(false);
    }
  };

  // Auto-emit policy when payment is approved
  useEffect(() => {
    if (isSuccess && hasRequiredParams && !autoEmitAttempted.current) {
      autoEmitAttempted.current = true;
      createPolicy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hasRequiredParams]);

  const downloadDocument = async (type: "offer" | "policy", id: number) => {
    if (!orderHash || !Number.isFinite(id) || id <= 0) {
      setError("Parametrii pentru descărcarea documentului sunt invalizi.");
      return;
    }
    const endpoint =
      type === "offer"
        ? `/online/offers/${id}/document/v3?orderHash=${orderHash}`
        : `/online/policies/${id}/document/v3?orderHash=${orderHash}`;

    try {
      const data = await api.get<{ url: string }>(endpoint, {
        timeoutMs: 60000,
      });
      if (data.url) {
        const safeUrl = new URL(data.url, window.location.origin);
        if (!["http:", "https:"].includes(safeUrl.protocol)) {
          throw new Error("Linkul documentului este invalid.");
        }
        window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Eroare la descărcarea documentului."
      );
    }
  };

  // Extract data from the policies array
  const policy = policyResponse?.policies?.[0];
  const policyId = policy?.policyId ?? null;
  const policyNumber =
    policy?.policyDetails?.series && policy?.policyDetails?.number
      ? `${policy.policyDetails.series} ${policy.policyDetails.number}`
      : policy?.policyDetails?.number || null;
  const vendorName =
    policy?.productDetails?.vendorDetails?.commercialName || null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div
        className={`rounded-lg border p-6 text-center ${
          isSuccess
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? "bg-emerald-100" : "bg-red-100"}`}>
          <span className={`text-2xl font-bold ${isSuccess ? "text-emerald-600" : "text-red-600"}`}>{isSuccess ? "✓" : "✗"}</span>
        </div>
        <h1
          className={`mt-3 text-2xl font-bold ${
            isSuccess ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {isSuccess ? "Plata a fost efectuată cu succes!" : "Plata nu a fost procesată"}
        </h1>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>

      {/* Auto-creating policy — show spinner */}
      {isSuccess && creating && (
        <div className="mt-6 flex items-center justify-center gap-3 text-gray-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm font-medium">Se emite polița...</span>
        </div>
      )}

      {/* Policy created successfully */}
      {policyCreated && policyResponse && (
        <div className="mt-6 space-y-4 rounded-lg border border-emerald-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Polița a fost emisă cu succes!</h2>
          {policyNumber && (
            <p className="text-sm text-gray-600">
              Număr poliță: <strong>{policyNumber}</strong>
            </p>
          )}
          {vendorName && (
            <p className="text-sm text-gray-600">
              Asigurător: <strong>{vendorName}</strong>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {offerId && (
              <button
                onClick={() => downloadDocument("offer", Number(offerId))}
                className={btn.secondary}
              >
                Descarcă oferta (PDF)
              </button>
            )}
            {policyId && (
              <button
                onClick={() => downloadDocument("policy", policyId)}
                className={btn.primary}
              >
                Descarcă polița (PDF)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error with retry */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          {isSuccess && !policyCreated && !creating && (
            <button
              onClick={() => {
                setError(null);
                autoEmitAttempted.current = false;
                createPolicy();
              }}
              className="ml-3 font-medium text-red-800 underline hover:text-red-900"
            >
              Încearcă din nou
            </button>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/"
          className={btn.tertiary}
        >
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-gray-500">
          Se încarcă...
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
