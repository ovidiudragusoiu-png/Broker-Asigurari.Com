"use client";

import { useState, useEffect, useCallback } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import { api } from "@/lib/api/client";
import { readString, readNumber } from "@/lib/utils/rcaHelpers";
import { validateVIN } from "@/lib/utils/validation";
import { btn, inputClass } from "@/lib/ui/tokens";

// ── Types ───────────────────────────────────────────────────────────

interface SelectOption {
  id: number;
  name: string;
}

interface CascoForm {
  // Step 1 — Contact
  ownerType: "PF" | "PJ";
  lastName: string;
  firstName: string;
  companyName: string;
  cui: string;
  cnp: string;
  email: string;
  phone: string;
  hasLicense: "da" | "nu" | "";
  licenseDate: string;
  countyId: string;
  countyName: string;
  cityId: string;
  cityName: string;
  maritalStatus: string;

  // Step 2 — Vehicle & Insurance
  inputMode: "form" | "upload";
  files: File[];
  plateNumber: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  makeId: string;
  makeName: string;
  model: string;
  version: string;
  year: string;
  firstRegistrationDate: string;
  vin: string;
  bodyType: string;
  transmission: string;
  km: string;
  fuelType: string;
  seats: string;
  engineCc: string;
  engineKw: string;
  maxWeight: string;
  ownerHistory: string;
  ridesharing: string;
  currentInsurer: string;
  startDate: string;
  paymentFrequency: string;
  deductible: string;
  isNewCar: string;
  invoiceValue: string;
  invoiceCurrency: string;

  // Step 3
  observations: string;
  consent: boolean;
}

const EMPTY_FORM: CascoForm = {
  ownerType: "PF",
  lastName: "",
  firstName: "",
  companyName: "",
  cui: "",
  cnp: "",
  email: "",
  phone: "",
  hasLicense: "",
  licenseDate: "",
  countyId: "",
  countyName: "",
  cityId: "",
  cityName: "",
  maritalStatus: "",

  inputMode: "form",
  files: [],
  plateNumber: "",
  categoryId: "",
  categoryName: "",
  subcategoryId: "",
  subcategoryName: "",
  makeId: "",
  makeName: "",
  model: "",
  version: "",
  year: "",
  firstRegistrationDate: "",
  vin: "",
  bodyType: "",
  transmission: "",
  km: "",
  fuelType: "",
  seats: "",
  engineCc: "",
  engineKw: "",
  maxWeight: "",
  ownerHistory: "",
  ridesharing: "",
  currentInsurer: "",
  startDate: "",
  paymentFrequency: "",
  deductible: "",
  isNewCar: "",
  invoiceValue: "",
  invoiceCurrency: "RON",

  observations: "",
  consent: false,
};

const BODY_TYPES = ["Sedan", "Hatchback", "Break/Combi", "SUV/Crossover", "Coupe", "Cabrio", "Monovolum"];
const FUEL_TYPES = ["Benzină", "Motorină", "Electric", "GPL", "Hibrid benzină", "Hibrid motorină"];
const INSURERS = [
  "NEASIGURAT", "Allianz Tiriac", "Asirom", "Axeria", "Eazy Insure", "Euroins",
  "Generali", "Grawe", "Groupama", "Hellas", "Omniasig", "Uniqa",
];
const YEARS = Array.from({ length: 20 }, (_, i) => String(2026 - i));

// ── Component ───────────────────────────────────────────────────────

