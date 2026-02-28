"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface CityOption {
  id: number;
  name: string;
  uniquePostalCode?: string | null;
}

interface LocalitySelectProps {
  countyId: number;
  countyName: string;
  onSelect: (cityId: number, postalCode: string) => void;
}

export default function LocalitySelect({ countyId, countyName, onSelect }: LocalitySelectProps) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<CityOption[]>(`/online/address/utils/cities?countyId=${countyId}`)
      .then((data) => {
        setCities(data);
        setLoading(false);
      })
      .catch(() => {
        setCities([]);
        setLoading(false);
      });
  }, [countyId]);

  const handleSelect = (cityId: number) => {
    setSelectedCityId(cityId);
    const city = cities.find((c) => c.id === cityId);
    onSelect(cityId, city?.uniquePostalCode || "");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Selectează localitatea</h2>
        <p className="mt-1 text-sm text-gray-500">
          Județul {countyName} — selectează localitatea proprietarului vehiculului
        </p>
      </div>

      <div className="mx-auto max-w-md">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            <span className="text-sm">Se încarcă localitățile...</span>
          </div>
        ) : (
          <select
            className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none"
            value={selectedCityId ?? ""}
            onChange={(e) => e.target.value && handleSelect(Number(e.target.value))}
          >
            <option value="">Selectează localitatea</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
