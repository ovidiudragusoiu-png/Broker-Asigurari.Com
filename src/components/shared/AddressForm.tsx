"use client";

import { useState, useEffect, useCallback } from "react";
import type { AddressRequest } from "@/types/insuretech";
import { api } from "@/lib/api/client";
import { ROMANIA_COUNTRY_ID } from "@/lib/utils/formatters";

interface AddressFormProps {
  value: AddressRequest;
  onChange: (address: AddressRequest) => void;
  addressType?: "HOME" | "MAILING";
}

interface SelectOption {
  id: number;
  name: string;
  code?: string;
  uniquePostalCode?: string | null;
}

interface StreetTypeOption {
  id: number;
  type: string;
}

interface FloorOption {
  id: number;
  floor: string;
}

export default function AddressForm({
  value,
  onChange,
  addressType = "HOME",
}: AddressFormProps) {
  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [counties, setCounties] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [streetTypes, setStreetTypes] = useState<StreetTypeOption[]>([]);
  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isRomania = value.countryId === ROMANIA_COUNTRY_ID;

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.get<SelectOption[]>("/online/address/utils/countries"),
      api.get<SelectOption[]>("/online/address/utils/counties"),
      api.get<StreetTypeOption[]>("/online/address/utils/streetTypes"),
      api.get<FloorOption[]>("/online/address/utils/floors"),
    ])
      .then(([c, co, st, fl]) => {
        setCountries(c);
        setCounties(co);
        setStreetTypes(st);
        setFloors(fl);
      })
      .catch(() => setLoadError("Nu am putut incarca datele pentru adresa"))
      .finally(() => setLoading(false));
  }, []);

  // Load cities when county changes
  useEffect(() => {
    if (value.countyId) {
      api
        .get<SelectOption[]>(
          `/online/address/utils/cities?countyId=${value.countyId}`
        )
        .then(setCities)
        .catch(() => setCities([]));
    }
  }, [value.countyId]);

  const update = useCallback(
    (partial: Partial<AddressRequest>) => {
      onChange({ ...value, ...partial, addressType });
    },
    [value, onChange, addressType]
  );

  // Auto-set postal code from city uniquePostalCode
  useEffect(() => {
    if (value.cityId) {
      const city = cities.find((c) => c.id === value.cityId);
      if (
        city?.uniquePostalCode &&
        value.postalCode !== city.uniquePostalCode
      ) {
        update({ postalCode: city.uniquePostalCode });
      }
    }
  }, [value.cityId, value.postalCode, cities, update]);

  if (loading) {
    return <div className="text-sm text-gray-500">Se incarca datele adresei...</div>;
  }

  return (
    <div className="space-y-4">
      {loadError && <p className="text-xs text-yellow-700">{loadError}</p>}
      {/* Country */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Tara
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={value.countryId ?? ""}
          onChange={(e) => {
            const countryId = e.target.value ? Number(e.target.value) : null;
            update({
              countryId,
              countyId: null,
              cityId: null,
              foreignCountyName: null,
              foreignCityName: null,
            });
          }}
        >
          <option value="">Selecteaza tara</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isRomania ? (
        <>
          {/* County (Romanian) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Judet
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.countyId ?? ""}
              onChange={(e) =>
                update({
                  countyId: e.target.value ? Number(e.target.value) : null,
                  cityId: null,
                })
              }
            >
              <option value="">Selecteaza judetul</option>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* City (Romanian) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Localitate
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.cityId ?? ""}
              onChange={(e) =>
                update({
                  cityId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Selecteaza localitate</option>
              {(value.countyId ? cities : []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          {/* Foreign county/city names */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Regiune / Stat
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.foreignCountyName ?? ""}
              onChange={(e) =>
                update({ foreignCountyName: e.target.value || null })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Oras
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={value.foreignCityName ?? ""}
              onChange={(e) =>
                update({ foreignCityName: e.target.value || null })
              }
            />
          </div>
        </>
      )}

      {/* Street type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tip strada
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.streetTypeId ?? ""}
            onChange={(e) =>
              update({
                streetTypeId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {streetTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nume strada
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.streetName}
            onChange={(e) => update({ streetName: e.target.value })}
          />
        </div>
      </div>

      {/* Street number, building, entrance, apartment */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Numar
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.streetNumber}
            onChange={(e) => update({ streetNumber: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bloc
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.building}
            onChange={(e) => update({ building: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Scara
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.entrance}
            onChange={(e) => update({ entrance: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Apartament
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.apartment}
            onChange={(e) => update({ apartment: e.target.value })}
          />
        </div>
      </div>

      {/* Floor & Postal code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Etaj
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.floorId ?? ""}
            onChange={(e) =>
              update({
                floorId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.floor}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cod postal
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Default empty address.
 */
export function emptyAddress(type: "HOME" | "MAILING" = "HOME"): AddressRequest {
  return {
    countryId: ROMANIA_COUNTRY_ID,
    cityId: null,
    countyId: null,
    postalCode: "",
    streetTypeId: null,
    floorId: null,
    addressType: type,
    foreignCountyName: null,
    foreignCityName: null,
    streetName: "",
    streetNumber: "",
    building: "",
    entrance: "",
    apartment: "",
  };
}