export default function CascoPage() {
  const { currentStep, next, prev, goTo } = useWizard(3);
  const [form, setForm] = useState<CascoForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Nomenclatures
  const [counties, setCounties] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [makes, setMakes] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [subcategories, setSubcategories] = useState<SelectOption[]>([]);

  useEffect(() => {
    api.get<SelectOption[]>("/online/address/utils/counties")
      .then((data) => setCounties(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
    api.get<SelectOption[]>("/online/vehicles/makes")
      .then((data) => setMakes([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
    api.get<SelectOption[]>("/online/vehicles/categories")
      .then((data) => setCategories(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.countyId) { setCities([]); return; }
    api.get<SelectOption[]>(`/online/address/utils/cities?countyId=${form.countyId}`)
      .then((data) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCities([]));
  }, [form.countyId]);

  // Load subcategories when category changes
  useEffect(() => {
    if (!form.categoryId) { setSubcategories([]); return; }
    api.get<SelectOption[]>(`/online/vehicles/categories/${form.categoryId}/subcategories`)
      .then((subs) => setSubcategories(subs))
      .catch(() => setSubcategories([]));
  }, [form.categoryId]);

  const set = useCallback(<K extends keyof CascoForm>(field: K, value: CascoForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ── CUI lookup ──

  const [cuiLoading, setCuiLoading] = useState(false);
  const [cuiFound, setCuiFound] = useState(false);
  const [cuiError, setCuiError] = useState<string | null>(null);

  const lookupCUI = async () => {
    if (!form.cui || form.cui.length < 2) return;
    setCuiLoading(true);
    setCuiError(null);
    try {
      const company = await api.post<{
        name?: string;
        addressResponse?: {
          countyResponse?: { id: number; name: string } | null;
          cityResponse?: { id: number; name: string } | null;
        } | null;
      }>(`/online/companies/utils/${form.cui}`, {});

      const countyResp = company.addressResponse?.countyResponse;
      const cityResp = company.addressResponse?.cityResponse;

      setForm((prev) => ({
        ...prev,
        companyName: company.name || prev.companyName,
        countyId: countyResp ? String(countyResp.id) : prev.countyId,
        countyName: countyResp?.name || prev.countyName,
        cityId: cityResp ? String(cityResp.id) : prev.cityId,
        cityName: cityResp?.name || prev.cityName,
      }));

      // Load cities for the matched county so the city dropdown is populated
      if (countyResp) {
        try {
          const cityList = await api.get<{ id: number; name: string }[]>(
            `/online/address/utils/cities?countyId=${countyResp.id}`
          );
          setCities(cityList);
        } catch {
          /* cities fetch failed — user can still select manually */
        }
      }

      setCuiFound(true);
    } catch {
      setCuiError("Firma nu a fost găsită. Completați datele manual.");
      setCuiFound(false);
    } finally {
      setCuiLoading(false);
    }
  };

  // ── VIN lookup ──

  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinDone, setVinDone] = useState(false);

  const lookupVIN = async () => {
    if (!form.vin || !validateVIN(form.vin)) {
      setVinError("VIN-ul trebuie să conțină 17 caractere alfanumerice.");
      return;
    }
    setVinLoading(true);
    setVinError(null);
    try {
      const data = await api.get<Record<string, unknown>>(
        `/online/vehicles?VIN=${encodeURIComponent(form.vin)}`
      );

      const makeName = readString(data, ["make", "makeName", "brand"]);
      const resolvedMakeId =
        readNumber(data, ["makeId", "vehicleMakeId", "make"]) ??
        (makeName
          ? makes.find((m) => m.name.toLowerCase() === makeName.toLowerCase())?.id ?? null
          : null);

      const drpcivCategoryId = readNumber(data, ["vehicleCategoryId", "categoryId", "category"]);
      const drpcivSubcategoryId = readNumber(data, ["vehicleSubCategoryId", "subcategoryId", "vehicleSubcategoryId", "subcategory"]);
      const drpcivEuropeanCode = readString(data, ["europeanCode"]);

      // Resolve category name
      const matchedCategory = drpcivCategoryId ? categories.find((c) => c.id === drpcivCategoryId) : null;

      // Resolve subcategory: fetch subcategories for the new category and auto-match
      let resolvedSubId = drpcivSubcategoryId ? String(drpcivSubcategoryId) : "";
      let resolvedSubName = "";
      if (drpcivCategoryId) {
        try {
          const subs = await api.get<SelectOption[]>(
            `/online/vehicles/categories/${drpcivCategoryId}/subcategories`
          );
          setSubcategories(subs);
          // Try to match by ID first
          let matched = drpcivSubcategoryId ? subs.find((s) => s.id === drpcivSubcategoryId) : null;
          // Fall back to europeanCode match (e.g. "M1" → "[M1]" in name)
          if (!matched && drpcivEuropeanCode) {
            matched = subs.find((s) => s.name.includes(`[${drpcivEuropeanCode}]`));
          }
          if (matched) {
            resolvedSubId = String(matched.id);
            resolvedSubName = matched.name;
          }
        } catch { /* subcategories fetch failed */ }
      }

      setForm((prev) => ({
        ...prev,
        categoryId: drpcivCategoryId ? String(drpcivCategoryId) : prev.categoryId,
        categoryName: matchedCategory?.name || prev.categoryName,
        subcategoryId: resolvedSubId || prev.subcategoryId,
        subcategoryName: resolvedSubName || prev.subcategoryName,
        makeId: resolvedMakeId != null ? String(resolvedMakeId) : prev.makeId,
        makeName: resolvedMakeId != null
          ? (makes.find((m) => m.id === resolvedMakeId)?.name || makeName || prev.makeName)
          : prev.makeName,
        model: readString(data, ["commercialName", "model", "modelName", "vehicleModel"]) || prev.model,
        year: String(readNumber(data, ["productionYear", "year", "fabricationYear", "firstRegistrationYear"]) ?? "") || prev.year,
        engineCc: String(readNumber(data, ["engineCapacity", "cylinderCapacity"]) ?? "") || prev.engineCc,
        engineKw: String(readNumber(data, ["enginePowerKw", "powerKw", "enginePower"]) ?? "") || prev.engineKw,
        maxWeight: String(readNumber(data, ["maxWeight", "totalWeight"]) ?? "") || prev.maxWeight,
        seats: String(readNumber(data, ["seatsNumber", "seats", "seatsNo"]) ?? "") || prev.seats,
      }));
      setVinDone(true);
    } catch {
      setVinError("Vehiculul nu a fost găsit în baza DRPCIV. Completați datele manual.");
      setVinDone(true);
    } finally {
      setVinLoading(false);
    }
  };

  // ── Validation ──

  const step1Valid =
    form.email.includes("@") &&
    form.phone.length >= 10 &&
    form.countyId !== "" &&
    form.cityId !== "" &&
    form.hasLicense !== "" &&
    (form.ownerType === "PF"
      ? form.lastName.length > 0 && form.firstName.length > 0 && form.cnp.length === 13
      : form.companyName.length > 0 && form.cui.length >= 2);

  const step2Valid =
    form.currentInsurer !== "" &&
    form.startDate !== "" &&
    form.paymentFrequency !== "" &&
    form.deductible !== "" &&
    (form.inputMode === "upload"
      ? form.files.length > 0
      : form.makeId !== "" && form.model.length > 0 && form.year !== "" && form.vin.length >= 5);

  const step3Valid = form.consent;

  // ── File upload handler ──

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, 2);
    set("files", newFiles);
  };

  const removeFile = (index: number) => {
    set("files", form.files.filter((_, i) => i !== index));
  };

  // ── Submit ──

  const handleSubmit = async () => {
    if (!step3Valid) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Convert files to base64
      const fileAttachments: { name: string; content: string; type: string }[] = [];
      for (const file of form.files) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        fileAttachments.push({ name: file.name, content: base64, type: file.type });
      }

      const response = await fetch("/api/casco/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          files: fileAttachments,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Eroare la trimiterea formularului");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Eroare la trimiterea formularului");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──

  if (submitted) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Cererea a fost trimisă cu succes!</h2>
        <p className="mt-2 text-gray-500">
          Un consultant vă va contacta în cel mai scurt timp cu oferta CASCO personalizată.
        </p>
        <button type="button" onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); goTo(0); }} className={`mt-8 ${btn.primary}`}>
          Trimite o nouă cerere
        </button>
      </section>
    );
  }

  // ── Steps ──

  const steps = [
    {
      title: "Date de contact",
      content: (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Date de contact</h2>
            <p className="mt-1 text-sm text-gray-500">Completați informațiile de contact ale proprietarului</p>
          </div>

          {/* PF / PJ toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              {(["PF", "PJ"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("ownerType", type)}
                  className={`rounded-md px-6 py-2 text-sm font-semibold transition-all ${
                    form.ownerType === type
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {type === "PF" ? "Persoană fizică" : "Persoană juridică"}
                </button>
              ))}
            </div>
          </div>

          {form.ownerType === "PF" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Nume" />
                <input className={inputClass} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Prenume" />
              </div>
              <input className={inputClass} value={form.cnp} onChange={(e) => set("cnp", e.target.value)} placeholder="CNP" maxLength={13} />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Stare civilă</label>
                <select className={inputClass} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                  <option value="">— Selectează —</option>
                  <option value="casatorit">Căsătorit(ă)</option>
                  <option value="necasatorit">Necăsătorit(ă)</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <input className={`flex-1 ${inputClass}`} value={form.cui} onChange={(e) => { set("cui", e.target.value); setCuiFound(false); setCuiError(null); }} placeholder="CUI" />
                <button
                  type="button"
                  onClick={lookupCUI}
                  disabled={cuiLoading || form.cui.length < 2}
                  className={btn.primary}
                >
                  {cuiLoading ? "Se caută..." : "Caută firma"}
                </button>
              </div>
              {cuiError && <p className="text-sm text-amber-600">{cuiError}</p>}
              {cuiFound && <p className="text-sm text-emerald-600">Firma a fost identificată.</p>}
              <input className={inputClass} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Nume firmă" />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" />
            <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Telefon (07XXXXXXXX)" />
          </div>

          {/* Driving license */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Deții permis auto?</label>
              <select className={inputClass} value={form.hasLicense} onChange={(e) => set("hasLicense", e.target.value as "da" | "nu" | "")}>
                <option value="">— Selectează —</option>
                <option value="da">Da</option>
                <option value="nu">Nu</option>
              </select>
            </div>
            {form.hasLicense === "da" && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Data obținere permis</label>
                <input type="date" className={inputClass} value={form.licenseDate} onChange={(e) => set("licenseDate", e.target.value)} />
              </div>
            )}
          </div>

          {/* County + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Județ</label>
              <select
                className={inputClass}
                value={form.countyId}
                onChange={(e) => {
                  const county = counties.find((c) => String(c.id) === e.target.value);
                  set("countyId", e.target.value);
                  set("countyName", county?.name || "");
                  set("cityId", "");
                  set("cityName", "");
                }}
              >
                <option value="">— Selectează județul —</option>
                {counties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Localitate</label>
              <select
                className={inputClass}
                value={form.cityId}
                disabled={!form.countyId}
                onChange={(e) => {
                  const city = cities.find((c) => String(c.id) === e.target.value);
                  set("cityId", e.target.value);
                  set("cityName", city?.name || "");
                }}
              >
                <option value="">— Selectează localitatea —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button type="button" onClick={next} disabled={!step1Valid} className={btn.primary}>
              Înainte
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Vehicul & Asigurare",
      content: (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Detalii vehicul și asigurare</h2>
            <p className="mt-1 text-sm text-gray-500">Completați informațiile despre vehicul sau atașați documentele</p>
          </div>

          {/* Input mode toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              {([
                { key: "form" as const, label: "Completează formularul" },
                { key: "upload" as const, label: "Atașează documente" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("inputMode", key)}
                  className={`rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                    form.inputMode === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.inputMode === "upload" ? (
            /* File upload area */
            <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Încărcați talon sau carte auto (max. 2 fișiere, JPG/PNG/PDF, max 5MB)</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                onChange={handleFileChange}
                className="mt-4 text-sm"
              />
              {form.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {form.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 text-sm text-gray-700">
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Manual form fields */
            <>
              <input className={inputClass} value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value.toUpperCase())} placeholder="Număr înmatriculare" />

              <div className="flex gap-2">
                <input className={`flex-1 ${inputClass}`} value={form.vin} onChange={(e) => { set("vin", e.target.value.toUpperCase()); setVinDone(false); setVinError(null); }} placeholder="Serie șasiu (VIN)" maxLength={17} />
                <button
                  type="button"
                  onClick={lookupVIN}
                  disabled={vinLoading || form.vin.length < 17}
                  className={btn.primary}
                >
                  {vinLoading ? "Se caută..." : "Caută"}
                </button>
              </div>
              {vinError && <p className="text-sm text-amber-600">{vinError}</p>}
              {vinDone && !vinError && <p className="text-sm text-emerald-600">Datele vehiculului au fost completate automat din baza DRPCIV.</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Categorie vehicul</label>
                  <select className={inputClass} value={form.categoryId} onChange={(e) => {
                    const cat = categories.find((c) => String(c.id) === e.target.value);
                    set("categoryId", e.target.value);
                    set("categoryName", cat?.name || "");
                    set("subcategoryId", "");
                    set("subcategoryName", "");
                  }}>
                    <option value="">— Selectează —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subcategorie (cod EU)</label>
                  <select className={inputClass} value={form.subcategoryId} onChange={(e) => {
                    const sub = subcategories.find((s) => String(s.id) === e.target.value);
                    set("subcategoryId", e.target.value);
                    set("subcategoryName", sub?.name || "");
                  }}>
                    <option value="">— Selectează —</option>
                    {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Marca</label>
                  <select
                    className={inputClass}
                    value={form.makeId}
                    onChange={(e) => {
                      const make = makes.find((m) => String(m.id) === e.target.value);
                      set("makeId", e.target.value);
                      set("makeName", make?.name || "");
                    }}
                  >
                    <option value="">— Selectează —</option>
                    {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input className={inputClass} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Model" />
                <input className={inputClass} value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="Versiune / nivel echipare" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">An fabricație</label>
                  <select className={inputClass} value={form.year} onChange={(e) => set("year", e.target.value)}>
                    <option value="">— Selectează —</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Data primei înmatriculări</label>
                  <input type="date" className={inputClass} value={form.firstRegistrationDate} onChange={(e) => set("firstRegistrationDate", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Caroserie</label>
                  <select className={inputClass} value={form.bodyType} onChange={(e) => set("bodyType", e.target.value)}>
                    <option value="">— Selectează —</option>
                    {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Transmisie</label>
                  <select className={inputClass} value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
                    <option value="">— Selectează —</option>
                    <option value="automata">Automată</option>
                    <option value="manuala">Manuală</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Motorizare</label>
                  <select className={inputClass} value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
                    <option value="">— Selectează —</option>
                    {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <input type="number" className={inputClass} value={form.km} onChange={(e) => set("km", e.target.value)} placeholder="Km la bord" />
                <input type="number" className={inputClass} value={form.seats} onChange={(e) => set("seats", e.target.value)} placeholder="Nr. locuri" />
                <input type="number" className={inputClass} value={form.engineCc} onChange={(e) => set("engineCc", e.target.value)} placeholder="Cil. (cm³)" />
                <input type="number" className={inputClass} value={form.engineKw} onChange={(e) => set("engineKw", e.target.value)} placeholder="Putere (kW)" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Masă maximă (kg)</label>
                  <input type="number" className={inputClass} value={form.maxWeight} onChange={(e) => set("maxWeight", e.target.value)} placeholder="Masă maximă (kg)" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Istoric proprietar</label>
                  <select className={inputClass} value={form.ownerHistory} onChange={(e) => set("ownerHistory", e.target.value)}>
                    <option value="">— Selectează —</option>
                    <option value="primul">Primul proprietar</option>
                    <option value="al_doilea">Al doilea proprietar</option>
                    <option value="al_treilea">Al treilea proprietar sau mai mult</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Utilizare ridesharing / taxi?</label>
                <select className={inputClass} value={form.ridesharing} onChange={(e) => set("ridesharing", e.target.value)}>
                  <option value="">— Selectează —</option>
                  <option value="nu">Nu</option>
                  <option value="da">Da</option>
                </select>
              </div>
            </>
          )}

          {/* Insurance-specific fields (always shown) */}
          <hr className="border-gray-200" />
          <h3 className="text-center text-lg font-semibold text-gray-900">Detalii asigurare</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Asigurat CASCO la</label>
              <select className={inputClass} value={form.currentInsurer} onChange={(e) => set("currentInsurer", e.target.value)}>
                <option value="">— Selectează —</option>
                {INSURERS.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Data început asigurare</label>
              <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Frecvență plată</label>
              <select className={inputClass} value={form.paymentFrequency} onChange={(e) => set("paymentFrequency", e.target.value)}>
                <option value="">— Selectează —</option>
                <option value="integrala">Integrală</option>
                <option value="semestriala">Semestrială</option>
                <option value="trimestriala">Trimestrială</option>
                <option value="lunara">Lunară</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Franșiză</label>
              <select className={inputClass} value={form.deductible} onChange={(e) => set("deductible", e.target.value)}>
                <option value="">— Selectează —</option>
                <option value="cu_fransiza">Cu franșiză</option>
                <option value="fara_fransiza">Fără franșiză</option>
                <option value="ambele">Ambele variante</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Mașină nouă?</label>
            <select className={inputClass} value={form.isNewCar} onChange={(e) => set("isNewCar", e.target.value)}>
              <option value="">— Selectează —</option>
              <option value="nu">Nu</option>
              <option value="da">Da</option>
            </select>
          </div>

          {form.isNewCar === "da" && (
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className={inputClass} value={form.invoiceValue} onChange={(e) => set("invoiceValue", e.target.value)} placeholder="Valoare factură" />
              <select className={inputClass} value={form.invoiceCurrency} onChange={(e) => set("invoiceCurrency", e.target.value)}>
                <option value="RON">Lei (RON)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={btn.secondary}>Înapoi</button>
            <button type="button" onClick={next} disabled={!step2Valid} className={btn.primary}>Înainte</button>
          </div>
        </div>
      ),
    },
    {
      title: "Confirmare",
      content: (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Verificați și trimiteți</h2>
            <p className="mt-1 text-sm text-gray-500">Verificați datele introduse și trimiteți cererea de ofertă CASCO</p>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Date de contact</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <span>Tip: {form.ownerType === "PF" ? "Persoană fizică" : "Persoană juridică"}</span>
              <span>
                {form.ownerType === "PF"
                  ? `${form.lastName} ${form.firstName}`
                  : form.companyName}
              </span>
              <span>Email: {form.email}</span>
              <span>Telefon: {form.phone}</span>
              <span>{form.ownerType === "PF" ? `CNP: ${form.cnp}` : `CUI: ${form.cui}`}</span>
              <span>Localitate: {form.cityName}, {form.countyName}</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Vehicul și asigurare</h3>
            {form.inputMode === "upload" ? (
              <p className="text-sm text-gray-600">
                Documente atașate: {form.files.map((f) => f.name).join(", ") || "—"}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                {form.plateNumber && <span>Nr. înmatriculare: {form.plateNumber}</span>}
                {form.categoryName && <span>Categorie: {form.categoryName}</span>}
                {form.subcategoryName && <span>Subcategorie: {form.subcategoryName}</span>}
                <span>Marca: {form.makeName}</span>
                <span>Model: {form.model}</span>
                <span>An: {form.year}</span>
                <span>VIN: {form.vin}</span>
                {form.km && <span>Km: {form.km}</span>}
                {form.bodyType && <span>Caroserie: {form.bodyType}</span>}
                {form.fuelType && <span>Motorizare: {form.fuelType}</span>}
              </div>
            )}
            <hr className="border-gray-100" />
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <span>Asigurat la: {form.currentInsurer}</span>
              <span>Data început: {form.startDate}</span>
              <span>Plată: {form.paymentFrequency}</span>
              <span>Franșiză: {form.deductible}</span>
              {form.isNewCar === "da" && <span>Valoare factură: {form.invoiceValue} {form.invoiceCurrency}</span>}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Observații (opțional)</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.observations}
              onChange={(e) => set("observations", e.target.value)}
              placeholder="Informații suplimentare..."
            />
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">
              Sunt de acord cu prelucrarea datelor personale în vederea primirii ofertei de asigurare CASCO.
            </span>
          </label>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={btn.secondary}>Înapoi</button>
            <button type="button" onClick={handleSubmit} disabled={!step3Valid || submitting} className={btn.primary}>
              {submitting ? "Se trimite..." : "Trimite cererea"}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
    </section>
  );
}
