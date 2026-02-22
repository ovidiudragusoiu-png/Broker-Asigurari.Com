"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { filterRcaCategories } from "@/lib/utils/rcaHelpers";
import type { SelectOption } from "@/types/rcaFlow";

interface CategorySelectProps {
  onSelect: (categoryId: number, subcategoryId: number | null) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  autoturism: "\uD83D\uDE97",
  autoutilitar: "\uD83D\uDE9A",
  moto: "\uD83C\uDFCD\uFE0F",
  remorca: "\uD83D\uDE9B",
};

function getCategoryIcon(name: string): string {
  const normalized = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (normalized.includes(key)) return icon;
  }
  return "\uD83D\uDE97";
}

export default function CategorySelect({ onSelect }: CategorySelectProps) {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SelectOption[]>("/online/vehicles/categories")
      .then((all) => setCategories(filterRcaCategories(all)))
      .catch(() => setError("Nu am putut incarca categoriile de vehicule"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (cat: SelectOption) => {
    try {
      const subs = await api.get<SelectOption[]>(
        `/online/vehicles/categories/${cat.id}/subcategories`
      );
      // Auto-select first subcategory
      onSelect(cat.id, subs.length > 0 ? subs[0].id : null);
    } catch {
      onSelect(cat.id, null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="ml-2 text-sm">Se incarca categoriile...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Selecteaza tipul vehiculului
        </h2>
      </div>

      <div className="mx-auto grid max-w-lg grid-cols-2 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelect(cat)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 p-6 transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
          >
            <span className="text-3xl">{getCategoryIcon(cat.name)}</span>
            <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
