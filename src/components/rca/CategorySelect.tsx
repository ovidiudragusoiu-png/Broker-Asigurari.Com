"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { filterRcaCategories } from "@/lib/utils/rcaHelpers";
import type { SelectOption } from "@/types/rcaFlow";
import { btn } from "@/lib/ui/tokens";

interface CategorySelectProps {
  onSelect: (categoryId: number, subcategoryId: number | null) => void;
}

/* ---------- Per-ID config: label, icon, display order ---------- */
interface CategoryConfig {
  label: string;
  Icon: React.FC<{ className?: string }>;
  order: number;
}


/* ---------- SVG vehicle illustrations ---------- */

function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <path d="M15 52 C15 48 18 35 25 32 L40 18 C44 14 52 12 60 12 C68 12 76 14 80 18 L95 32 C102 35 105 48 105 52 L105 58 C105 60 103 62 101 62 L19 62 C17 62 15 60 15 58Z" fill="#E53935" stroke="#C62828" strokeWidth="1.5"/>
      {/* Roof / windows */}
      <path d="M38 32 L44 18 C47 15 53 13 60 13 C67 13 73 15 76 18 L82 32Z" fill="#90CAF9" stroke="#64B5F6" strokeWidth="1"/>
      {/* Window divider */}
      <line x1="60" y1="13" x2="60" y2="32" stroke="#64B5F6" strokeWidth="1"/>
      {/* Bumper */}
      <rect x="12" y="55" width="96" height="6" rx="2" fill="#B71C1C" opacity="0.6"/>
      {/* Headlights */}
      <ellipse cx="20" cy="46" rx="4" ry="3" fill="#FDD835"/>
      <ellipse cx="100" cy="46" rx="4" ry="3" fill="#FDD835"/>
      {/* Wheels */}
      <circle cx="35" cy="62" r="10" fill="#37474F"/>
      <circle cx="35" cy="62" r="5" fill="#78909C"/>
      <circle cx="85" cy="62" r="10" fill="#37474F"/>
      <circle cx="85" cy="62" r="5" fill="#78909C"/>
    </svg>
  );
}

function VanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cargo body */}
      <rect x="30" y="14" width="78" height="48" rx="4" fill="#9E9E9E" stroke="#757575" strokeWidth="1.5"/>
      {/* Cabin */}
      <path d="M10 38 C10 30 14 26 20 24 L30 22 L30 62 L10 62 C10 62 10 58 10 52Z" fill="#BDBDBD" stroke="#757575" strokeWidth="1.5"/>
      {/* Windshield */}
      <path d="M12 40 L22 28 L30 26 L30 44 Z" fill="#90CAF9" stroke="#64B5F6" strokeWidth="1"/>
      {/* Cargo door line */}
      <line x1="70" y1="18" x2="70" y2="58" stroke="#757575" strokeWidth="1"/>
      {/* Door handle */}
      <rect x="66" y="36" width="8" height="2" rx="1" fill="#616161"/>
      {/* Bumper */}
      <rect x="8" y="56" width="102" height="6" rx="2" fill="#757575" opacity="0.5"/>
      {/* Wheels */}
      <circle cx="28" cy="62" r="10" fill="#37474F"/>
      <circle cx="28" cy="62" r="5" fill="#78909C"/>
      <circle cx="92" cy="62" r="10" fill="#37474F"/>
      <circle cx="92" cy="62" r="5" fill="#78909C"/>
    </svg>
  );
}

function MotoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Frame */}
      <path d="M45 55 L55 28 L75 22 L85 30 L80 55" stroke="#37474F" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Tank */}
      <ellipse cx="62" cy="30" rx="12" ry="6" fill="#37474F" stroke="#263238" strokeWidth="1"/>
      {/* Seat */}
      <path d="M65 28 C70 24 82 24 85 30 L78 32 L65 30Z" fill="#212121"/>
      {/* Handlebar */}
      <path d="M52 22 L48 16 M52 22 L56 16" stroke="#455A64" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Front fork */}
      <line x1="50" y1="28" x2="40" y2="58" stroke="#546E7A" strokeWidth="2.5"/>
      {/* Exhaust */}
      <path d="M80 48 L95 52 L98 50" stroke="#9E9E9E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Fender */}
      <path d="M35 50 C35 50 40 45 45 50" stroke="#455A64" strokeWidth="1.5"/>
      {/* Wheels */}
      <circle cx="38" cy="58" r="12" fill="#37474F"/>
      <circle cx="38" cy="58" r="6" fill="#78909C"/>
      <circle cx="85" cy="58" r="12" fill="#37474F"/>
      <circle cx="85" cy="58" r="6" fill="#78909C"/>
    </svg>
  );
}

function TrailerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trailer body */}
      <path d="M25 24 L100 24 C102 24 104 26 104 28 L104 56 C104 58 102 60 100 60 L25 60 C23 60 21 58 21 56 L21 28 C21 26 23 24 25 24Z" fill="#E0E0E0" stroke="#9E9E9E" strokeWidth="1.5"/>
      {/* Top cover / tarp */}
      <path d="M25 24 L30 14 C32 11 38 10 62 10 C86 10 92 11 94 14 L100 24" fill="#F5F5F5" stroke="#9E9E9E" strokeWidth="1.5"/>
      {/* Tarp ribs */}
      <line x1="45" y1="11" x2="42" y2="24" stroke="#BDBDBD" strokeWidth="1"/>
      <line x1="62" y1="10" x2="62" y2="24" stroke="#BDBDBD" strokeWidth="1"/>
      <line x1="79" y1="11" x2="82" y2="24" stroke="#BDBDBD" strokeWidth="1"/>
      {/* Hitch */}
      <line x1="21" y1="46" x2="8" y2="46" stroke="#757575" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="6" cy="46" r="3" fill="#616161"/>
      {/* Bumper */}
      <rect x="20" y="56" width="86" height="4" rx="1.5" fill="#9E9E9E" opacity="0.5"/>
      {/* Wheels */}
      <circle cx="50" cy="60" r="10" fill="#37474F"/>
      <circle cx="50" cy="60" r="5" fill="#78909C"/>
      <circle cx="80" cy="60" r="10" fill="#37474F"/>
      <circle cx="80" cy="60" r="5" fill="#78909C"/>
    </svg>
  );
}

// Keyed by API category ID
const CATEGORY_CONFIG: Record<number, CategoryConfig> = {
  1: { label: "Autoturism", Icon: CarIcon, order: 0 },
  6: { label: "Autoutilitară < 3,5 t", Icon: VanIcon, order: 1 },
  4: { label: "Motocicletă", Icon: MotoIcon, order: 2 },
  5: { label: "Remorcă", Icon: TrailerIcon, order: 3 },
};

const DEFAULT_CONFIG: CategoryConfig = { label: "VEHICUL", Icon: CarIcon, order: 99 };

function getConfig(id: number): CategoryConfig {
  return CATEGORY_CONFIG[id] ?? DEFAULT_CONFIG;
}

/* ---------- Component ---------- */

export default function CategorySelect({ onSelect }: CategorySelectProps) {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<SelectOption[]>("/online/vehicles/categories")
      .then((all) => {
        const filtered = filterRcaCategories(all);
        filtered.sort((a, b) => getConfig(a.id).order - getConfig(b.id).order);
        setCategories(filtered);
        // Auto-select first category (Autoturism) if present
        if (filtered.length > 0) setSelectedId(filtered[0].id);
      })
      .catch(() => setError("Categoriile de vehicule nu au putut fi încărcate."))
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = async () => {
    const cat = categories.find((c) => c.id === selectedId);
    if (!cat) return;
    setSubmitting(true);
    try {
      const subs = await api.get<SelectOption[]>(
        `/online/vehicles/categories/${cat.id}/subcategories`
      );
      // Don't pre-select a subcategory — VIN lookup or user will pick the correct one
      onSelect(cat.id, null);
    } catch {
      onSelect(cat.id, null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="ml-2 text-sm">Se încarcă categoriile...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Selectează categoria vehiculului
        </h2>
      </div>

      {/* Category cards */}
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((cat) => {
          const isSelected = selectedId === cat.id;
          const cfg = getConfig(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedId(cat.id)}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-white shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <cfg.Icon className="h-20 w-20" />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
                {cfg.label}
              </span>
              {/* Radio indicator */}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-emerald-500" : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-sm font-semibold text-gray-600">
        Nu se emit polițe în vederea înmatriculării.
      </p>

      {/* Continue button */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedId || submitting}
          className={btn.primary}
        >
          {submitting ? "Se încarcă..." : "Înainte"}
        </button>
      </div>
    </div>
  );
}
