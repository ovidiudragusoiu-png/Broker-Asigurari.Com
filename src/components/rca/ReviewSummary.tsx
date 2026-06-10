"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Download, Phone, Mail, Clock } from "lucide-react";
import type {
  RcaFlowState,
  RcaOffer,
  RcaOfferLegalDisclosure,
} from "@/types/rcaFlow";
import { getLocalVendorLogo, periodText, getGreenCardExclusions } from "@/lib/utils/rcaHelpers";
import { formatAddonRoPrice } from "@/lib/utils/rcaAddons";
import {
  fetchOfferDocument,
  openDocumentInNewTab,
} from "@/lib/api/documentsClient";
import AddonOfferDownloadLink from "@/components/rca/AddonOfferDownloadLink";
import OfferLegalInfo from "@/components/rca/OfferLegalInfo";
import TermsModal from "./TermsModal";
import PaymentDeclarationBanner from "@/components/shared/PaymentDeclarationBanner";
import { btn } from "@/lib/ui/tokens";

/** Mask a CNP/CUI: show first 2 and last 3 chars, rest as stars */
function maskId(value: string): string {
  if (value.length <= 5) return value;
  return value.slice(0, 2) + "*".repeat(value.length - 5) + value.slice(-3);
}

interface ReviewSummaryProps {
  state: RcaFlowState;
  onConsentAndPay: () => Promise<void>;
  orderId: number | null;
  orderHash: string | null;
  disclosureCache: Map<number, RcaOfferLegalDisclosure>;
  onDisclosureCacheUpdate: (
    updater: (
      prev: Map<number, RcaOfferLegalDisclosure>
    ) => Map<number, RcaOfferLegalDisclosure>
  ) => void;
  orderReferenceTariff: number | null | undefined;
  onOrderReferenceTariff: (value: number | null | undefined) => void;
}

