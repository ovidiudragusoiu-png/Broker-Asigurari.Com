"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { api, ApiError } from "@/lib/api/client";
import {
  fetchOfferDocument,
  fetchPolicyDocument,
  openDocumentInNewTab,
} from "@/lib/api/documentsClient";
import { MALPRAXIS_TRACE_HEADER } from "@/lib/debug/malpraxisTrace";
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
    productName?: string;
  };
}

interface StoredAddonMeta {
  offerId: number;
  label: string;
}

interface ResolvedAddonDocument extends StoredAddonMeta {
  policyId: number | null;
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

interface CallbackErrorPresentation {
  kind: "insurer" | "generic";
  title: string;
  detail: string;
  hint: string;
}

// Normalize both response formats into a common shape
function extractPolicyInfo(result: PolicyCreateResponse, mainOfferId?: number) {
  // RCA format: nested in policies array
  if (result.policies?.length) {
    const p =
      mainOfferId != null
        ? result.policies.find((entry) => entry.offerId === mainOfferId) ??
          result.policies[0]
        : result.policies[0];
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

function getCallbackErrorPresentation(
  error: string | null,
  paymentApproved: boolean
): CallbackErrorPresentation | null {
  if (!error || error === "__OFFER_EXPIRED__") {
    return null;
  }

  const trimmed = error.trim();

  if (paymentApproved) {
    const insurerDetail = trimmed.replace(/^Payment Reverted due to:\s*/i, "").trim();
    if (/mesaj asigurator|INS-\d+/i.test(insurerDetail)) {
      return {
        kind: "insurer",
        title: "Plata a fost confirmata, dar polita nu a putut fi emisa automat",
        detail: insurerDetail,
        hint: "Problema vine din raspunsul asiguratorului. Puteti reincerca sau transmite acest mesaj catre suport.",
      };
    }

    return {
      kind: "generic",
      title: "Plata a fost confirmata, dar emiterea politei a esuat",
      detail: trimmed,
      hint: "Puteti reincerca. Daca problema persista, va rugam sa ne contactati.",
    };
  }

  return {
    kind: "generic",
    title: "Plata nu a putut fi finalizata",
    detail: trimmed,
    hint: "Daca problema persista, va rugam sa ne contactati.",
  };
}

function parseStoredAddonMeta(
  policyData: Record<string, unknown>,
  fallbackOfferIds: number[]
): StoredAddonMeta[] {
  const rawAddons = policyData.additionalProductAddons;
  if (Array.isArray(rawAddons)) {
    const parsed = rawAddons
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const offerId = Number((entry as { offerId?: unknown }).offerId);
        const label = String((entry as { label?: unknown }).label || "").trim();
        if (!Number.isFinite(offerId) || offerId <= 0) return null;
        return {
          offerId,
          label: label || `Supliment ${offerId}`,
        };
      })
      .filter((entry): entry is StoredAddonMeta => entry !== null);
    if (parsed.length > 0) return parsed;
  }

  return fallbackOfferIds.map((offerId) => ({
    offerId,
    label: `Supliment ${offerId}`,
  }));
}

function isPolicyIssuingStillActiveError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /INS-0030|policy issuing request is still active|a policy issuing request is still active/i.test(
    message
  );
}

function isRetryablePolicyCreateHttpError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 504 || err.status === 408);
}

function policyCreateRetryDelayMs(err: unknown, attempt: number): number {
  if (isRetryablePolicyCreateHttpError(err)) {
    // Upstream may still be issuing after a gateway/client timeout.
    return 15000 * attempt;
  }
  return 2500 * attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDocumentFetchError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /INS-9999|cererea nu a fost gasita|cererea nu a fost găsită|pdf-ul nu a putut|not found|nu este disponibil/i.test(
    message
  );
}

