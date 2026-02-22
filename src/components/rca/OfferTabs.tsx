"use client";

import { useState } from "react";
import Image from "next/image";
import type { RcaOffer, SelectedOfferState, OfferTab } from "@/types/rcaFlow";
import {
  getOfferPrice,
  getLocalVendorLogo,
  pickOfferByVariant,
  getGreenCardExclusions,
} from "@/lib/utils/rcaHelpers";

interface OfferTabsProps {
  offers: RcaOffer[];
  loading: boolean;
  onSelectOffer: (selected: SelectedOfferState) => void;
}

interface TabConfig {
  key: OfferTab;
  label: string;
  sublabel: string;
  columns: { period: string; label: string; withDirectSettlement: boolean }[];
}

const TABS: TabConfig[] = [
  {
    key: "short",
    label: "1 - 3 luni",
    sublabel: "standard",
    columns: [
      { period: "1", label: "1 luna", withDirectSettlement: false },
      { period: "2", label: "2 luni", withDirectSettlement: false },
      { period: "3", label: "3 luni", withDirectSettlement: false },
    ],
  },
  {
    key: "standard",
    label: "6 / 12 luni",
    sublabel: "standard",
    columns: [
      { period: "6", label: "6 luni", withDirectSettlement: false },
      { period: "12", label: "12 luni", withDirectSettlement: false },
    ],
  },
  {
    key: "direct",
    label: "6 / 12 luni",
    sublabel: "decontare directă",
    columns: [
      { period: "6", label: "6 luni + dd", withDirectSettlement: true },
      { period: "12", label: "12 luni + dd", withDirectSettlement: true },
    ],
  },
];

