"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { validateVIN } from "@/lib/utils/validation";

interface VehicleData {
  vin: string;
  licensePlate: string;
  makeId: number | null;
  model: string;
  year: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  fuelTypeId: number | null;
  activityTypeId: number | null;
  engineCapacity: number | null;
  enginePowerKw: number | null;
  totalWeight: number | null;
  seats: number | null;
  registrationTypeId: number | null;
}

interface VehicleFormProps {
  value: VehicleData;
  onChange: (data: VehicleData) => void;
}

interface SelectOption {
  id: number;
  name: string;
  categoryId?: number;
}

function readString(
  data: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readNumber(
  data: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    if (value && typeof value === "object" && "id" in value) {
      const idValue = (value as { id?: unknown }).id;
      if (typeof idValue === "number" && Number.isFinite(idValue)) {
        return idValue;
      }
    }
  }
  return null;
}

export default function VehicleForm({ value, onChange }: VehicleFormProps) {
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [subcategories, setSubcategories] = useState<SelectOption[]>([]);
  const [makes, setMakes] = useState<SelectOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<SelectOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<SelectOption[]>([]);
  const [registrationTypes, setRegistrationTypes] = useState<SelectOption[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load categories, makes, fuel types, registration types on mount
  useEffect(() => {
    setLoadError(null);
    Promise.all([
      api.get<SelectOption[]>("/online/vehicles/categories"),
      api.get<SelectOption[]>("/online/vehicles/makes"),
      api.get<SelectOption[]>("/online/vehicles/fueltypes"),
      api.get<SelectOption[]>("/online/vehicles/activitytypes"),
      api.get<SelectOption[]>("/online/vehicles/registrationtypes"),
    ])
      .then(([cat, mk, fuel, activity, reg]) => {
        setCategories(cat);
        setMakes(mk);
        setFuelTypes(fuel);
        setActivityTypes(activity);
        setRegistrationTypes(reg);
      })
      .catch(() =>
        setLoadError("Nu am putut incarca nomenclatoarele pentru vehicul")
      );
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (value.categoryId) {
      api
        .get<SelectOption[]>(
          `/online/vehicles/categories/${value.categoryId}/subcategories`
        )
        .then(setSubcategories)
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [value.categoryId]);

  const update = (partial: Partial<VehicleData>) => {
    onChange({ ...value, ...partial });
  };

  const lookupVIN = async () => {
    if (!value.vin || !validateVIN(value.vin)) {
      setLookupError("VIN-ul trebuie sa aiba 17 caractere");
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const data = await api.get<Record<string, unknown>>(
        `/online/vehicles?VIN=${encodeURIComponent(value.vin)}`
      );

      const makeName = readString(data, ["make", "makeName", "brand"]);
      const resolvedMakeId =
        readNumber(data, ["makeId", "vehicleMakeId", "make"]) ??
        (makeName
          ? makes.find((m) => m.name.toLowerCase() === makeName.toLowerCase())?.id ??
            null
          : null);

      update({
        licensePlate:
          readString(data, ["licensePlate", "registrationNo", "plateNumber"]) ||
          value.licensePlate,
        makeId: resolvedMakeId ?? value.makeId,
        model:
          readString(data, ["model", "modelName", "vehicleModel"]) || value.model,
        year:
          readNumber(data, ["year", "fabricationYear", "firstRegistrationYear"]) ??
          value.year,
        categoryId:
          readNumber(data, ["categoryId", "vehicleCategoryId", "category"]) ??
          value.categoryId,
        subcategoryId:
          readNumber(data, ["subcategoryId", "vehicleSubcategoryId", "subcategory"]) ??
          value.subcategoryId,
        fuelTypeId:
          readNumber(data, ["fuelTypeId", "fuelId", "fuelType"]) ??
          value.fuelTypeId,
        activityTypeId:
          readNumber(data, ["activityTypeId", "vehicleActivityTypeId", "activityType"]) ??
          value.activityTypeId,
        engineCapacity:
          readNumber(data, ["engineCapacity", "cylinderCapacity"]) ??
          value.engineCapacity,
        enginePowerKw:
          readNumber(data, ["enginePowerKw", "powerKw", "enginePower"]) ??
          value.enginePowerKw,
        totalWeight:
          readNumber(data, ["totalWeight", "maxWeight"]) ?? value.totalWeight,
        seats: readNumber(data, ["seats", "seatsNo"]) ?? value.seats,
        registrationTypeId:
          readNumber(data, ["registrationTypeId", "vehicleRegistrationTypeId", "registrationType"]) ??
          value.registrationTypeId,
      });
    } catch {
      setLookupError(
        "Vehiculul nu a fost gasit in baza DRPCIV. Completati manual."
      );
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Date vehicul</h3>
      {loadError && <p className="text-sm text-yellow-700">{loadError}</p>}

      {/* VIN lookup */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Serie sasiu (VIN)
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
            value={value.vin}
            onChange={(e) => update({ vin: e.target.value.toUpperCase() })}
            maxLength={17}
            placeholder="Introdu VIN-ul pentru cautare automata"
          />
          {value.vin.length > 0 && !validateVIN(value.vin) && (
            <p className="mt-1 text-xs text-red-600">VIN invalid</p>
          )}
        </div>
        <button
          type="button"
          onClick={lookupVIN}
          disabled={lookingUp}
          className="mt-6 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {lookingUp ? "Se cauta..." : "Cauta"}
        </button>
      </div>
      {lookupError && (
        <p className="text-sm text-yellow-600">{lookupError}</p>
      )}

      {/* License plate */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Numar inmatriculare
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          value={value.licensePlate}
          onChange={(e) =>
            update({ licensePlate: e.target.value.toUpperCase() })
          }
        />
      </div>

      {/* Category & Subcategory */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Categorie vehicul
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.categoryId ?? ""}
            onChange={(e) =>
              update({
                categoryId: e.target.value ? Number(e.target.value) : null,
                subcategoryId: null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Subcategorie
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.subcategoryId ?? ""}
            onChange={(e) =>
              update({
                subcategoryId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Make & Model */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Marca
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.makeId ?? ""}
            onChange={(e) =>
              update({ makeId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Selecteaza</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Model
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.model}
            onChange={(e) => update({ model: e.target.value })}
          />
        </div>
      </div>

      {/* Year, Engine, Weight, Seats */}
      <div className="grid grid-cols-5 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            An fabricatie
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.year ?? ""}
            onChange={(e) =>
              update({ year: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cilindree (cm3)
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.engineCapacity ?? ""}
            onChange={(e) =>
              update({
                engineCapacity: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Putere (kW)
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.enginePowerKw ?? ""}
            onChange={(e) =>
              update({
                enginePowerKw: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Masa totala (kg)
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.totalWeight ?? ""}
            onChange={(e) =>
              update({
                totalWeight: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Locuri
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.seats ?? ""}
            onChange={(e) =>
              update({ seats: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      {/* Fuel type & Registration type */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Combustibil
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.fuelTypeId ?? ""}
            onChange={(e) =>
              update({
                fuelTypeId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {fuelTypes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tip utilizare
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.activityTypeId ?? ""}
            onChange={(e) =>
              update({
                activityTypeId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {activityTypes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tip inmatriculare
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={value.registrationTypeId ?? ""}
            onChange={(e) =>
              update({
                registrationTypeId: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          >
            <option value="">Selecteaza</option>
            {registrationTypes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function emptyVehicle(): VehicleData {
  return {
    vin: "",
    licensePlate: "",
    makeId: null,
    model: "",
    year: null,
    categoryId: null,
    subcategoryId: null,
    fuelTypeId: null,
    activityTypeId: null,
    engineCapacity: null,
    enginePowerKw: null,
    totalWeight: null,
    seats: null,
    registrationTypeId: null,
  };
}

export type { VehicleData };