export default function ReviewSummary({
  state,
  onConsentAndPay,
  orderId,
  orderHash,
  disclosureCache,
  onDisclosureCacheUpdate,
  orderReferenceTariff,
  onOrderReferenceTariff,
}: ReviewSummaryProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingOffer, setDownloadingOffer] = useState(false);
  const [downloadUnavailable, setDownloadUnavailable] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const offer = state.selectedOffer;
  const vendorLogo = offer?.offer.vendorLogoUrl || getLocalVendorLogo(offer?.offer.vendorName ?? "");

  const selectedVendorOffer: RcaOffer | null = useMemo(() => {
    if (!offer) return null;
    return {
      ...offer.offer,
      periodMonths: Number(offer.period),
      withDirectSettlement: offer.withDirectSettlement,
    };
  }, [offer]);

  const canDownloadOffer =
    !!offer?.offer.id &&
    offer.offer.id > 0 &&
    !!orderHash &&
    !downloadUnavailable;

  const handleDownloadOffer = async () => {
    if (!offer?.offer.id || !orderHash) return;
    setDownloadingOffer(true);
    setDownloadError(null);
    try {
      const data = await fetchOfferDocument(offer.offer.id, orderHash);
      openDocumentInNewTab(data);
    } catch {
      setDownloadUnavailable(true);
      setDownloadError("Documentul ofertei nu poate fi descărcat momentan.");
    } finally {
      setDownloadingOffer(false);
    }
  };

  const handlePayClick = () => {
    setShowTerms(true);
  };

  const handleTermsAgree = async () => {
    setShowTerms(false);
    setProcessing(true);
    setError(null);
    try {
      await onConsentAndPay();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la procesarea plății");
      setProcessing(false);
    }
  };

  if (!offer || !selectedVendorOffer) {
    return <p className="text-center text-gray-500">Selectați mai întâi o ofertă.</p>;
  }

  const exclusions = getGreenCardExclusions(offer.offer.vendorName);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 00-.879-2.121L16.5 8.259a2.999 2.999 0 00-2.121-.879H5.25a2.25 2.25 0 00-2.25 2.25v8.745c0 .621.504 1.125 1.125 1.125H5.25" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Verificați datele poliței</h2>
        <p className="mt-1 text-sm text-gray-500">
          Asigurați-vă că toate informațiile sunt corecte înainte de plată.
        </p>
      </div>

      {/* Summary card */}
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Vendor header */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          {vendorLogo ? (
            <Image
              src={vendorLogo}
              alt={offer.offer.vendorName}
              width={100}
              height={30}
              className="h-7 w-auto object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-600">
              {(offer.offer.vendorName || "?").charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Poliță RCA {offer.offer.vendorName}
            </p>
            <p className="text-xs text-gray-500">
              {periodText(Number(offer.period))} / din {state.startDate}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">Proprietar</p>
              <p className="text-sm font-semibold text-gray-900">
                {state.ownerType === "PF"
                  ? `${state.ownerLastName.toUpperCase()} ${state.ownerFirstName.toUpperCase()}`
                  : state.companyName.toUpperCase()}
              </p>
              <p className="text-xs text-gray-500">
                {state.ownerType === "PF" ? "CNP" : "CUI"}: {maskId(state.cnpOrCui)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 00-.879-2.121L16.5 8.259a2.999 2.999 0 00-2.121-.879H5.25a2.25 2.25 0 00-2.25 2.25v8.745c0 .621.504 1.125 1.125 1.125H5.25" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400">Vehicul</p>
              <p className="text-sm font-semibold text-gray-900">
                {state.vehicle.model || "Vehicul"} — {state.vehicle.licensePlate}
              </p>
              <p className="text-xs text-gray-500">Șasiu: {state.vehicle.vin}</p>
            </div>
          </div>

          {state.address.streetName && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Adresă</p>
                <p className="text-sm text-gray-700">
                  {state.address.streetName}
                  {state.address.streetNumber ? `, Nr. ${state.address.streetNumber}` : ""}
                </p>
              </div>
            </div>
          )}

          {exclusions.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <div className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                  Excluderi Carte Verde
                  <OfferLegalInfo
                    vendorName={offer.offer.vendorName}
                    vendorOffers={[selectedVendorOffer]}
                    orderId={orderId}
                    orderHash={orderHash}
                    disclosureCache={disclosureCache}
                    onCacheUpdate={onDisclosureCacheUpdate}
                    orderReferenceTariff={orderReferenceTariff}
                    onOrderReferenceTariff={onOrderReferenceTariff}
                    inline
                  />
                </div>
                <p className="text-xs text-gray-500">{exclusions.join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50/50 to-white px-5 py-4 text-center">
          {offer.addons && offer.addons.length > 0 && (
            <div className="mb-3 space-y-1 text-left text-xs text-gray-600">
              <div className="flex justify-between gap-2">
                <span>RCA ({periodText(Number(offer.period))})</span>
                <span className="font-medium">
                  {formatAddonRoPrice(offer.premium - offer.addons.reduce((s, a) => s + a.premium, 0))} lei
                </span>
              </div>
              {offer.addons.map((addon) => (
                <div key={addon.offerId} className="flex justify-between gap-2">
                  <span className="min-w-0">
                    {addon.label}
                    {orderHash && (
                      <AddonOfferDownloadLink
                        offerId={addon.offerId}
                        orderHash={orderHash}
                        className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      />
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-[#2563EB]">
                    + {formatAddonRoPrice(addon.premium)} lei
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-400">
            Total de plată
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatAddonRoPrice(offer.premium)}{" "}
            <span className="text-lg font-semibold text-gray-500">LEI</span>
          </p>
          {canDownloadOffer && (
            <button
              type="button"
              onClick={handleDownloadOffer}
              disabled={downloadingOffer}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {downloadingOffer ? "Se descarcă..." : "Descarcă oferta"}
            </button>
          )}
          {downloadError && (
            <p className="mt-2 text-[11px] text-amber-700">{downloadError}</p>
          )}
        </div>
      </div>

      {/* Declaration */}
      <PaymentDeclarationBanner productType="RCA" className="mx-auto max-w-lg" />

      {error && (
        <div className="mx-auto max-w-lg rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Reassurance: fast issuance + how to reach support */}
      <div className="mx-auto max-w-lg space-y-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden />
          <span>
            Polița este emisă automat după plată — de obicei{" "}
            <strong className="font-semibold text-gray-900">sub 5 minute</strong>.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-xs text-gray-500">
          <a
            href="tel:0720385551"
            className="inline-flex items-center gap-1 font-medium text-[#2563EB] transition-colors hover:text-blue-700"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            0720 38 55 51
          </a>
          <a
            href="mailto:office@sigur.ai"
            className="inline-flex items-center gap-1 font-medium text-[#2563EB] transition-colors hover:text-blue-700"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            office@sigur.ai
          </a>
        </div>
      </div>

      <div className="text-center">
        {processing ? (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            <span className="text-sm">Se redirecționează către plată...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePayClick}
            className={`${btn.primary} px-10 py-4 text-base shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/20`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Datele sunt corecte, plătesc
            </span>
          </button>
        )}
      </div>

      <TermsModal
        isOpen={showTerms}
        onAgree={handleTermsAgree}
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
}
