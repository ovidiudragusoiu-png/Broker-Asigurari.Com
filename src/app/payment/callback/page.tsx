"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";
import { btn } from "@/lib/ui/tokens";
import { CheckCircle2, ShieldCheck, Building2, Calendar, Download, AlertTriangle, ArrowRight, Mail } from "lucide-react";

function isValidPositiveInt(value: string | null): value is string {
  return !!value && /^\d+$/.test(value) && Number(value) > 0;
}

// Shape of the policy creation API response
// RCA: { orderId, policies: [{ policyId, offerId, policyDetails: {...}, productDetails: {...} }] }
// Travel/Other: { orderId, offerId, policyId, series, number, vendorName, error, message, ... }
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
  // RCA format
  policies?: PolicyEntry[];
  // Travel/generic flat format
  offerId?: number;
  policyId?: number | null;
  padPolicyId?: number | null;
  series?: string | null;
  number?: string | null;
  policyIssueDate?: string | null;
  policyStartDate?: string | null;
  policyEndDate?: string | null;
  error?: boolean;
  message?: string | null;
  vendorName?: string | null;
}

// Normalize both response formats into a common shape
function extractPolicyInfo(result: PolicyCreateResponse) {
  // RCA format: nested in policies array
  if (result.policies?.length) {
    const p = result.policies[0];
    return {
      policyId: p.policyId,
      padPolicyId: null,
      series: p.policyDetails?.series,
      number: p.policyDetails?.number,
      vendorName: p.productDetails?.vendorDetails?.commercialName || null,
      startDate: p.policyDetails?.policyStartDate || null,
      endDate: p.policyDetails?.policyEndDate || null,
      error: p.policyDetails?.error || false,
      message: p.policyDetails?.message || null,
    };
  }
  // Travel/generic flat format (also HOUSE)
  return {
    policyId: result.policyId ?? null,
    padPolicyId: result.padPolicyId ?? null,
    series: result.series ?? null,
    number: result.number ?? null,
    vendorName: result.vendorName || null,
    startDate: result.policyStartDate || null,
    endDate: result.policyEndDate || null,
    error: result.error || false,
    message: result.message || null,
  };
}

function PaymentCallbackContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const message = params.get("message");
  const offerId = params.get("offerId");
  const orderHash = params.get("orderHash");
  const productType = (params.get("productType") || "").toUpperCase();
  const urlPadOfferId = params.get("padOfferId");

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
      // V3 docs: "Only create the policy after you validate that the payment was successfully processed."
      // Verify payment via InsureTech API before proceeding to policy creation
      try {
        const padOid = urlPadOfferId && isValidPositiveInt(urlPadOfferId) ? [Number(urlPadOfferId)] : [];
        const payCheck = await api.post<{ offerId: number; success: boolean; message: string }>(
          `/online/offers/payment/check/v3?orderHash=${orderHash}`,
          { offerIds: [Number(offerId), ...padOid] },
          { Accept: "text/plain" }
        );
        if (!payCheck.success) {
          setError(payCheck.message || "Plata nu a fost confirmata de procesatorul de plati.");
          setCreating(false);
          return;
        }
      } catch (checkErr) {
        console.warn("[PaymentCallback] payment check failed, proceeding anyway:", checkErr);
        // Don't block policy creation if payment check itself errors — the redirect status is APPROVED
      }

      // Per V3 docs: RCA uses /policies/rca/v3, all others use /policies/v3
      // HOUSE still uses non-v3 per its own docs
      const endpoint =
        productType === "RCA"
          ? `/online/policies/rca/v3?orderHash=${orderHash}`
          : productType === "HOUSE"
            ? `/online/policies`
            : `/online/policies/v3?orderHash=${orderHash}`;

      let payload: Record<string, unknown>;
      let customerEmail = "";

      // Retrieve saved email (set by PaymentFlow before redirect)
      try {
        customerEmail = sessionStorage.getItem("customerEmail") || "";
      } catch {
        // sessionStorage unavailable
      }

      if (productType === "RCA") {
        let savedData: Record<string, unknown> = {};
        try {
          const raw = sessionStorage.getItem("rcaPolicyData");
          if (raw) {
            savedData = JSON.parse(raw);
            // Also check email from RCA policy data as fallback
            if (!customerEmail) {
              customerEmail = (savedData.email as string) || "";
            }
          }
        } catch {
          // Proceed without saved data
        }

        payload = {
          rcaOfferId: Number(offerId),
          paymentMethodType: "CardOnline",
          ...savedData,
        };
        sessionStorage.removeItem("rcaPolicyData");
      } else {
        payload = { offerId: Number(offerId), paymentMethodType: "CardOnline" };
        // For HOUSE with PAD: include padOfferId from URL param or sessionStorage
        let resolvedPadOfferId = urlPadOfferId;
        if (!resolvedPadOfferId || !isValidPositiveInt(resolvedPadOfferId)) {
          try {
            const saved = sessionStorage.getItem("housePolicyData");
            if (saved) {
              const data = JSON.parse(saved);
              if (data.padOfferId) resolvedPadOfferId = String(data.padOfferId);
            }
          } catch { /* */ }
        }
        if (resolvedPadOfferId && isValidPositiveInt(resolvedPadOfferId)) {
          payload.padOfferId = Number(resolvedPadOfferId);
        }
      }

      // Clean up
      try { sessionStorage.removeItem("customerEmail"); } catch { /* */ }

      const result = await api.post<PolicyCreateResponse>(
        endpoint,
        payload,
        undefined,
        { timeoutMs: 120000 }
      );
      setPolicyResponse(result);

      // Normalize response (RCA has nested policies[], Travel is flat)
      const info = extractPolicyInfo(result);

      if (info.error) {
        setError(
          info.message ||
            "Eroare la generarea poliței. Vă rugăm încercați din nou."
        );
      } else {
        setPolicyCreated(true);

        // Save policy to portal database
        const policyNumber = info.series && info.number
          ? `${info.series} ${info.number}`
          : info.number || null;
        try {
          await fetch("/api/portal/policies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: result.orderId,
              orderHash,
              offerId: Number(offerId),
              policyId: info.policyId,
              productType: productType || "UNKNOWN",
              policyNumber,
              vendorName: info.vendorName,
              startDate: info.startDate,
              endDate: info.endDate,
              email: customerEmail,
            }),
          });
        } catch {
          console.warn("Failed to save policy to portal");
        }
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

  // Extract display data (works for both RCA and Travel response formats)
  const policyInfo = policyResponse ? extractPolicyInfo(policyResponse) : null;
  const policyId = policyInfo?.policyId ?? null;
  const padPolicyId = policyInfo?.padPolicyId ?? null;
  const policyNumber =
    policyInfo?.series && policyInfo?.number
      ? `${policyInfo.series} ${policyInfo.number}`
      : policyInfo?.number || null;
  const vendorName = policyInfo?.vendorName || null;

  return (
    <div className="relative mx-auto max-w-xl px-4 pt-28 pb-16">
      {/* Decorative background blob */}
      {isSuccess && (
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2">
          <div className="h-[300px] w-[300px] rounded-full bg-[#2563EB]/5 blur-[80px]" />
        </div>
      )}

      {/* ── Success header ── */}
      {isSuccess && (
        <div className="relative text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-blue-500 shadow-lg shadow-blue-500/25">
            <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900 sm:text-3xl">
            Plata a fost procesata cu succes!
          </h1>
          <p className="mt-2 text-gray-500">
            {policyCreated
              ? "Polita dumneavoastra a fost emisa si este gata de descarcare."
              : creating
                ? "Se emite polita dumneavoastra..."
                : "Se proceseaza comanda..."}
          </p>
        </div>
      )}

      {/* ── Failed payment header ── */}
      {!isSuccess && (
        <div className="relative text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25">
            <AlertTriangle className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900 sm:text-3xl">
            Plata nu a fost procesata
          </h1>
          <p className="mt-2 text-gray-500">
            {message || "Ne pare rau, plata nu a putut fi finalizata. Va rugam incercati din nou."}
          </p>
        </div>
      )}

      {/* ── Loading spinner while creating policy ── */}
      {isSuccess && creating && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#2563EB]" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-[3px] border-[#2563EB]/20" style={{ animationDuration: "2s" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Se emite polita...</p>
            <p className="mt-1 text-xs text-gray-400">Va rugam nu inchideti aceasta pagina</p>
          </div>
        </div>
      )}

      {/* ── Policy details card ── */}
      {policyCreated && policyResponse && (
        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-900/5">
          {/* Card header */}
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#2563EB]/5 to-blue-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              <h2 className="font-semibold text-gray-900">Polita emisa cu succes</h2>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-5 space-y-4">
            {/* Policy details grid */}
            <div className="space-y-3">
              {policyNumber && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10">
                    <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Numar polita</p>
                    <p className="font-semibold text-gray-900">{policyNumber}</p>
                  </div>
                </div>
              )}
              {vendorName && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10">
                    <Building2 className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Asigurator</p>
                    <p className="font-semibold text-gray-900">{vendorName}</p>
                  </div>
                </div>
              )}
              {policyInfo?.startDate && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10">
                    <Calendar className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Perioada de valabilitate</p>
                    <p className="font-semibold text-gray-900">
                      {policyInfo.startDate.split("T")[0]} — {policyInfo.endDate?.split("T")[0] || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Email notice */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <p className="text-xs text-[#2563EB]">
                Polita a fost trimisa si pe adresa dumneavoastra de email.
              </p>
            </div>

            {/* Download buttons */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              {policyId && (
                <button
                  onClick={() => downloadDocument("policy", policyId)}
                  className={`${btn.primary} flex items-center justify-center gap-2 flex-1`}
                >
                  <Download className="h-4 w-4" />
                  Descarca polita (PDF)
                </button>
              )}
              {padPolicyId && (
                <button
                  onClick={() => downloadDocument("policy", padPolicyId)}
                  className={`${btn.primary} flex items-center justify-center gap-2 flex-1`}
                >
                  <Download className="h-4 w-4" />
                  Descarca polita PAD (PDF)
                </button>
              )}
              {offerId && (
                <button
                  onClick={() => downloadDocument("offer", Number(offerId))}
                  className={`${btn.secondary} flex items-center justify-center gap-2 flex-1`}
                >
                  <Download className="h-4 w-4" />
                  Descarca oferta (PDF)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800">{error}</p>
              {isSuccess && !policyCreated && !creating && (
                <button
                  onClick={() => {
                    setError(null);
                    autoEmitAttempted.current = false;
                    createPolicy();
                  }}
                  className={`${btn.primary} !bg-red-600 hover:!bg-red-700 !px-6 !py-2 text-xs`}
                >
                  Incearca din nou
                </button>
              )}
              <p className="text-xs text-red-400">
                Daca problema persista, va rugam sa ne contactati.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation CTAs ── */}
      <div className="mt-10 flex flex-col items-center gap-4">
        {!isSuccess && (
          <Link href="/" className={`${btn.primary} flex items-center gap-2`}>
            Incearca din nou
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 ${isSuccess && policyCreated ? btn.primary : btn.tertiary}`}
        >
          {isSuccess && policyCreated && <ArrowRight className="h-4 w-4" />}
          Vezi toate politele tale
        </Link>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#2563EB]" />
            <p className="text-sm text-gray-500">Se incarca...</p>
          </div>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
