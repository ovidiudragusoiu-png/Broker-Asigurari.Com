"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils/formatters";
import TermsModal from "@/components/rca/TermsModal";

interface PaymentFlowProps {
  orderId: number;
  offerId: number;
  orderHash: string;
  amount: number;
  currency?: string;
  productType?: "RCA" | "TRAVEL" | "HOUSE" | "PAD" | "MALPRAXIS" | "CASCO";
  /** Additional offer IDs to include in payment (e.g. PAD offer alongside house offer) */
  additionalOfferIds?: number[];
  /** PAD premium to display alongside main premium (separate currency) */
  padPremium?: number;
  padCurrency?: string;
  customerEmail?: string;
  onBack?: () => void;
}

type PaymentStatus = "idle" | "creating" | "redirecting" | "checking" | "paid" | "failed";

export default function PaymentFlow({
  orderId,
  offerId,
  orderHash,
  amount,
  currency = "RON",
  productType,
  additionalOfferIds,
  padPremium,
  padCurrency,
  customerEmail,
  onBack,
}: PaymentFlowProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [pendingAction, setPendingAction] = useState<"card" | "loan" | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const padOfferId = additionalOfferIds?.length ? additionalOfferIds[0] : null;
  const redirectURL = `${baseUrl}/payment/callback?orderId=${orderId}&offerId=${offerId}&orderHash=${orderHash}${productType ? `&productType=${productType}` : ""}${padOfferId ? `&padOfferId=${padOfferId}` : ""}`;

  // PAD standalone uses non-v3 payment endpoint; HOUSE now uses v3 (same session)
  const useNonV3 = productType === "PAD";

  const handlePay = async () => {
    setError(null);
    setStatus("creating");
    try {
      const endpoint = useNonV3
        ? "/online/offers/payment"
        : `/online/offers/payment/v3?orderHash=${orderHash}`;
      const paymentUrl = await api.post<string>(
        endpoint,
        {
          offerId,
          redirectURL,
          ...(additionalOfferIds?.length ? { additionalProductsOfferIds: additionalOfferIds } : {}),
        },
        { Accept: "text/plain" }
      );
      if (customerEmail) sessionStorage.setItem("customerEmail", customerEmail);
      setStatus("redirecting");
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
      const loanEndpoint = useNonV3
        ? "/online/offers/payment/loan"
        : `/online/offers/payment/loan/v3?orderHash=${orderHash}`;
      const loanUrl = await api.post<string>(
        loanEndpoint,
        {
          offerId,
          redirectURL,
          ...(additionalOfferIds?.length ? { additionalProductsOfferIds: additionalOfferIds } : {}),
        },
        { Accept: "text/plain" }
      );
      if (customerEmail) sessionStorage.setItem("customerEmail", customerEmail);
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
        { offerIds: [offerId, ...(additionalOfferIds || [])] },
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
    <div className="mx-auto max-w-md space-y-4">

      {/* Amount summary */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-center text-white shadow-lg shadow-blue-500/20">
        {padPremium != null && padCurrency ? (
          <>
            <p className="text-sm font-medium text-blue-100">Total de plata</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatPrice(amount, currency)} + {formatPrice(padPremium, padCurrency)}
            </p>
            <div className="mt-2 flex justify-center gap-4 text-xs text-blue-200">
              <span>Locuinta: {formatPrice(amount, currency)}</span>
              <span>PAD: {formatPrice(padPremium, padCurrency)}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-blue-100">Prima de asigurare anuala</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {formatPrice(amount, currency)}
            </p>
          </>
        )}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-200">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Plata securizata · SSL 256-bit
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        {/* Idle: payment method selection */}
        {status === "idle" && (
          <div className="p-5">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              Alege metoda de plata
            </p>

            {/* Card payment */}
            <button
              type="button"
              onClick={() => { setPendingAction("card"); setShowTerms(true); }}
              className="group mb-3 flex w-full items-center gap-4 rounded-xl border-2 border-blue-600 bg-blue-600 p-4 text-left transition-all hover:bg-blue-700 hover:border-blue-700 active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Plateste cu cardul</p>
                <p className="mt-0.5 text-xs text-blue-100">Visa, Mastercard · instant</p>
              </div>
              <svg className="h-4 w-4 text-white/70 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            {/* Loan payment */}
            <button
              type="button"
              onClick={() => { setPendingAction("loan"); setShowTerms(true); }}
              className="group flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Plateste in rate</p>
                <p className="mt-0.5 text-xs text-gray-400">TBI Bank · rate lunare</p>
              </div>
              <svg className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            {/* Trust row */}
            <div className="mt-4 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                Plata criptata
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                3D Secure
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Polita imediata
              </span>
            </div>
          </div>
        )}

        {/* Creating / Redirecting state */}
        {(status === "creating" || status === "redirecting") && (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue-100" />
              <span className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {status === "creating" ? "Se pregateste plata..." : "Redirectionare catre banca..."}
              </p>
              <p className="mt-1 text-xs text-gray-400">Va rugam nu inchideti aceasta pagina</p>
            </div>
          </div>
        )}

        {/* Failed / checking state */}
        {(status === "failed" || status === "checking") && (
          <div className="p-5">
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Verificare necesara</p>
                <p className="mt-0.5 text-xs text-amber-600">Daca ai finalizat plata in fereastra bancii, apasa butonul de mai jos pentru a confirma.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={checkPaymentStatus}
              disabled={status === "checking"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              {status === "checking" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Se verifica...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Verifica starea platii
                </>
              )}
            </button>
          </div>
        )}

        {/* Paid state */}
        {status === "paid" && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-base font-bold text-green-700">Plata confirmata!</p>
            <p className="text-sm text-gray-500">{paymentMessage}</p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Non-paid message */}
      {paymentMessage && status !== "paid" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {paymentMessage}
        </div>
      )}

      {/* Back button */}
      {onBack && status === "idle" && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Inapoi la oferte
          </button>
        </div>
      )}

      <TermsModal
        isOpen={showTerms}
        productLabel={
          productType === "TRAVEL" ? "de Calatorie" :
          productType === "HOUSE" ? "de Asigurare Locuință" :
          productType === "MALPRAXIS" ? "Malpraxis Medical" :
          productType === "CASCO" ? "CASCO" :
          productType || "RCA"
        }
        onClose={() => { setShowTerms(false); setPendingAction(null); }}
        onAgree={() => {
          setShowTerms(false);
          if (pendingAction === "loan") handlePayLoan();
          else handlePay();
          setPendingAction(null);
        }}
      />
    </div>
  );
}
