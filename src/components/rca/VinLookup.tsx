"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { validateVIN } from "@/lib/utils/validation";
import { readString, readNumber } from "@/lib/utils/rcaHelpers";
import type { VehicleData, SelectOption } from "@/types/rcaFlow";

interface VinLookupProps {
  vehicle: VehicleData;
  onChange: (vehicle: Partial<VehicleData>) => void;
  onContinue: () => void;
}

export default function VinLookup({ vehicle, onChange, onContinue }: VinLookupProps) {
  const [makes, setMakes] = useState<SelectOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<SelectOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<SelectOption[]>([]);
  const [registrationTypes, setRegistrationTypes] = useState<SelectOption[]>([]);
  const [subcategories, setSubcategories] = useState<SelectOption[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Load nomenclatures on mount and auto-set locked fields
  useEffect(() => {
    Promise.all([
      api.get<SelectOption[]>("/online/vehicles/makes"),
      api.get<SelectOption[]>("/online/vehicles/fueltypes"),
      api.get<SelectOption[]>("/online/vehicles/activitytypes"),
      api.get<SelectOption[]>("/online/vehicles/registrationtypes"),
    ])
      .then(([mk, fuel, activity, reg]) => {
        setMakes(mk);
        setFuelTypes(fuel);
        setActivityTypes(activity);
        setRegistrationTypes(reg);

        // Auto-select "Privat / Personal" activity type
        const privatActivity = activity.find((a) =>
          a.name.toLowerCase().includes("privat")
        );
        if (privatActivity && !vehicle.activityTypeId) {
          onChange({ activityTypeId: privatActivity.id });
        }

        // Auto-select "Inmatriculat" registration type
        const inmatriculat = reg.find((r) =>
          r.name.toLowerCase().includes("inmatriculat")
        );
        if (inmatriculat && !vehicle.registrationTypeId) {
          onChange({ registrationTypeId: inmatriculat.id });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (vehicle.categoryId) {
      api
        .get<SelectOption[]>(
          `/online/vehicles/categories/${vehicle.categoryId}/subcategories`
        )
        .then(setSubcategories)
        .catch(() => setSubcategories([]));
    }
  }, [vehicle.categoryId]);

  const lookupVIN = async () => {
    if (!vehicle.vin || !validateVIN(vehicle.vin)) {
      setLookupError("VIN-ul trebuie sa aiba 17 caractere alfanumerice");
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const data = await api.get<Record<string, unknown>>(
        `/online/vehicles?VIN=${encodeURIComponent(vehicle.vin)}`
      );

      const makeName = readString(data, ["make", "makeName", "brand"]);
      const resolvedMakeId =
        readNumber(data, ["makeId", "vehicleMakeId", "make"]) ??
        (makeName
          ? makes.find((m) => m.name.toLowerCase() === makeName.toLowerCase())?.id ?? null
          : null);

      console.log("DRPCIV response:", JSON.stringify(data, null, 2));

      onChange({
        makeId: resolvedMakeId ?? vehicle.makeId,
        model: readString(data, ["commercialName", "model", "modelName", "vehicleModel"]) || vehicle.model,
        year: readNumber(data, ["productionYear", "year", "fabricationYear", "firstRegistrationYear"]) ?? vehicle.year,
        categoryId: readNumber(data, ["vehicleCategoryId", "categoryId", "category"]) ?? vehicle.categoryId,
        subcategoryId: readNumber(data, ["vehicleSubCategoryId", "subcategoryId", "vehicleSubcategoryId", "subcategory"]) ?? vehicle.subcategoryId,
        fuelTypeId: readNumber(data, ["fuelTypeId", "fuelId", "fuelType"]) ?? vehicle.fuelTypeId,
        activityTypeId: readNumber(data, ["activityTypeId", "vehicleActivityTypeId", "activityType"]) ?? vehicle.activityTypeId,
        engineCapacity: readNumber(data, ["engineCapacity", "cylinderCapacity"]) ?? vehicle.engineCapacity,
        enginePowerKw: readNumber(data, ["enginePowerKw", "powerKw", "enginePower"]) ?? vehicle.enginePowerKw,
        totalWeight: readNumber(data, ["maxWeight", "totalWeight"]) ?? vehicle.totalWeight,
        seats: readNumber(data, ["seatsNumber", "seats", "seatsNo"]) ?? vehicle.seats,
        registrationTypeId: readNumber(data, ["registrationTypeId", "vehicleRegistrationTypeId", "registrationType"]) ?? vehicle.registrationTypeId,
      });
      setLookupDone(true);
    } catch {
      setLookupError("Vehiculul nu a fost gasit in baza DRPCIV. Completati manual.");
      setLookupDone(true);
    } finally {
      setLookingUp(false);
    }
  };

  const isVehicleReady =
    vehicle.makeId !== null &&
    !!vehicle.model?.trim() &&
    vehicle.year !== null &&
    vehicle.fuelTypeId !== null &&
    vehicle.engineCapacity !== null &&
    vehicle.enginePowerKw !== null &&
    vehicle.seats !== null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Introdu seria de sasiu (VIN)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Datele vehiculului vor fi completate automat din baza DRPCIV
        </p>
      </div>

      {/* VIN input + search */}
      <div className="mx-auto max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none"
            value={vehicle.vin}
            onChange={(e) => onChange({ vin: e.target.value.toUpperCase() })}
            onKeyDown={(e) => e.key === "Enter" && lookupVIN()}
            maxLength={17}
            placeholder="Introdu VIN-ul (17 caractere)"
            autoFocus
          />
          <button
            type="button"
            onClick={lookupVIN}
            disabled={lookingUp}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {lookingUp ? "Se cauta..." : "Cauta"}
          </button>
        </div>
        {vehicle.vin.length > 0 && !validateVIN(vehicle.vin) && (
          <p className="mt-1 text-xs text-red-600">VIN-ul trebuie sa aiba exact 17 caractere</p>
        )}
        {lookupError && (
          <p className="mt-1 text-sm text-amber-600">{lookupError}</p>
        )}
      </div>

      {/* Vehicle details (editable after lookup or manual) */}
      {lookupDone && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">Date vehicul</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.makeId ?? ""}
                onChange={(e) => onChange({ makeId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Selecteaza</option>
                {makes.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.model}
                onChange={(e) => onChange({ model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">An fabricatie</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.year ?? ""}
                onChange={(e) => onChange({ year: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cilindree (cm3)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.engineCapacity ?? ""}
                onChange={(e) => onChange({ engineCapacity: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Putere (kW)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.enginePowerKw ?? ""}
                onChange={(e) => onChange({ enginePowerKw: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Masa (kg)</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.totalWeight ?? ""}
                onChange={(e) => onChange({ totalWeight: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Locuri</label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.seats ?? ""}
                onChange={(e) => onChange({ seats: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Combustibil</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.fuelTypeId ?? ""}
                onChange={(e) => onChange({ fuelTypeId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Selecteaza</option>
                {fuelTypes.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tip utilizare</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700"
                value={activityTypes.find((a) => a.id === vehicle.activityTypeId)?.name ?? "Privat / Personal"}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Subcategorie</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={vehicle.subcategoryId ?? ""}
                onChange={(e) => onChange({ subcategoryId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Selecteaza</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tip inmatriculare</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700"
                value={registrationTypes.find((r) => r.id === vehicle.registrationTypeId)?.name ?? "Inmatriculat"}
                readOnly
              />
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onContinue}
              disabled={!isVehicleReady}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Continua
            </button>
            {!isVehicleReady && (
              <p className="mt-1 text-xs text-amber-600">Completeaza toate campurile obligatorii</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
