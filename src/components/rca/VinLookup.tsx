"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { validateVIN } from "@/lib/utils/validation";
import { readString, readNumber } from "@/lib/utils/rcaHelpers";
import type { VehicleData, SelectOption } from "@/types/rcaFlow";
import { btn } from "@/lib/ui/tokens";

/* Category ID → user-facing label (mirrors CategorySelect config) */
const CATEGORY_LABEL: Record<number, string> = {
  1: "Autoturism",
  6: "Autoutilitara<3,5 t",
  4: "Moto",
  5: "Remorca",
};

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
  const [categoryOverrideLabel, setCategoryOverrideLabel] = useState<string | null>(null);
  const [europeanCode, setEuropeanCode] = useState<string | null>(null);

  // Load nomenclatures on mount and auto-set locked fields
  useEffect(() => {
    Promise.all([
      api.get<SelectOption[]>("/online/vehicles/makes"),
      api.get<SelectOption[]>("/online/vehicles/fueltypes"),
      api.get<SelectOption[]>("/online/vehicles/activitytypes"),
      api.get<SelectOption[]>("/online/vehicles/registrationtypes"),
    ])
      .then(([mk, fuel, activity, reg]) => {
        setMakes([...mk].sort((a, b) => a.name.localeCompare(b.name)));
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

  // Load subcategories when category changes; auto-match via europeanCode
  useEffect(() => {
    if (vehicle.categoryId) {
      api
        .get<SelectOption[]>(
          `/online/vehicles/categories/${vehicle.categoryId}/subcategories`
        )
        .then((subs) => {
          setSubcategories(subs);

          // If current subcategoryId doesn't exist in the new list, clear it
          if (vehicle.subcategoryId && !subs.some((s) => s.id === vehicle.subcategoryId)) {
            onChange({ subcategoryId: null });
          }

          // Try to auto-select subcategory using europeanCode from DRPCIV
          // e.g. europeanCode "N1" matches subcategory "[N1]" in name
          if (!vehicle.subcategoryId && europeanCode && subs.length > 0) {
            const match = subs.find((s) =>
              s.name.includes(`[${europeanCode}]`)
            );
            if (match) {
              onChange({ subcategoryId: match.id });
            }
          }
        })
        .catch(() => setSubcategories([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.categoryId, europeanCode]);

  const lookupVIN = async () => {
    if (!vehicle.vin || !validateVIN(vehicle.vin)) {
      setLookupError("VIN-ul trebuie să conțină 17 caractere alfanumerice.");
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

      const drpcivCategoryId = readNumber(data, ["vehicleCategoryId", "categoryId", "category"]);
      const drpcivSubcategoryId = readNumber(data, ["vehicleSubCategoryId", "subcategoryId", "vehicleSubcategoryId", "subcategory"]);
      const drpcivEuropeanCode = readString(data, ["europeanCode"]);
      const categoryChanged = drpcivCategoryId != null && drpcivCategoryId !== vehicle.categoryId;

      // Save europeanCode (e.g. "N1") so we can match it against subcategory names
      if (drpcivEuropeanCode) setEuropeanCode(drpcivEuropeanCode);

      // Detect if DRPCIV returned a different category than what user chose in step 1
      if (categoryChanged) {
        const newLabel = CATEGORY_LABEL[drpcivCategoryId] ?? `Categoria ${drpcivCategoryId}`;
        setCategoryOverrideLabel(newLabel);
      }

      // If category changed and DRPCIV didn't provide a subcategory, reset to null
      // so the user must pick from the new subcategory list
      const resolvedSubcategoryId = drpcivSubcategoryId
        ?? (categoryChanged ? null : vehicle.subcategoryId);

      onChange({
        makeId: resolvedMakeId ?? vehicle.makeId,
        model: readString(data, ["commercialName", "model", "modelName", "vehicleModel"]) || vehicle.model,
        year: readNumber(data, ["productionYear", "year", "fabricationYear", "firstRegistrationYear"]) ?? vehicle.year,
        categoryId: drpcivCategoryId ?? vehicle.categoryId,
        subcategoryId: resolvedSubcategoryId,
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
      setLookupError("Vehiculul nu a fost găsit în baza DRPCIV. Completați datele manual.");
      setLookupDone(true);
    } finally {
      setLookingUp(false);
    }
  };

  const powerInvalid = vehicle.enginePowerKw === null || vehicle.enginePowerKw <= 0;

  const isVehicleReady =
    vehicle.makeId !== null &&
    !!vehicle.model?.trim() &&
    vehicle.year !== null &&
    vehicle.subcategoryId !== null &&
    vehicle.fuelTypeId !== null &&
    vehicle.engineCapacity !== null &&
    !powerInvalid &&
    vehicle.seats !== null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Introduceți seria de șasiu (VIN)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Datele vehiculului se completează automat din baza de date DRPCIV
        </p>
      </div>

      {/* VIN input + search */}
      <div className="mx-auto max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-mono uppercase focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-colors duration-200"
            value={vehicle.vin}
            onChange={(e) => onChange({ vin: e.target.value.toUpperCase() })}
            onKeyDown={(e) => e.key === "Enter" && lookupVIN()}
            maxLength={17}
            placeholder="VIN (17 caractere alfanumerice)"
            autoFocus
          />
          <button
            type="button"
            onClick={lookupVIN}
            disabled={lookingUp}
            className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200"
          >
            {lookingUp ? "Se caută..." : "Caută"}
          </button>
        </div>
        {vehicle.vin.length > 0 && !validateVIN(vehicle.vin) && (
          <p className="mt-1 text-xs text-red-600">VIN-ul trebuie să conțină exact 17 caractere</p>
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
                <option value="">Selectează</option>
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
              <label className="mb-1 block text-xs font-medium text-gray-600">An fabricație</label>
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
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  lookupDone && powerInvalid ? "border-red-400" : "border-gray-300"
                }`}
                value={vehicle.enginePowerKw ?? ""}
                onChange={(e) => onChange({ enginePowerKw: e.target.value ? Number(e.target.value) : null })}
              />
              {lookupDone && powerInvalid && (
                <p className="mt-0.5 text-xs font-medium text-red-600">
                  Verificați puterea conform talonului / CIV. Pentru vehicule electrice, completați puterea netă din CIV.
                </p>
              )}
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
                <option value="">Selectează</option>
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
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  !vehicle.subcategoryId ? "border-red-400" : "border-gray-300"
                }`}
                value={vehicle.subcategoryId ?? ""}
                onChange={(e) => onChange({ subcategoryId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Selectează</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {!vehicle.subcategoryId && (
                <p className="mt-0.5 text-xs font-medium text-red-600">
                  Verificați subcategoria conform talonului.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tip înmatriculare</label>
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
              className={btn.primary}
            >
              Continuă
            </button>
            {!isVehicleReady && (
              <p className="mt-1 text-xs text-amber-600">Completați toate câmpurile obligatorii</p>
            )}
          </div>
        </div>
      )}
      {/* Category override warning popup */}
      {categoryOverrideLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-amber-50 p-8 text-center shadow-xl">
            {/* Bell icon */}
            <div className="mx-auto mb-4 text-amber-500">
              <svg className="mx-auto h-14 w-14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C10.9 2 10 2.9 10 4C10 4.1 10 4.19 10.02 4.28C7.58 5.07 6 7.36 6 10V15L4 17V18H20V17L18 15V10C18 7.36 16.42 5.07 13.98 4.28C14 4.19 14 4.1 14 4C14 2.9 13.1 2 12 2Z" fill="currentColor"/>
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z" fill="currentColor"/>
                {/* Sound waves */}
                <path d="M4.5 9C4.5 9 3 9.5 3 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 8C2 8 0.5 9.5 0.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M19.5 9C19.5 9 21 9.5 21 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M22 8C22 8 23.5 9.5 23.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-600">
              Atenție!
            </h3>
            <p className="mt-2 text-xl font-bold text-gray-800">
              Categoria vehiculului a fost actualizată conform datelor DRPCIV.
            </p>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              &quot;{categoryOverrideLabel}&quot;
            </p>
            <button
              type="button"
              onClick={() => setCategoryOverrideLabel(null)}
              className={`mt-6 w-full rounded-lg ${btn.primary}`}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
