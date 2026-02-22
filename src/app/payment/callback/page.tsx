"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";

function isValidPositiveInt(value: string | null): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) > 0;
}

function PaymentCallbackContent() {
  const params = useSearchParams();
  // Payment gateway appends: ?status=APPROVED&message=Approved (or error messages)
  const status = params.get("status");
  const message = params.get("message");
  const offerId = params.get("offerId");
  const orderHash = params.get("orderHash");
  const productType = (params.get("productType") || "").toUpperCase();

  const [policyCreated, setPolicyCreated] = useState(false);
  const [policyData, setPolicyData] = useState<Record<string, unknown> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const normalizedStatus = (status || "").toUpperCase();
  const isSuccess = normalizedStatus === "APPROVED";
  const hasRequiredParams = isValidPositiveInt(offerId) && !!orderHash;

  const createPolicy = async () => {
    if (!isValidPositiveInt(offerId) || !orderHash) {
      setError("Parametri de plata invalizi");
      return;
    }
    setCreating(true);
    try {
      const endpoint =
        productType === "RCA"
          ? `/online/policies/rca/v3?orderHash=${orderHash}`
          : `/online/policies/v3?orderHash=${orderHash}`;
      const payload =
        productType === "RCA"
          ? { rcaOfferId: Number(offerId), paymentMethodType: "CardOnline" }
          : { offerId: Number(offerId), paymentMethodType: "CardOnline" };

      const result = await api.post<Record<string, unknown>>(endpoint, payload);
      setPolicyData(result);
      setPolicyCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare creare polita");
    } finally {
      setCreating(false);
    }
  };

  const downloadDocument = async (type: "offer" | "policy", id: number) => {
    if (!orderHash || !Number.isFinite(id) || id <= 0) {
      setError("Parametri invalizi pentru descarcare document");
      return;
    }
    const endpoint =
      type === "offer"
        ? `/online/offers/${id}/document/v3?orderHash=${orderHash}`
        : `/online/policies/${id}/document/v3?orderHash=${orderHash}`;

    try {
      // API returns { url: string } - the URL to the document
      const data = await api.get<{ url: string }>(endpoint);
      if (data.url) {
        const safeUrl = new URL(data.url, window.location.origin);
        if (!["http:", "https:"].includes(safeUrl.protocol)) {
          throw new Error("Link document invalid");
        }
        window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Eroare descarcare document"
      );
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div
        className={`rounded-lg border p-6 text-center ${
          isSuccess
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="text-4xl">{isSuccess ? "✓" : "✗"}</div>
        <h1
          className={`mt-3 text-2xl font-bold ${
            isSuccess ? "text-green-700" : "text-red-700"
          }`}
        >
          {isSuccess ? "Plata efectuata cu succes!" : "Plata esuata"}
        </h1>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>

      {isSuccess && !policyCreated && (
        <div className="mt-6 text-center">
          <button
            onClick={createPolicy}
            disabled={creating || !hasRequiredParams}
            className="rounded-md bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {creating ? "Se creeaza polita..." : "Emite polita"}
          </button>
          {!hasRequiredParams && (
            <p className="mt-2 text-xs text-red-600">
              Parametri lipsa sau invalizi in callback-ul de plata.
            </p>
          )}
        </div>
      )}

      {policyCreated && policyData && (
        <div className="mt-6 space-y-4 rounded-lg border border-green-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Polita emisa!</h2>
          {typeof policyData.number === "string" && (
            <p className="text-sm text-gray-600">
              Numar polita: <strong>{policyData.number}</strong>
            </p>
          )}
          <div className="flex gap-3">
            {offerId && (
              <button
                onClick={() => downloadDocument("offer", Number(offerId))}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Descarca oferta (PDF)
              </button>
            )}
            {typeof policyData.policyId === "number" && (
              <button
                onClick={() =>
                  downloadDocument("policy", policyData.policyId as number)
                }
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Descarca polita (PDF)
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Inapoi la pagina principala
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
          Se incarca...
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
