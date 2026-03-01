"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import { api } from "@/lib/api/client";
import { readString, readNumber } from "@/lib/utils/rcaHelpers";
import { validateVIN, validateCNP } from "@/lib/utils/validation";
import { btn } from "@/lib/ui/tokens";
import DateInput from "@/components/shared/DateInput";
import DntChoice from "@/components/rca/DntChoice";
import TermsModal from "@/components/rca/TermsModal";

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
  invoiceFiles: File[];

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
  invoiceFiles: [],

  observations: "",
  consent: false,
};

const tomorrowDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const BODY_TYPES = ["Sedan", "Hatchback", "Break/Combi", "SUV/Crossover", "Coupe", "Cabrio", "Monovolum"];
const FUEL_TYPES = ["Benzină", "Motorină", "Electric", "GPL", "Hibrid benzină", "Hibrid motorină"];
const INSURERS = [
  "NEASIGURAT", "Allianz Tiriac", "Asirom", "Axeria", "Eazy Insure", "Euroins",
  "Generali", "Grawe", "Groupama", "Hellas", "Omniasig", "Uniqa",
];
const YEARS = Array.from({ length: 20 }, (_, i) => String(2026 - i));

/* ── CSS helpers ── */
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

/* Bucharest sectors: each sector is a separate county+city in the API */
const BUCHAREST_SECTORS = [
  { label: "Sector 1", countyId: 14, cityId: 1598 },
  { label: "Sector 2", countyId: 5,  cityId: 1599 },
  { label: "Sector 3", countyId: 9,  cityId: 1600 },
  { label: "Sector 4", countyId: 22, cityId: 1601 },
  { label: "Sector 5", countyId: 39, cityId: 1602 },
  { label: "Sector 6", countyId: 8,  cityId: 1603 },
];
const BUCHAREST_COUNTY_IDS = new Set(BUCHAREST_SECTORS.map((s) => String(s.countyId)));
const BUCHAREST_SENTINEL = "-999"; // virtual countyId for the single "Bucuresti" option

// ── Component ───────────────────────────────────────────────────────