function isRetryableDocumentFetchError(message: string): boolean {
  return /cererea nu a fost gasita|cererea nu a fost găsită|request.*not found|nu a fost gasita|nu a fost găsită/i.test(
    message
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function postPolicyWithIns0030Retry<T>(
  path: string,
  payload: Record<string, unknown>,
  headers?: Record<string, string>,
  options?: { timeoutMs?: number }
): Promise<T> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await api.post<T>(path, payload, headers, options);
    } catch (err) {
      lastError = err;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      const shouldRetry =
        attempt < maxAttempts &&
        (isPolicyIssuingStillActiveError(message) ||
          isRetryablePolicyCreateHttpError(err));
      if (shouldRetry) {
        await sleep(policyCreateRetryDelayMs(err, attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

function resolveAddonDocuments(
  storedAddons: StoredAddonMeta[],
  policies: PolicyEntry[] | undefined,
  mainOfferId: number
): ResolvedAddonDocument[] {
  const policyByOfferId = new Map<number, number | null>();
  for (const entry of policies ?? []) {
    if (entry.offerId !== mainOfferId) {
      policyByOfferId.set(entry.offerId, entry.policyId);
    }
  }

  return storedAddons.map((addon) => ({
    ...addon,
    policyId: policyByOfferId.get(addon.offerId) ?? null,
  }));
}

// Checkout session data loaded from server
interface SessionData {
  orderId: number;
  offerId: number;
  orderHash: string;
  productType: string;
  email: string | null;
  padOfferId: number | null;
  policyData: Record<string, unknown> | null;
}

function PaymentCallbackContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const message = params.get("message");
  const sessionToken = params.get("session");
  const traceId = params.get("traceId");

  // Legacy URL params (fallback for in-flight payments during migration)
  const legacyOfferId = params.get("offerId");
  const legacyOrderHash = params.get("orderHash");
  const legacyProductType = (params.get("productType") || "").toUpperCase();
  const legacyPadOfferId = params.get("padOfferId");

  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!sessionToken);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [policyCreated, setPolicyCreated] = useState(false);
  const [policyResponse, setPolicyResponse] =
    useState<PolicyCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [addonDocuments, setAddonDocuments] = useState<ResolvedAddonDocument[]>([]);
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const autoEmitAttempted = useRef(false);
  const policyCreateInFlight = useRef(false);
  const emailSentTo = useRef("");
  const insurerAutoCreated = useRef(false);

  // Resolved values (from session or legacy params)
  const offerId = session ? String(session.offerId) : legacyOfferId;
  const orderHash = session ? session.orderHash : legacyOrderHash;
  const productType = session ? session.productType : legacyProductType;
  const resolvedPadOfferId = session?.padOfferId ?? (legacyPadOfferId && isValidPositiveInt(legacyPadOfferId) ? Number(legacyPadOfferId) : null);

  const normalizedStatus = (status || "").toUpperCase();
  const isSuccess = normalizedStatus === "APPROVED";
  const hasRequiredParams = isValidPositiveInt(offerId) && !!orderHash;

  // Load checkout session from server
  useEffect(() => {
    if (!sessionToken) {
      // Legacy flow — no session token, use URL params directly
      setSessionLoading(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`/api/checkout/session?token=${sessionToken}`);
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setSessionError(body.error || "Sesiune invalida sau expirata.");
          return;
        }
        const data: SessionData = await resp.json();
        setSession(data);
      } catch {
        setSessionError("Nu s-a putut incarca sesiunea de plata.");
      } finally {
        setSessionLoading(false);
      }
    })();
  }, [sessionToken]);

  const createPolicy = async () => {
    if (!isValidPositiveInt(offerId) || !orderHash) {
      setError("Parametrii de plată sunt invalizi.");
      return;
    }
    if (policyCreateInFlight.current) return;
    policyCreateInFlight.current = true;
    setCreating(true);
    setError(null);
    try {
      // Verify payment via InsureTech API before proceeding to policy creation.
      let policyDataForAddons: Record<string, unknown> = session?.policyData || {};
      if (!session?.policyData) {
        try {
          const raw = localStorage.getItem("rcaPolicyData");
          if (raw) policyDataForAddons = JSON.parse(raw);
        } catch { /* */ }
      }
      const additionalOfferIds = Array.isArray(
        policyDataForAddons.additionalProductsOfferIds
      )
        ? (policyDataForAddons.additionalProductsOfferIds as unknown[])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [];
      const storedAddonMeta = parseStoredAddonMeta(
        policyDataForAddons,
        additionalOfferIds
      );
      const padOid = resolvedPadOfferId ? [resolvedPadOfferId] : [];
      const checkPayload = {
        offerIds: [Number(offerId), ...padOid, ...additionalOfferIds],
      };
      let paymentVerified = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const payCheckRaw = await api.post<
            { offerId: number; success: boolean; message: string }[]
          >(
            `/online/offers/payment/check/v3?orderHash=${orderHash}`,
            checkPayload,
            { Accept: "application/json" }
          );
          const payResults = Array.isArray(payCheckRaw) ? payCheckRaw : [payCheckRaw];
          const failed = payResults.find((r) => !r.success);
          if (failed) {
            setError(failed.message || "Plata nu a fost confirmata de procesatorul de plati.");
            setCreating(false);
            return;
          }
          paymentVerified = true;
          break;
        } catch (checkErr) {
          console.warn(`[PaymentCallback] payment check attempt ${attempt}/3 failed:`, checkErr);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
      }
      if (!paymentVerified) {
        setError("Verificarea platii nu a putut fi finalizata. Va rugam asteptati cateve minute si reincercati.");
        setCreating(false);
        return;
      }

      // Use email from server-side session (preferred) or legacy localStorage fallback
      let customerEmail = session?.email || "";
      if (!customerEmail) {
        try { customerEmail = localStorage.getItem("customerEmail") || ""; } catch { /* */ }
      }
      if (customerEmail) emailSentTo.current = customerEmail;

      let vehicleVin = "";
      let vehiclePlate = "";
      let vehicleCategory = "";

      // ── Step 1: Fetch offer details (safe GET, no side effects) ──
      let offerDetails: Record<string, unknown> | null = null;
      try {
        const detailsEndpoint = productType === "MALPRAXIS"
          ? `/online/offers/malpraxis/${offerId}/details/v3?orderHash=${orderHash}`
          : productType === "TRAVEL"
            ? `/online/offers/travel/${offerId}/details/v3?orderHash=${orderHash}`
            : productType === "RCA"
              ? `/online/offers/rca/${offerId}/details/v3?orderHash=${orderHash}`
              : productType === "HOUSE"
                ? `/online/offers/house/${offerId}/details/v3?orderHash=${orderHash}`
                : `/online/offers/${offerId}/details/v3?orderHash=${orderHash}`;
        offerDetails = await api.get<Record<string, unknown>>(detailsEndpoint, { timeoutMs: 15000 });
      } catch (detailsErr) {
        console.warn("[PaymentCallback] Could not fetch offer details:", detailsErr);
      }

      // Extract vendor/dates from offer details
      const pd = offerDetails?.productDetails as Record<string, unknown> | undefined;
      const vd = pd?.vendorDetails as Record<string, unknown> | undefined;
      const offerVendor = (vd?.commercialName as string) || (vd?.name as string) || null;
      const offerStart = (offerDetails?.policyStartDate as string) || null;
      const offerEnd = (offerDetails?.policyEndDate as string) || null;

      // ── Step 2: Create policy ──
      // Only Euroins auto-creates the policy after payment.
      const isEuroins = offerVendor?.toLowerCase().includes("euroins");
      const skipPolicyCreation = isEuroins === true;
      if (skipPolicyCreation) insurerAutoCreated.current = true;

      let info = {
        policyId: null as number | null,
        padPolicyId: null as number | null,
        series: null as string | null,
        number: null as string | null,
        vendorName: offerVendor,
        startDate: offerStart,
        endDate: offerEnd,
        error: false,
        message: null as string | null,
      };
      let emailAddonDocuments: ResolvedAddonDocument[] = resolveAddonDocuments(
        storedAddonMeta,
        undefined,
        Number(offerId)
      );

      if (skipPolicyCreation) {
        console.log("[PaymentCallback] Skipping policies/v3 for", productType, "(insurer auto-creates policy)");
        setAddonDocuments(emailAddonDocuments);
        setPolicyResponse({
          orderId: session?.orderId || (offerDetails?.orderId as number) || 0,
          vendorName: offerVendor,
          policyStartDate: offerStart,
          policyEndDate: offerEnd,
          error: false,
          message: null,
        });
      } else {
        // Normal flow: call policies/v3 to create the policy
        const policyEndpoint =
          productType === "RCA"
            ? `/online/policies/rca/v3?orderHash=${orderHash}`
            : `/online/policies/v3?orderHash=${orderHash}`;

        let payload: Record<string, unknown>;

        if (productType === "RCA") {
          // Load policy data from server-side session (preferred) or legacy localStorage
          let savedData: Record<string, unknown> = session?.policyData || {};
          if (!session?.policyData) {
            try {
              const raw = localStorage.getItem("rcaPolicyData");
              if (raw) savedData = JSON.parse(raw);
            } catch { /* */ }
          }
          if (!customerEmail && savedData.email) {
            customerEmail = savedData.email as string;
            emailSentTo.current = customerEmail;
          }

          const savedVd = savedData.vehicleDetails as Record<string, unknown> | undefined;
          if (savedVd) {
            vehicleVin = (savedVd.vin as string) || "";
            vehiclePlate = (savedVd.plateNo as string) || "";
            vehicleCategory = String(savedVd.vehicleCategoryId || "");
          }
          payload = {
            rcaOfferId: Number(offerId),
            paymentMethodType: "CardOnline",
            additionalProductsOfferIds: additionalOfferIds,
          };
          try { localStorage.removeItem("rcaPolicyData"); } catch { /* */ }
        } else {
          payload = { offerId: Number(offerId), paymentMethodType: "CardOnline" };
          if (resolvedPadOfferId) {
            payload.padOfferId = resolvedPadOfferId;
          }
        }

        try { localStorage.removeItem("customerEmail"); } catch { /* */ }

        let result = await postPolicyWithIns0030Retry<PolicyCreateResponse>(
          policyEndpoint,
          payload,
          {
            Accept: "application/json",
            ...(traceId && productType === "MALPRAXIS"
              ? { [MALPRAXIS_TRACE_HEADER]: traceId }
              : {}),
          },
          { timeoutMs: 120000 }
        );

        let policyInfo = extractPolicyInfo(result, Number(offerId));

        if (
          policyInfo.error &&
          isPolicyIssuingStillActiveError(policyInfo.message)
        ) {
          await sleep(2500);
          result = await postPolicyWithIns0030Retry<PolicyCreateResponse>(
            policyEndpoint,
            payload,
            {
              Accept: "application/json",
              ...(traceId && productType === "MALPRAXIS"
                ? { [MALPRAXIS_TRACE_HEADER]: traceId }
                : {}),
            },
            { timeoutMs: 120000 }
          );
          policyInfo = extractPolicyInfo(result, Number(offerId));
        }

        const resolvedAddons = resolveAddonDocuments(
          storedAddonMeta,
          result.policies,
          Number(offerId)
        );
        emailAddonDocuments = resolvedAddons;
        setAddonDocuments(resolvedAddons);

        const alreadyIssued = policyInfo.error && policyInfo.message?.includes("Exista deja o polita emisa");
        const offerExpired = policyInfo.error && policyInfo.message?.includes("Data platii trebuie sa fie intre");

        if (policyInfo.error && !alreadyIssued && !offerExpired) {
          info = { ...info, error: true, message: policyInfo.message };
        } else if (offerExpired) {
          info = { ...info, error: true, message: "__OFFER_EXPIRED__" };
        } else if (!alreadyIssued) {
          info = policyInfo;
        }

        setPolicyResponse(alreadyIssued
          ? { orderId: result.orderId, policyId: info.policyId, series: info.series, number: info.number,
              vendorName: info.vendorName, policyStartDate: info.startDate, policyEndDate: info.endDate,
              error: false, message: null }
          : result);
      }

      if (info.error) {
        setError(
          info.message ||
            "Eroare la generarea poliței. Vă rugăm încercați din nou."
        );
      } else {
        setPolicyCreated(true);

        // Save policy to portal database when the insurer returned a policy id.
        const policyNumber = info.series && info.number
          ? `${info.series} ${info.number}`
          : info.number || null;
        const canPersistPortalPolicy = typeof info.policyId === "number" && info.policyId > 0;
        if (canPersistPortalPolicy) {
          try {
            await fetch("/api/portal/policies", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: session?.orderId || (offerDetails?.orderId as number) || 0,
                orderHash,
                offerId: Number(offerId),
                policyId: info.policyId,
                productType: productType || "UNKNOWN",
                policyNumber,
                vendorName: info.vendorName,
                startDate: info.startDate,
                endDate: info.endDate,
                email: customerEmail,
                vehicleVin: vehicleVin || undefined,
                vehiclePlate: vehiclePlate || undefined,
                vehicleCategory: vehicleCategory || undefined,
                ...(sessionToken ? { sessionToken } : {}),
              }),
            });
          } catch {
            console.warn("Failed to save policy to portal");
          }
        } else {
          console.log("[PaymentCallback] Skipping portal save because policyId is unavailable");
        }

        // Send policy documents to customer email
        if (customerEmail) {
          try {
            const emailResp = await fetch("/api/email/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: customerEmail,
                productType: productType || "UNKNOWN",
                offerId: Number(offerId),
                policyId: info.policyId,
                padPolicyId: info.padPolicyId || null,
                orderHash,
                policyNumber,
                vendorName: info.vendorName,
                startDate: info.startDate,
                endDate: info.endDate,
                additionalDocuments: emailAddonDocuments.map((addon) => ({
                  offerId: addon.offerId,
                  policyId: addon.policyId,
                  label: addon.label,
                })),
              }),
            });
            const emailResult = await emailResp.json().catch(() => ({}));
            if (!emailResp.ok) {
              console.error("[PaymentCallback] Email failed:", emailResult);
              emailSentTo.current = "";
            }
          } catch (emailErr) {
            console.error("[PaymentCallback] Email error:", emailErr);
            emailSentTo.current = "";
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Eroare la crearea poliței.";
      setError(message);
    } finally {
      policyCreateInFlight.current = false;
      setCreating(false);
    }
  };

  // Auto-emit policy when payment is approved and session is loaded
  useEffect(() => {
    if (sessionLoading) return;
    if (isSuccess && hasRequiredParams && !autoEmitAttempted.current) {
      autoEmitAttempted.current = true;
      createPolicy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hasRequiredParams, sessionLoading]);

  // Extract display data (works for both RCA and Travel response formats)
  const policyInfo = policyResponse
    ? extractPolicyInfo(policyResponse, Number(offerId))
    : null;
  const policyId = policyInfo?.policyId ?? null;
  const padPolicyId = policyInfo?.padPolicyId ?? null;

  const reportDocumentDownloadError = (errorKey: string | undefined, message: string) => {
    const mainPolicySucceeded =
      policyCreated && typeof policyId === "number" && policyId > 0;
    if (errorKey && (mainPolicySucceeded || isDocumentFetchError(message))) {
      setDocumentErrors((prev) => ({ ...prev, [errorKey]: message }));
      return;
    }
    setError(message);
  };

  const downloadDocument = async (
    type: "offer" | "policy",
    id: number,
    options?: { errorKey?: string; retry?: boolean; maxAttempts?: number }
  ) => {
    const { errorKey, retry = false, maxAttempts = retry ? 3 : 1 } = options ?? {};

    if (!orderHash || !Number.isFinite(id) || id <= 0) {
      reportDocumentDownloadError(
        errorKey,
        "Parametrii pentru descărcarea documentului sunt invalizi."
      );
      return;
    }

    if (errorKey) {
      setDocumentErrors((prev) => {
        if (!prev[errorKey]) return prev;
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }

    let lastError: unknown;
    const offerIdNum = isValidPositiveInt(offerId) ? Number(offerId) : undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const docResp =
          type === "offer"
            ? await fetchOfferDocument(id, orderHash, sessionToken)
            : await fetchPolicyDocument(id, orderHash, {
                offerId: offerIdNum,
                sessionToken: sessionToken ?? undefined,
              });
        openDocumentInNewTab(docResp);
        return;
      } catch (err) {
        lastError = err;
        const message = getErrorMessage(err);
        const shouldRetry =
          retry &&
          attempt < maxAttempts &&
          isRetryableDocumentFetchError(message);
        if (shouldRetry) {
          await sleep(2000 * attempt);
          continue;
        }
        break;
      }
    }

    console.error("[Download] Error:", lastError);
    reportDocumentDownloadError(
      errorKey,
      getErrorMessage(lastError) || "Eroare la descărcarea documentului."
    );
  };

  const downloadAddonDocument = async (addon: ResolvedAddonDocument) => {
    const errorKey = `addon-${addon.offerId}`;
    const usePolicyDoc =
      typeof addon.policyId === "number" && addon.policyId > 0;
    await downloadDocument(
      usePolicyDoc ? "policy" : "offer",
      usePolicyDoc ? addon.policyId! : addon.offerId,
      { errorKey, retry: true, maxAttempts: 4 }
    );
  };

  const policyNumber =
    policyInfo?.series && policyInfo?.number
      ? `${policyInfo.series} ${policyInfo.number}`
      : policyInfo?.number || null;
  const vendorName = policyInfo?.vendorName || null;
  const callbackError = getCallbackErrorPresentation(error, isSuccess);

  // Show loading while session is being fetched
  if (sessionLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#2563EB]" />
          <p className="text-sm text-gray-500">Se incarca sesiunea de plata...</p>
        </div>
      </div>
    );
  }

  // Show error if session could not be loaded
  if (sessionError) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-28 pb-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25">
          <AlertTriangle className="h-10 w-10 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Sesiune invalida</h1>
        <p className="mt-2 text-gray-500">{sessionError}</p>
        <Link href="/" className={`${btn.primary} mt-6 inline-flex items-center gap-2`}>
          Inapoi la pagina principala
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-xl px-4 pt-28 pb-[max(4rem,env(safe-area-inset-bottom))]">
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
              ? insurerAutoCreated.current
                ? "Polita dumneavoastra a fost emisa automat de asigurator."
                : "Polita dumneavoastra a fost emisa si este gata de descarcare."
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
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {/* Policy details grid */}
            <div className="space-y-3">
              {!policyNumber && !policyId && (
                <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  <p className="text-sm text-green-700">
                    {insurerAutoCreated.current
                      ? "Polita a fost emisa automat de asigurator. API-ul nu ne-a returnat un PDF descarcabil pentru acest caz, iar documentele vor fi trimise direct de asigurator."
                      : "Polita a fost emisa de asigurator. Documentele vor fi trimise pe email."}
                  </p>
                </div>
              )}
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
            {emailSentTo.current && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                <p className="text-xs text-[#2563EB]">
                  {insurerAutoCreated.current
                    ? <>Am trimis o notificare pe adresa {emailSentTo.current}. Documentele vor fi trimise direct de asigurator.</>
                    : <>Documentele au fost trimise pe adresa {emailSentTo.current}.</>}
                </p>
              </div>
            )}

            {/* Download buttons — hidden when insurer auto-created the policy (e.g. Euroins blocks docs) */}
            {!insurerAutoCreated.current && (
              <div className="flex flex-col gap-3 pt-2">
                {policyId && (
                  <div className="flex w-full flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocument("policy", policyId, {
                          errorKey: "policy",
                          retry: true,
                          maxAttempts: 4,
                        })
                      }
                      className={`${btn.primary} flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3`}
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden />
                      Descarca polita (PDF)
                    </button>
                    {documentErrors.policy && (
                      <p className="text-xs text-red-600">{documentErrors.policy}</p>
                    )}
                  </div>
                )}
                {padPolicyId && (
                  <div className="flex w-full flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocument("policy", padPolicyId, { errorKey: "pad-policy" })
                      }
                      className={`${btn.primary} flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3`}
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden />
                      Descarca polita PAD (PDF)
                    </button>
                    {documentErrors["pad-policy"] && (
                      <p className="text-xs text-red-600">{documentErrors["pad-policy"]}</p>
                    )}
                  </div>
                )}
                {offerId && (
                  <div className="flex w-full flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocument("offer", Number(offerId), { errorKey: "offer" })
                      }
                      className={`${btn.secondary} flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3`}
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden />
                      Descarca oferta (PDF)
                    </button>
                    {documentErrors.offer && (
                      <p className="text-xs text-red-600">{documentErrors.offer}</p>
                    )}
                  </div>
                )}
                {addonDocuments.map((addon) => {
                  const addonErrorKey = `addon-${addon.offerId}`;
                  const addonError = documentErrors[addonErrorKey];
                  return (
                    <div key={addon.offerId} className="flex w-full flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => void downloadAddonDocument(addon)}
                        className={`${btn.secondary} flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3 text-center`}
                      >
                        <Download className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0">
                          {addonError ? "Reincearca" : "Descarca"} {addon.label} (PDF)
                        </span>
                      </button>
                      {addonError && (
                        <p className="text-xs text-amber-700">{addonError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Expired offer (midnight edge case) ── */}
      {error === "__OFFER_EXPIRED__" && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-800">
                Oferta a expirat deoarece plata a fost finalizata intr-o zi diferita fata de cea in care a fost creata oferta.
              </p>
              <p className="text-xs text-amber-600">
                Plata a fost procesata cu succes si va fi rambursata automat. Va rugam sa reincepeti procesul de asigurare.
              </p>
              <Link
                href={`/${(productType || "").toLowerCase()}`}
                className={`${btn.primary} !bg-amber-600 hover:!bg-amber-700 !px-6 !py-2.5 text-sm inline-flex items-center gap-2`}
              >
                <ArrowRight className="h-4 w-4" />
                Creeaza o oferta noua
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {callbackError && (
        <div
          className={`mt-8 rounded-2xl border p-6 ${
            callbackError.kind === "insurer"
              ? "border-amber-200 bg-amber-50"
              : "border-red-100 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                callbackError.kind === "insurer" ? "text-amber-500" : "text-red-500"
              }`}
            />
            <div className="space-y-2">
              <p
                className={`text-sm font-medium ${
                  callbackError.kind === "insurer" ? "text-amber-800" : "text-red-800"
                }`}
              >
                {callbackError.title}
              </p>
              <p
                className={`text-sm ${
                  callbackError.kind === "insurer" ? "text-amber-700" : "text-red-700"
                }`}
              >
                {callbackError.detail}
              </p>
              {traceId && isSuccess && (
                <p
                  className={`text-xs ${
                    callbackError.kind === "insurer" ? "text-amber-600" : "text-red-500"
                  }`}
                >
                  Trace ID: {traceId}
                </p>
              )}
              {isSuccess && !policyCreated && !creating && (
                <button
                  onClick={() => {
                    setError(null);
                    void createPolicy();
                  }}
                  className={`${btn.primary} ${
                    callbackError.kind === "insurer"
                      ? "!bg-amber-600 hover:!bg-amber-700"
                      : "!bg-red-600 hover:!bg-red-700"
                  } !px-6 !py-2 text-xs`}
                >
                  Incearca din nou
                </button>
              )}
              <p
                className={`text-xs ${
                  callbackError.kind === "insurer" ? "text-amber-500" : "text-red-400"
                }`}
              >
                {callbackError.hint}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation CTAs ── */}
      <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:items-center">
        {!isSuccess && (
          <Link href="/" className={`${btn.primary} flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto`}>
            Incearca din nou
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
        <Link
          href="/dashboard"
          className={`flex min-h-11 w-full items-center justify-center gap-2 sm:w-auto ${
            isSuccess && policyCreated ? btn.primary : btn.tertiary
          }`}
        >
          {isSuccess && policyCreated && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />}
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






