"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils/formatters";

interface PaymentFlowProps {
  orderId: number;
  offerId: number;
  orderHash: string;
  amount: number;
  currency?: string;
  productType?: "RCA" | "TRAVEL" | "HOUSE" | "PAD" | "MALPRAXIS";
}

type PaymentStatus = "idle" | "creating" | "redirecting" | "checking" | "paid" | "failed";

export default function PaymentFlow({
  orderId,
  offerId,
  orderHash,
  amount,
  currency = "RON",
  productType,
}: PaymentFlowProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  // API redirects to this URL with ?status=APPROVED&message=... appended
  const redirectURL = `${baseUrl}/payment/callback?orderId=${orderId}&offerId=${offerId}&orderHash=${orderHash}${productType ? `&productType=${productType}` : ""}`;

  const handlePay = async () => {
    setError(null);
    setStatus("creating");

    try {
      // Create payment link - API returns plain text URL
      const paymentUrl = await api.post<string>(
        `/online/offers/payment/v3?orderHash=${orderHash}`,
        { offerId, redirectURL },
        { Accept: "text/plain" }
      );

      setStatus("redirecting");
      // Redirect to payment gateway
      window.location.href = paymentUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la plata");
      setStatus("failed");
    }
  };

  const handlePayLoan = async () => {
    setError(null);
    setStatus("creating");

    try {
      const loanUrl = await api.post<string>(
        `/online/offers/payment/loan/v3?orderHash=${orderHash}`,
        { offerId, redirectURL },
        { Accept: "text/plain" }
      );

      setStatus("redirecting");
      window.location.href = loanUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la plata in rate");
      setStatus("failed");
    }
  };

  const checkPaymentStatus = async () => {
    setStatus("checking");
    try {
      const result = await api.post<{ offerId: number; success: boolean; message: string }>(
        `/online/offers/payment/check/v3?orderHash=${orderHash}`,
        { offerIds: [offerId] },
        { Accept: "text/plain" }
      );

      if (result.success) {
        setStatus("paid");
        setPaymentMessage("Plata a fost efectuata cu succes!");
      } else {
        setStatus("failed");
        setPaymentMessage(result.message || "Plata nu a fost finalizata");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare verificare plata");
      setStatus("failed");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Plata</h3>

      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm text-gray-700">
          Total de plata:{" "}
          <span className="text-lg font-bold text-blue-700">
            {formatPrice(amount, currency)}
          </span>
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {paymentMessage && (
        <div
          className={`rounded-md p-3 text-sm ${
            status === "paid"
              ? "bg-green-50 text-green-700"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {paymentMessage}
        </div>
      )}

      {status === "idle" && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handlePay}
            className="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Plateste cu cardul
          </button>
          <button
            type="button"
            onClick={handlePayLoan}
            className="rounded-md border border-blue-700 px-6 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Plateste in rate (TBI Bank)
          </button>
        </div>
      )}

      {status === "creating" && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          Se creeaza link-ul de plata...
        </div>
      )}

      {status === "redirecting" && (
        <p className="text-sm text-gray-500">
          Se redirectioneaza catre platforma de plata...
        </p>
      )}

      {(status === "failed" || status === "checking") && (
        <button
          type="button"
          onClick={checkPaymentStatus}
          disabled={status === "checking"}
          className="rounded-md bg-gray-600 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {status === "checking" ? "Se verifica..." : "Verifica starea platii"}
        </button>
      )}
    </div>
  );
}
