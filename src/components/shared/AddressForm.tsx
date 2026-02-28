"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AddressRequest } from "@/types/insuretech";
import { api } from "@/lib/api/client";
import { ROMANIA_COUNTRY_ID } from "@/lib/utils/formatters";

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

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

interface StreetResult {
  id: number;
  postalCode: string;
  streetTypeId: number;
  streetTypeName: string;
  streetName: string;
  streetNumberRange: string | null;
}

/* Bucharest sectors: each sector is a separate county+city in the API */
const BUCHAREST_SECTORS = [
  { label: "Sector 1", countyId: 14, cityId: 1598 },
  { label: "Sector 2", countyId: 5,  cityId: 1599 },
  { label: "Sector 3", countyId: 9,  cityId: 1600 },
  { label: "Sector 4", countyId: 22, cityId: 1601 },
  { label: "Sector 5", countyId: 39, cityId: 1602 },
  { label: "Sector 6", countyId: 8,  cityId: 1603 },
];
const BUCHAREST_COUNTY_IDS = new Set(BUCHAREST_SECTORS.map((s) => s.countyId));
const BUCHAREST_SENTINEL = -999; // virtual countyId for the single "Bucuresti" option

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

  /* Street autocomplete */
  const [streetQuery, setStreetQuery] = useState(value.streetName || "");
  const [streetResults, setStreetResults] = useState<StreetResult[]>([]);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const streetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetDropdownRef = useRef<HTMLDivElement>(null);

  const isRomania = value.countryId === ROMANIA_COUNTRY_ID;
  const isBucharest = BUCHAREST_COUNTY_IDS.has(value.countyId ?? 0);

  // Deduplicate: replace all 6 "Bucuresti" counties with one virtual entry
  const deduplicatedCounties = (() => {
    const filtered = counties.filter((c) => !BUCHAREST_COUNTY_IDS.has(c.id));
    // Insert one "Bucuresti" entry, sorted alphabetically
    const bucharestEntry: SelectOption = { id: BUCHAREST_SENTINEL, name: "Bucuresti" };
    filtered.push(bucharestEntry);
    filtered.sort((a, b) => a.name.localeCompare(b.name, "ro"));
    return filtered;
  })();

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

  /* Sync streetQuery when value.streetName changes externally (e.g. copy address) */
  useEffect(() => {
    setStreetQuery(value.streetName || "");
  }, [value.streetName]);

  /* Street autocomplete search — 3+ chars, city selected, 300ms debounce */
  const searchStreet = useCallback(
    (query: string) => {
      if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current);
      if (!value.cityId || query.length < 3) {
        setStreetResults([]);
        setShowStreetDropdown(false);
        return;
      }
      streetDebounceRef.current = setTimeout(async () => {
        try {
          const results = await api.get<StreetResult[]>(
            `/online/address/utils/postalCodes/find?cityId=${value.cityId}&streetName=${encodeURIComponent(query)}`
          );
          setStreetResults(results.slice(0, 20));
          setShowStreetDropdown(results.length > 0);
        } catch {
          setStreetResults([]);
          setShowStreetDropdown(false);
        }
      }, 300);
    },
    [value.cityId]
  );

  /* Close dropdown on click outside */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (streetDropdownRef.current && !streetDropdownRef.current.contains(e.target as Node)) {
        setShowStreetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleStreetInputChange = (query: string) => {
    setStreetQuery(query);
    update({ streetName: query, postalCode: "" });
    searchStreet(query);
  };

  const handleStreetSelect = (result: StreetResult) => {
    const fullName = result.streetTypeName
      ? `${result.streetTypeName} ${result.streetName}`
      : result.streetName;
    setStreetQuery(fullName);
    update({
      streetName: fullName,
      streetTypeId: result.streetTypeId,
      postalCode: result.postalCode,
    });
    setShowStreetDropdown(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        Se incarca datele adresei...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">{loadError}</p>
      )}

      {/* Country */}
      <div>
        <label className={labelCls}>Tara</label>
        <select
          className={selectCls}
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
        <div className="grid grid-cols-2 gap-3">
          {/* County */}
          <div>
            <label className={labelCls}>Judet</label>
            <select
              className={selectCls}
              value={isBucharest ? BUCHAREST_SENTINEL : (value.countyId ?? "")}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (val === BUCHAREST_SENTINEL) {
                  // Bucuresti selected — clear county/city, user picks sector next
                  update({ countyId: BUCHAREST_SENTINEL as unknown as number, cityId: null });
                } else {
                  update({ countyId: val, cityId: null });
                }
              }}
            >
              <option value="">Selecteaza judetul</option>
              {deduplicatedCounties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* City / Sector */}
          <div>
            <label className={labelCls}>
              {isBucharest || value.countyId === BUCHAREST_SENTINEL ? "Sector" : "Localitate"}
            </label>
            {isBucharest || value.countyId === BUCHAREST_SENTINEL ? (
              <select
                className={selectCls}
                value={isBucharest ? value.countyId ?? "" : ""}
                onChange={(e) => {
                  const sector = BUCHAREST_SECTORS.find((s) => s.countyId === Number(e.target.value));
                  if (sector) {
                    update({ countyId: sector.countyId, cityId: sector.cityId, postalCode: "", streetName: "", streetTypeId: null });
                    setStreetQuery("");
                  }
                }}
              >
                <option value="">Selecteaza sectorul</option>
                {BUCHAREST_SECTORS.map((s) => (
                  <option key={s.countyId} value={s.countyId}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={selectCls}
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
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Foreign county/city */}
          <div>
            <label className={labelCls}>Regiune / Stat</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ex: Bavaria"
              value={value.foreignCountyName ?? ""}
              onChange={(e) =>
                update({ foreignCountyName: e.target.value || null })
              }
            />
          </div>
          <div>
            <label className={labelCls}>Oras</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ex: München"
              value={value.foreignCityName ?? ""}
              onChange={(e) =>
                update({ foreignCityName: e.target.value || null })
              }
            />
          </div>
        </div>
      )}

      {/* Street type + name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tip strada</label>
          <select
            className={selectCls}
            value={value.streetTypeId ?? ""}
            onChange={(e) =>
              update({
                streetTypeId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {(() => {
              const aleeVariants = streetTypes.filter((st) => /^Alee\s+[IVXLCDM]+$/i.test(st.type.trim()));
              const others = streetTypes.filter((st) => !/^Alee\s+[IVXLCDM]+$/i.test(st.type.trim()));
              return (
                <>
                  {others.map((st) => (
                    <option key={st.id} value={st.id}>{st.type}</option>
                  ))}
                  {aleeVariants.length > 0 && (
                    <optgroup label="Alee (variante numerotate)">
                      {aleeVariants.map((st) => (
                        <option key={st.id} value={st.id}>{st.type}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              );
            })()}
          </select>
        </div>
        <div className="relative" ref={streetDropdownRef}>
          <label className={labelCls}>Nume strada</label>
          <input
            type="text"
            className={inputCls}
            placeholder={value.cityId ? "Min. 3 litere..." : "Selecteaza localitate"}
            value={streetQuery}
            disabled={isRomania && !value.cityId}
            onChange={(e) => handleStreetInputChange(e.target.value)}
            onFocus={() => streetResults.length > 0 && setShowStreetDropdown(true)}
          />
          {showStreetDropdown && streetResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {streetResults.map((r) => (
                <button
                  key={`${r.id}-${r.postalCode}`}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[#2563EB]/5 transition-colors"
                  onClick={() => handleStreetSelect(r)}
                >
                  <span className="font-medium text-gray-700">
                    {r.streetTypeName} {r.streetName}
                    {r.streetNumberRange && (
                      <span className="ml-1 text-gray-400">{r.streetNumberRange}</span>
                    )}
                  </span>
                  <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    CP: {r.postalCode}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Street number, building, entrance, apartment */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Numar</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Nr."
            value={value.streetNumber}
            onChange={(e) => update({ streetNumber: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Bloc</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Bloc"
            value={value.building}
            onChange={(e) => update({ building: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Scara</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Sc."
            value={value.entrance}
            onChange={(e) => update({ entrance: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Apartament</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Ap."
            value={value.apartment}
            onChange={(e) => update({ apartment: e.target.value })}
          />
        </div>
      </div>

      {/* Floor & Postal code */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Etaj</label>
          <select
            className={selectCls}
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
          <label className={labelCls}>Cod postal</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Ex: 010101"
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