function formatRoPrice(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---- Skeleton loading ----
function SkeletonCard({ columns }: { columns: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col gap-2 md:w-40">
          <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-3 md:justify-end">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OfferTabs({
  offers,
  loading,
  onSelectOffer,
}: OfferTabsProps) {
  const [activeTab, setActiveTab] = useState<OfferTab>("standard");
  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

  // ---- Loading state: skeleton cards ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Alege cel mai bun preț RCA!
          </h2>
        </div>
        {/* Tabs (disabled during loading) */}
        <div className="flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <div
              key={tab.key}
              className="rounded-full bg-gray-100 px-5 py-2.5 text-center"
            >
              <span className="block text-sm font-semibold text-gray-400">
                {tab.label}
              </span>
              <span className="block text-[10px] text-gray-300">
                {tab.sublabel}
              </span>
            </div>
          ))}
        </div>
        {/* Skeleton rows */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} columns={2} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">
            Se generează ofertele... Poate dura câteva momente.
          </p>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (offers.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">
          Nu există oferte disponibile.
        </p>
      </div>
    );
  }

  // ---- Group offers by vendor ----
  const vendors = Array.from(
    new Set(offers.map((o) => o.vendorName || "Asigurător necunoscut"))
  );

  // ---- Cheapest price per column ----
  const cheapestByColumn: Record<string, number> = {};
  for (const col of currentTabConfig.columns) {
    let min = Infinity;
    for (const vendor of vendors) {
      const vendorOffers = offers.filter(
        (o) => (o.vendorName || "Asigurător necunoscut") === vendor
      );
      const match = pickOfferByVariant(
        vendorOffers,
        col.period,
        col.withDirectSettlement
      );
      const price = match
        ? getOfferPrice(match, col.withDirectSettlement)
        : null;
      if (price != null && price > 0 && price < min) {
        min = price;
      }
    }
    if (min < Infinity) {
      cheapestByColumn[`${col.period}-${col.withDirectSettlement}`] = min;
    }
  }

  // ---- Sort vendors by cheapest price in the last column ----
  const vendorsSorted = [...vendors].sort((a, b) => {
    const aOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === a
    );
    const bOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === b
    );
    const col =
      currentTabConfig.columns[currentTabConfig.columns.length - 1];
    const aMatch = pickOfferByVariant(
      aOffers,
      col.period,
      col.withDirectSettlement
    );
    const bMatch = pickOfferByVariant(
      bOffers,
      col.period,
      col.withDirectSettlement
    );
    const aPrice = aMatch
      ? (getOfferPrice(aMatch, col.withDirectSettlement) ?? Infinity)
      : Infinity;
    const bPrice = bMatch
      ? (getOfferPrice(bMatch, col.withDirectSettlement) ?? Infinity)
      : Infinity;
    return aPrice - bPrice;
  });

  // Check if any vendor has offers for this tab
  const hasAnyOffer = vendorsSorted.some((vendor) => {
    const vendorOffers = offers.filter(
      (o) => (o.vendorName || "Asigurător necunoscut") === vendor
    );
    return currentTabConfig.columns.some((col) => {
      const match = pickOfferByVariant(
        vendorOffers,
        col.period,
        col.withDirectSettlement
      );
      const price = match
        ? getOfferPrice(match, col.withDirectSettlement)
        : null;
      return price != null && price > 0;
    });
  });

  const handleSelect = (
    offer: RcaOffer,
    period: string,
    withDirectSettlement: boolean
  ) => {
    if (offer.error) return;
    const premium = getOfferPrice(offer, withDirectSettlement);
    if (premium == null) return;
    onSelectOffer({ offer, period, withDirectSettlement, premium });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Alege cel mai mic pret RCA!
        </h2>
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let classes =
            "relative rounded-full px-6 py-3 text-sm font-semibold transition-all cursor-pointer select-none ";
          if (isActive) {
            classes += "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105";
          } else {
            classes +=
              "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700";
          }
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={classes}
            >
              <span className="block leading-tight">{tab.label}</span>
              <span
                className={`block text-[10px] font-normal ${
                  isActive ? "opacity-80" : "opacity-60"
                }`}
              >
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden items-center md:flex">
        <div className="w-44 shrink-0" />
        <div className="flex flex-1 justify-end gap-3">
          {currentTabConfig.columns.map((col) => (
            <div
              key={`${col.period}-${col.withDirectSettlement}`}
              className="w-36 text-center text-sm font-bold text-emerald-700"
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Offer cards */}
      {!hasAnyOffer ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 py-10 text-center">
          <p className="text-gray-500">
            Nu există oferte disponibile pentru această perioadă.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendorsSorted.map((vendor) => {
            const vendorOffers = offers.filter(
              (o) => (o.vendorName || "Asigurător necunoscut") === vendor
            );
            const logoUrl =
              vendorOffers.find((o) => o.vendorLogoUrl)?.vendorLogoUrl ||
              getLocalVendorLogo(vendor);

            // Check if this vendor has any valid offers in current tab
            const vendorHasOffers = currentTabConfig.columns.some((col) => {
              const match = pickOfferByVariant(
                vendorOffers,
                col.period,
                col.withDirectSettlement
              );
              const price = match
                ? getOfferPrice(match, col.withDirectSettlement)
                : null;
              return price != null && price > 0;
            });
            if (!vendorHasOffers) return null;

            return (
              <div
                key={vendor}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  {/* Logo + info */}
                  <div className="flex shrink-0 items-center gap-3 md:w-44 md:flex-col md:items-start md:gap-1">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={vendor}
                        width={140}
                        height={42}
                        className="h-9 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-base font-bold text-gray-900">
                        {vendor}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-400">
                        clasa BM: B8{" "}
                        <span
                          className="cursor-help"
                          title="Informații Bonus-Malus"
                        >
                          &#9432;
                        </span>
                      </span>
                      {(() => {
                        const exclusions = getGreenCardExclusions(vendor);
                        if (exclusions.length === 0) return null;
                        return (
                          <span
                            className="text-[10px] text-gray-400 cursor-help"
                            title={`Țări excluse Carte Verde: ${exclusions.join(", ")}`}
                          >
                            Excluderi C.V.: {exclusions.join(", ")}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Price buttons */}
                  <div className="flex flex-1 flex-wrap items-center justify-center gap-3 md:justify-end">
                    {currentTabConfig.columns.map((col) => {
                      const colKey = `${col.period}-${col.withDirectSettlement}`;
                      const match = pickOfferByVariant(
                        vendorOffers,
                        col.period,
                        col.withDirectSettlement
                      );
                      const price = match
                        ? getOfferPrice(match, col.withDirectSettlement)
                        : null;

                      if (!match || price == null || price <= 0) {
                        return (
                          <div
                            key={colKey}
                            className="flex w-36 flex-col items-center"
                          >
                            <span className="mb-1 text-[10px] text-gray-400 md:hidden">
                              {col.label}
                            </span>
                            <span className="text-sm text-gray-300">-</span>
                          </div>
                        );
                      }

                      const isCheapest =
                        cheapestByColumn[colKey] === price;

                      return (
                        <div
                          key={colKey}
                          className="flex w-36 flex-col items-center"
                        >
                          {/* Mobile: show period label */}
                          <span className="mb-1 text-[10px] text-gray-400 md:hidden">
                            {col.label}
                          </span>
                          {/* Cheapest badge — fixed height to prevent layout shift */}
                          <span className={`mb-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isCheapest ? "bg-amber-100 text-amber-700" : "invisible"}`}>
                            Cel mai bun preț
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelect(
                                match,
                                col.period,
                                col.withDirectSettlement
                              )
                            }
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                              />
                            </svg>
                            {formatRoPrice(price)} lei
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer message */}
      <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center">
        <p className="text-sm text-emerald-800">
          Plătești cu cardul și{" "}
          <span className="font-semibold">
            primești instant polița RCA pe email
          </span>
          !
        </p>
      </div>
    </div>
  );
}