export default function CascoPage() {
  const { currentStep, next, prev, goTo } = useWizard(4);
  const [form, setForm] = useState<CascoForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Inline validation — track touched fields + attempted submit
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step1Attempted, setStep1Attempted] = useState(false);
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const shouldShowError = (field: string) => touched[field] || step1Attempted;

  // Nomenclatures
  const [counties, setCounties] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);

  const isBucharest = BUCHAREST_COUNTY_IDS.has(form.countyId);
  const isBucharestSentinel = form.countyId === BUCHAREST_SENTINEL;

  // Deduplicate: replace all 6 "Bucuresti" counties with one virtual entry
  const deduplicatedCounties = (() => {
    const filtered = counties.filter((c) => !BUCHAREST_COUNTY_IDS.has(String(c.id)));
    filtered.push({ id: Number(BUCHAREST_SENTINEL), name: "Bucuresti" });
    filtered.sort((a, b) => a.name.localeCompare(b.name, "ro"));
    return filtered;
  })();

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
    if (!form.countyId || form.countyId === BUCHAREST_SENTINEL) { setCities([]); return; }
    api.get<SelectOption[]>(`/online/address/utils/cities?countyId=${form.countyId}`)
      .then((data) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCities([]));
  }, [form.countyId]);

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

      if (countyResp) {
        try {
          const cityList = await api.get<{ id: number; name: string }[]>(
            `/online/address/utils/cities?countyId=${countyResp.id}`
          );
          setCities(cityList);
        } catch {
          /* cities fetch failed */
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

      const matchedCategory = drpcivCategoryId ? categories.find((c) => c.id === drpcivCategoryId) : null;

      let resolvedSubId = drpcivSubcategoryId ? String(drpcivSubcategoryId) : "";
      let resolvedSubName = "";
      if (drpcivCategoryId) {
        try {
          const subs = await api.get<SelectOption[]>(
            `/online/vehicles/categories/${drpcivCategoryId}/subcategories`
          );
          setSubcategories(subs);
          let matched = drpcivSubcategoryId ? subs.find((s) => s.id === drpcivSubcategoryId) : null;
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
      ? form.lastName.length > 0 && form.firstName.length > 0 && validateCNP(form.cnp)
      : form.companyName.length > 0 && form.cui.length >= 2);

  // Field-level error checks
  const fieldErrors = {
    lastName: form.ownerType === "PF" && form.lastName.length === 0,
    firstName: form.ownerType === "PF" && form.firstName.length === 0,
    cnp: form.ownerType === "PF" && !validateCNP(form.cnp),
    companyName: form.ownerType === "PJ" && form.companyName.length === 0,
    cui: form.ownerType === "PJ" && form.cui.length < 2,
    email: !form.email.includes("@"),
    phone: form.phone.length < 10,
    countyId: form.countyId === "",
    cityId: form.cityId === "",
    hasLicense: form.hasLicense === "",
  };

  const errBorder = "!border-red-400";
  const inputErr = (field: string) =>
    shouldShowError(field) && fieldErrors[field as keyof typeof fieldErrors]
      ? errBorder
      : "";
  const selectErr = (field: string) =>
    shouldShowError(field) && fieldErrors[field as keyof typeof fieldErrors]
      ? errBorder
      : "";

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

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    const allowed = incoming.filter(
      (f) => /\.(jpe?g|png|pdf)$/i.test(f.name) && f.size <= 5 * 1024 * 1024
    );
    const merged = [...form.files, ...allowed].slice(0, 2);
    set("files", merged);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    set("files", form.files.filter((_, i) => i !== index));
  };

  // ── Invoice file upload (new car) ──

  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const addInvoiceFiles = (incoming: File[]) => {
    const allowed = incoming.filter(
      (f) => /\.(jpe?g|png|pdf)$/i.test(f.name) && f.size <= 5 * 1024 * 1024
    );
    const merged = [...form.invoiceFiles, ...allowed].slice(0, 2);
    set("invoiceFiles", merged);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addInvoiceFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeInvoiceFile = (index: number) => {
    set("invoiceFiles", form.invoiceFiles.filter((_, i) => i !== index));
  };

  // ── Submit ──

  const handleSubmit = async () => {
    if (!step3Valid) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const fileAttachments: { name: string; content: string; type: string }[] = [];
      for (const file of form.files) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        fileAttachments.push({ name: file.name, content: base64, type: file.type });
      }

      const invoiceAttachments: { name: string; content: string; type: string }[] = [];
      for (const file of form.invoiceFiles) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        invoiceAttachments.push({ name: file.name, content: base64, type: file.type });
      }

      const response = await fetch("/api/casco/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          files: fileAttachments,
          invoiceFiles: invoiceAttachments,
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
      <section className="mx-auto max-w-3xl px-4 pt-24 pb-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-500/25">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Cererea a fost trimisă cu succes!</h2>
        <p className="mt-2 text-sm text-gray-500">
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
    /* ────── Step 1: Date de Contact ────── */
    {
      title: "Date de contact",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Main card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            {/* PF / PJ toggle */}
            <div className="flex gap-2">
              {(["PF", "PJ"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("ownerType", type)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    form.ownerType === type
                      ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                      : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {type === "PF" ? "Persoana fizica" : "Persoana juridica"}
                </button>
              ))}
            </div>

            {form.ownerType === "PF" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Nume</label>
                    <input className={`${inputCls} ${inputErr("lastName")}`} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} onBlur={() => touch("lastName")} placeholder="ex: Popescu" />
                    {shouldShowError("lastName") && fieldErrors.lastName && (
                      <p className="mt-1 text-xs text-red-500">Numele este obligatoriu</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Prenume</label>
                    <input className={`${inputCls} ${inputErr("firstName")}`} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} onBlur={() => touch("firstName")} placeholder="ex: Ion" />
                    {shouldShowError("firstName") && fieldErrors.firstName && (
                      <p className="mt-1 text-xs text-red-500">Prenumele este obligatoriu</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>CNP</label>
                  <input className={`${inputCls} ${inputErr("cnp")}`} value={form.cnp} onChange={(e) => set("cnp", e.target.value.replace(/\D/g, ""))} onBlur={() => touch("cnp")} placeholder="13 cifre" maxLength={13} inputMode="numeric" />
                  {shouldShowError("cnp") && fieldErrors.cnp && form.cnp.length > 0 && (
                    <p className="mt-1 text-xs text-red-500">{form.cnp.length < 13 ? "CNP-ul trebuie să aibă 13 cifre" : "CNP invalid"}</p>
                  )}
                  {shouldShowError("cnp") && fieldErrors.cnp && form.cnp.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">CNP-ul este obligatoriu</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Stare civila</label>
                  <select className={selectCls} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                    <option value="">Selecteaza</option>
                    <option value="casatorit">Casatorit(a)</option>
                    <option value="necasatorit">Necasatorit(a)</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>CUI</label>
                    <input className={inputCls} value={form.cui} onChange={(e) => { set("cui", e.target.value); setCuiFound(false); setCuiError(null); }} placeholder="ex: 12345678" />
                  </div>
                  <button
                    type="button"
                    onClick={lookupCUI}
                    disabled={cuiLoading || form.cui.length < 2}
                    className={`mt-5 shrink-0 ${btn.primary}`}
                  >
                    {cuiLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Se cauta...
                      </span>
                    ) : "Cauta firma"}
                  </button>
                </div>
                {cuiError && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {cuiError}
                  </p>
                )}
                {cuiFound && (
                  <p className="flex items-center gap-1.5 text-xs text-blue-600">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Firma a fost identificata
                  </p>
                )}
                <div>
                  <label className={labelCls}>Nume firma</label>
                  <input className={`${inputCls} ${inputErr("companyName")}`} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} onBlur={() => touch("companyName")} placeholder="Denumire firma" />
                  {shouldShowError("companyName") && fieldErrors.companyName && (
                    <p className="mt-1 text-xs text-red-500">Numele firmei este obligatoriu</p>
                  )}
                </div>
              </>
            )}

            {/* Contact section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Contact</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={`${inputCls} ${inputErr("email")}`} value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => touch("email")} placeholder="email@exemplu.ro" />
                  {shouldShowError("email") && fieldErrors.email && form.email.length > 0 && (
                    <p className="mt-1 text-xs text-red-500">Adresa de email nu este validă</p>
                  )}
                  {shouldShowError("email") && fieldErrors.email && form.email.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">Emailul este obligatoriu</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input type="tel" className={`${inputCls} ${inputErr("phone")}`} value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => touch("phone")} placeholder="07XXXXXXXX" />
                  {shouldShowError("phone") && fieldErrors.phone && form.phone.length > 0 && (
                    <p className="mt-1 text-xs text-red-500">Minim 10 cifre (ex: 0720385551)</p>
                  )}
                  {shouldShowError("phone") && fieldErrors.phone && form.phone.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">Telefonul este obligatoriu</p>
                  )}
                </div>
              </div>
            </div>

            {/* License section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 6.75h4.5" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Permis auto</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className={labelCls}>Detii permis auto?</label>
                  <select className={`${selectCls} ${selectErr("hasLicense")}`} value={form.hasLicense} onChange={(e) => { set("hasLicense", e.target.value as "da" | "nu" | ""); touch("hasLicense"); }} onBlur={() => touch("hasLicense")}>
                    <option value="">Selecteaza</option>
                    <option value="da">Da</option>
                    <option value="nu">Nu</option>
                  </select>
                  {shouldShowError("hasLicense") && fieldErrors.hasLicense && (
                    <p className="mt-1 text-xs text-red-500">Selectați dacă dețineți permis</p>
                  )}
                </div>
                {form.hasLicense === "da" && (
                  <div>
                    <label className={labelCls}>Data obtinere permis</label>
                    <DateInput value={form.licenseDate} onChange={(v) => set("licenseDate", v)} />
                  </div>
                )}
              </div>
            </div>

            {/* Location section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Localizare</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className={labelCls}>Judet</label>
                  <select
                    className={`${selectCls} ${selectErr("countyId")}`}
                    value={isBucharest ? BUCHAREST_SENTINEL : form.countyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      touch("countyId");
                      if (val === BUCHAREST_SENTINEL) {
                        set("countyId", BUCHAREST_SENTINEL);
                        set("countyName", "Bucuresti");
                        set("cityId", "");
                        set("cityName", "");
                      } else {
                        const county = deduplicatedCounties.find((c) => String(c.id) === val);
                        set("countyId", val);
                        set("countyName", county?.name || "");
                        set("cityId", "");
                        set("cityName", "");
                      }
                    }}
                    onBlur={() => touch("countyId")}
                  >
                    <option value="">Selecteaza judetul</option>
                    {deduplicatedCounties.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {shouldShowError("countyId") && fieldErrors.countyId && (
                    <p className="mt-1 text-xs text-red-500">Selectați județul</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>
                    {isBucharest || isBucharestSentinel ? "Sector" : "Localitate"}
                  </label>
                  {isBucharest || isBucharestSentinel ? (
                    <select
                      className={`${selectCls} ${selectErr("cityId")}`}
                      value={isBucharest ? form.countyId : ""}
                      onChange={(e) => {
                        const sector = BUCHAREST_SECTORS.find((s) => String(s.countyId) === e.target.value);
                        if (sector) {
                          set("countyId", String(sector.countyId));
                          set("countyName", "Bucuresti");
                          set("cityId", String(sector.cityId));
                          set("cityName", sector.label);
                          touch("cityId");
                        }
                      }}
                      onBlur={() => touch("cityId")}
                    >
                      <option value="">Selecteaza sectorul</option>
                      {BUCHAREST_SECTORS.map((s) => (
                        <option key={s.countyId} value={s.countyId}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                  <select
                    className={`${selectCls} ${selectErr("cityId")}`}
                    value={form.cityId}
                    disabled={!form.countyId}
                    onChange={(e) => {
                      const city = cities.find((c) => String(c.id) === e.target.value);
                      set("cityId", e.target.value);
                      set("cityName", city?.name || "");
                      touch("cityId");
                    }}
                    onBlur={() => touch("cityId")}
                  >
                    <option value="">Selecteaza localitatea</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  )}
                  {shouldShowError("cityId") && fieldErrors.cityId && (
                    <p className="mt-1 text-xs text-red-500">
                      {isBucharest || isBucharestSentinel ? "Selectați sectorul" : "Selectați localitatea"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Continue */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (step1Valid) {
                  next();
                } else {
                  setStep1Attempted(true);
                }
              }}
              className={`${btn.primary} px-8`}
            >
              <span className="flex items-center gap-2">
                Continua
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
            {step1Attempted && !step1Valid && (
              <p className="mt-2 text-xs text-red-500">Completați câmpurile marcate cu roșu</p>
            )}
          </div>
        </div>
      ),
    },

    /* ────── Step 2: DNT Choice ────── */
    {
      title: "Aproape gata",
      content: (
        <DntChoice
          productLabel="CASCO"
          onContinueDirect={() => next()}
          onBack={() => prev()}
          backLabel="Inapoi la datele de contact"
          subtitle="Alege cum dorești să continui"
          directTitle="Completează cererea"
          directDescription="Completezi formularul și vei fi contactat cu oferta personalizată"
          directButtonLabel="Continuă"
        />
      ),
    },

    /* ────── Step 3: Vehicul & Asigurare ────── */
    {
      title: "Vehicul & Asigurare",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Input mode toggle */}
          <div className="flex gap-2">
            {([
              { key: "form" as const, label: "Completeaza formularul" },
              { key: "upload" as const, label: "Ataseaza documente" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => set("inputMode", key)}
                className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  form.inputMode === key
                    ? "border-[#2563EB] bg-blue-50/60 text-blue-700"
                    : "border-gray-200 bg-gray-50/30 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {form.inputMode === "upload" ? (
            /* Drag & drop upload area */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => form.files.length < 2 && fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#2563EB] bg-blue-50/60"
                  : "border-gray-300 bg-gray-50/30 hover:border-blue-300 hover:bg-blue-50/20"
              }`}
            >
              <svg className={`mx-auto h-10 w-10 transition-colors ${dragOver ? "text-[#2563EB]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-gray-700">
                Trage fisierele aici sau <span className="text-[#2563EB] underline">apasa pentru a alege</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">Talon sau carte auto — max. 2 fisiere, JPG/PNG/PDF, max 5 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {form.files.length > 0 && (
                <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {form.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2">
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      <span className="flex-1 text-xs font-medium text-blue-800">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-blue-400 hover:text-red-500 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Manual form fields */
            <>
              {/* VIN section */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div>
                  <label className={labelCls}>Numar inmatriculare</label>
                  <input className={inputCls} value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value.toUpperCase())} placeholder="ex: B 123 ABC" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Serie sasiu (VIN)</label>
                    <input className={inputCls} value={form.vin} onChange={(e) => { set("vin", e.target.value.toUpperCase()); setVinDone(false); setVinError(null); }} placeholder="17 caractere" maxLength={17} />
                  </div>
                  <button
                    type="button"
                    onClick={lookupVIN}
                    disabled={vinLoading || form.vin.length < 17}
                    className={`mt-5 shrink-0 ${btn.primary}`}
                  >
                    {vinLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Se cauta...
                      </span>
                    ) : "Cauta VIN"}
                  </button>
                </div>
                {vinError && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {vinError}
                  </p>
                )}
                {vinDone && !vinError && (
                  <p className="flex items-center gap-1.5 text-xs text-blue-600">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Datele vehiculului au fost completate automat din baza DRPCIV
                  </p>
                )}
              </div>

              {/* Vehicle details card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.747c.464 0 .893-.258 1.108-.66l3.478-6.521A1.125 1.125 0 019.72 6.5h4.56a1.125 1.125 0 011.012.625l3.478 6.521c.215.402.644.66 1.108.66h.747" />
                  </svg>
                  <span className="text-xs font-medium text-gray-500">Detalii vehicul</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Categorie vehicul</label>
                    <select className={selectCls} value={form.categoryId} onChange={(e) => {
                      const cat = categories.find((c) => String(c.id) === e.target.value);
                      set("categoryId", e.target.value);
                      set("categoryName", cat?.name || "");
                      set("subcategoryId", "");
                      set("subcategoryName", "");
                    }}>
                      <option value="">Selecteaza</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Subcategorie (cod EU)</label>
                    <select className={selectCls} value={form.subcategoryId} onChange={(e) => {
                      const sub = subcategories.find((s) => String(s.id) === e.target.value);
                      set("subcategoryId", e.target.value);
                      set("subcategoryName", sub?.name || "");
                    }}>
                      <option value="">Selecteaza</option>
                      {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Marca</label>
                    <select
                      className={selectCls}
                      value={form.makeId}
                      onChange={(e) => {
                        const make = makes.find((m) => String(m.id) === e.target.value);
                        set("makeId", e.target.value);
                        set("makeName", make?.name || "");
                      }}
                    >
                      <option value="">Selecteaza</option>
                      {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Model</label>
                    <input className={inputCls} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="ex: Golf" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Versiune / nivel echipare</label>
                  <input className={inputCls} value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="ex: 1.6 TDI Highline" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>An fabricatie</label>
                    <select className={selectCls} value={form.year} onChange={(e) => set("year", e.target.value)}>
                      <option value="">Selecteaza</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Data primei inmatriculari</label>
                    <DateInput value={form.firstRegistrationDate} onChange={(v) => set("firstRegistrationDate", v)} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Caroserie</label>
                    <select className={selectCls} value={form.bodyType} onChange={(e) => set("bodyType", e.target.value)}>
                      <option value="">Selecteaza</option>
                      {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Transmisie</label>
                    <select className={selectCls} value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
                      <option value="">Selecteaza</option>
                      <option value="automata">Automata</option>
                      <option value="manuala">Manuala</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Motorizare</label>
                    <select className={selectCls} value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
                      <option value="">Selecteaza</option>
                      {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <div>
                    <label className={labelCls}>Km la bord</label>
                    <input type="number" className={inputCls} value={form.km} onChange={(e) => set("km", e.target.value)} placeholder="ex: 50000" />
                  </div>
                  <div>
                    <label className={labelCls}>Nr. locuri</label>
                    <input type="number" className={inputCls} value={form.seats} onChange={(e) => set("seats", e.target.value)} placeholder="ex: 5" />
                  </div>
                  <div>
                    <label className={labelCls}>Cil. (cm³)</label>
                    <input type="number" className={inputCls} value={form.engineCc} onChange={(e) => set("engineCc", e.target.value)} placeholder="ex: 1968" />
                  </div>
                  <div>
                    <label className={labelCls}>Putere (kW)</label>
                    <input type="number" className={inputCls} value={form.engineKw} onChange={(e) => set("engineKw", e.target.value)} placeholder="ex: 110" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Masa maxima (kg)</label>
                    <input type="number" className={inputCls} value={form.maxWeight} onChange={(e) => set("maxWeight", e.target.value)} placeholder="ex: 1850" />
                  </div>
                  <div>
                    <label className={labelCls}>Istoric proprietar</label>
                    <select className={selectCls} value={form.ownerHistory} onChange={(e) => set("ownerHistory", e.target.value)}>
                      <option value="">Selecteaza</option>
                      <option value="primul">Primul proprietar</option>
                      <option value="al_doilea">Al doilea proprietar</option>
                      <option value="al_treilea">Al treilea proprietar sau mai mult</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Utilizare ridesharing / taxi?</label>
                  <select className={selectCls} value={form.ridesharing} onChange={(e) => set("ridesharing", e.target.value)}>
                    <option value="">Selecteaza</option>
                    <option value="nu">Nu</option>
                    <option value="da">Da</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Insurance details card — always shown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xs font-medium text-gray-500">Detalii asigurare</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Asigurat CASCO la</label>
                <select className={selectCls} value={form.currentInsurer} onChange={(e) => set("currentInsurer", e.target.value)}>
                  <option value="">Selecteaza</option>
                  {INSURERS.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Data inceput asigurare</label>
                <DateInput value={form.startDate} onChange={(v) => set("startDate", v)} min={tomorrowDate} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Frecventa plata</label>
                <select className={selectCls} value={form.paymentFrequency} onChange={(e) => set("paymentFrequency", e.target.value)}>
                  <option value="">Selecteaza</option>
                  <option value="integrala">Integrala</option>
                  <option value="semestriala">Semestriala</option>
                  <option value="trimestriala">Trimestriala</option>
                  <option value="lunara">Lunara</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fransiza</label>
                <select className={selectCls} value={form.deductible} onChange={(e) => set("deductible", e.target.value)}>
                  <option value="">Selecteaza</option>
                  <option value="cu_fransiza">Cu fransiza</option>
                  <option value="fara_fransiza">Fara fransiza</option>
                  <option value="ambele">Ambele variante</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Masina noua?</label>
              <select className={selectCls} value={form.isNewCar} onChange={(e) => set("isNewCar", e.target.value)}>
                <option value="">Selecteaza</option>
                <option value="nu">Nu</option>
                <option value="da">Da</option>
              </select>
            </div>

            {form.isNewCar === "da" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className={labelCls}>Valoare factura</label>
                    <input type="number" className={inputCls} value={form.invoiceValue} onChange={(e) => set("invoiceValue", e.target.value)} placeholder="ex: 25000" />
                  </div>
                  <div>
                    <label className={labelCls}>Moneda</label>
                    <select className={selectCls} value={form.invoiceCurrency} onChange={(e) => set("invoiceCurrency", e.target.value)}>
                      <option value="RON">Lei (RON)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                {/* Invoice / contract upload */}
                <div>
                  <label className={labelCls}>Factura / Contract de vanzare-cumparare</label>
                  <input
                    ref={invoiceInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleInvoiceFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => form.invoiceFiles.length < 2 && invoiceInputRef.current?.click()}
                    className={`w-full rounded-xl border-2 border-dashed px-4 py-3 text-center text-sm transition-colors ${
                      form.invoiceFiles.length >= 2
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-300 bg-gray-50/50 text-gray-500 hover:border-[#2563EB]/40 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {form.invoiceFiles.length === 0
                        ? "Incarca factura sau contractul"
                        : `${form.invoiceFiles.length}/2 fisiere incarcate`}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">JPG, PNG sau PDF (max 5 MB fiecare, max 2 fisiere)</p>
                  </button>
                  {form.invoiceFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {form.invoiceFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                          <span className="truncate text-gray-600">{file.name}</span>
                          <button type="button" onClick={() => removeInvoiceFile(i)} className="ml-2 text-red-400 hover:text-red-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={`${btn.secondary} px-8`}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Inapoi
              </span>
            </button>
            <button type="button" onClick={() => step2Valid && next()} disabled={!step2Valid} className={`${btn.primary} px-8`}>
              <span className="flex items-center gap-2">
                Continua
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      ),
    },

    /* ────── Step 3: Confirmare ────── */
    {
      title: "Confirmare",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Contact summary */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Date de contact</span>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div><span className="text-gray-400">Tip:</span> <span className="font-medium text-gray-700">{form.ownerType === "PF" ? "Persoana fizica" : "Persoana juridica"}</span></div>
                <div><span className="text-gray-400">Nume:</span> <span className="font-medium text-gray-700">{form.ownerType === "PF" ? `${form.lastName} ${form.firstName}` : form.companyName}</span></div>
                <div><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-700">{form.email}</span></div>
                <div><span className="text-gray-400">Telefon:</span> <span className="font-medium text-gray-700">{form.phone}</span></div>
                <div><span className="text-gray-400">{form.ownerType === "PF" ? "CNP:" : "CUI:"}</span> <span className="font-medium text-gray-700">{form.ownerType === "PF" ? form.cnp : form.cui}</span></div>
                <div><span className="text-gray-400">Localitate:</span> <span className="font-medium text-gray-700">{form.cityName}, {form.countyName}</span></div>
              </div>
            </div>
          </div>

          {/* Vehicle & insurance summary */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.747c.464 0 .893-.258 1.108-.66l3.478-6.521A1.125 1.125 0 019.72 6.5h4.56a1.125 1.125 0 011.012.625l3.478 6.521c.215.402.644.66 1.108.66h.747" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Vehicul si asigurare</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {form.inputMode === "upload" ? (
                <p className="text-sm text-gray-600">
                  Documente atasate: {form.files.map((f) => f.name).join(", ") || "—"}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {form.plateNumber && <div><span className="text-gray-400">Nr. inmatriculare:</span> <span className="font-medium text-gray-700">{form.plateNumber}</span></div>}
                  {form.categoryName && <div><span className="text-gray-400">Categorie:</span> <span className="font-medium text-gray-700">{form.categoryName}</span></div>}
                  {form.subcategoryName && <div><span className="text-gray-400">Subcategorie:</span> <span className="font-medium text-gray-700">{form.subcategoryName}</span></div>}
                  <div><span className="text-gray-400">Marca:</span> <span className="font-medium text-gray-700">{form.makeName}</span></div>
                  <div><span className="text-gray-400">Model:</span> <span className="font-medium text-gray-700">{form.model}</span></div>
                  <div><span className="text-gray-400">An:</span> <span className="font-medium text-gray-700">{form.year}</span></div>
                  <div><span className="text-gray-400">VIN:</span> <span className="font-medium text-gray-700">{form.vin}</span></div>
                  {form.km && <div><span className="text-gray-400">Km:</span> <span className="font-medium text-gray-700">{form.km}</span></div>}
                  {form.bodyType && <div><span className="text-gray-400">Caroserie:</span> <span className="font-medium text-gray-700">{form.bodyType}</span></div>}
                  {form.fuelType && <div><span className="text-gray-400">Motorizare:</span> <span className="font-medium text-gray-700">{form.fuelType}</span></div>}
                </div>
              )}
              <div className="border-t border-gray-100 pt-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div><span className="text-gray-400">Asigurat la:</span> <span className="font-medium text-gray-700">{form.currentInsurer}</span></div>
                  <div><span className="text-gray-400">Data inceput:</span> <span className="font-medium text-gray-700">{form.startDate}</span></div>
                  <div><span className="text-gray-400">Plata:</span> <span className="font-medium text-gray-700">{form.paymentFrequency}</span></div>
                  <div><span className="text-gray-400">Fransiza:</span> <span className="font-medium text-gray-700">{form.deductible}</span></div>
                  {form.isNewCar === "da" && <div><span className="text-gray-400">Val. factura:</span> <span className="font-medium text-gray-700">{form.invoiceValue} {form.invoiceCurrency}</span></div>}
                  {form.isNewCar === "da" && form.invoiceFiles.length > 0 && <div><span className="text-gray-400">Factura/Contract:</span> <span className="font-medium text-gray-700">{form.invoiceFiles.map((f) => f.name).join(", ")}</span></div>}
                </div>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className={labelCls}>Observatii (optional)</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.observations}
              onChange={(e) => set("observations", e.target.value)}
              placeholder="Informatii suplimentare..."
            />
          </div>

          {/* Consent toggle */}
          <div
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
              form.consent
                ? "border-[#2563EB] bg-blue-50/60"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <button
              type="button"
              onClick={() => set("consent", !form.consent)}
              className="flex shrink-0 items-center"
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                  form.consent ? "border-[#2563EB] bg-[#2563EB]" : "border-gray-300 bg-white"
                }`}
              >
                {form.consent && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
            <span className="text-sm text-gray-700">
              Sunt de acord cu{" "}
              <button
                type="button"
                onClick={() => setShowGdprModal(true)}
                className="font-semibold text-[#2563EB] underline hover:text-blue-700"
              >
                prelucrarea datelor personale
              </button>
              {" "}in vederea primirii ofertei de asigurare CASCO.
            </span>
          </div>

          {/* GDPR details modal */}
          {showGdprModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Politica de prelucrare a datelor personale
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    In conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele dumneavoastra personale
                    sunt prelucrate in scopul ofertarii si emiterii politelor de asigurare.
                  </p>
                  <p>
                    Datele colectate (CNP/CUI, email, date personale, date vehicul) sunt transmise catre
                    societatile de asigurare partenere exclusiv in scopul generarii ofertelor si emiterii
                    politei selectate.
                  </p>
                  <p>
                    Aveti dreptul de acces, rectificare, stergere si portabilitate a datelor, precum si
                    dreptul de a va opune prelucrarii. Pentru exercitarea acestor drepturi, ne puteti
                    contacta la adresa de email indicata pe site.
                  </p>
                </div>
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setShowGdprModal(false)}
                    className={`${btn.primary} px-8`}
                  >
                    Am inteles
                  </button>
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={`${btn.secondary} px-8`}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Inapoi
              </span>
            </button>
            <button type="button" onClick={() => setShowTermsModal(true)} disabled={!step3Valid || submitting} className={`${btn.primary} px-8`}>
              <span className="flex items-center gap-2">
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Se trimite...
                  </>
                ) : (
                  <>
                    Trimite cererea
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Terms & Conditions modal — must agree before submission */}
          <TermsModal
            isOpen={showTermsModal}
            productLabel="CASCO"
            onClose={() => setShowTermsModal(false)}
            onAgree={() => {
              setShowTermsModal(false);
              handleSubmit();
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.747c.464 0 .893-.258 1.108-.66l3.478-6.521A1.125 1.125 0 019.72 6.5h4.56a1.125 1.125 0 011.012.625l3.478 6.521c.215.402.644.66 1.108.66h.747" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Asigurare CASCO</h2>
        <p className="mt-0.5 text-sm text-gray-500">Cerere de oferta pentru asigurarea auto completa</p>
      </div>
      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
    </div>
  );
}
