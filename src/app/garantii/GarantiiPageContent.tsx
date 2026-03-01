"use client";

import { useState, useEffect, useCallback } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import { api } from "@/lib/api/client";
import { btn } from "@/lib/ui/tokens";
import DntChoice from "@/components/rca/DntChoice";
import TermsModal from "@/components/rca/TermsModal";

// ── Types ───────────────────────────────────────────────────────────

interface SelectOption {
  id: number;
  name: string;
}

interface GarantiiForm {
  guaranteeType: string;
  companyName: string;
  cui: string;
  countyId: string;
  countyName: string;
  cityId: string;
  cityName: string;
  email: string;
  phone: string;
  observations: string;
  consent: boolean;
}

const EMPTY_FORM: GarantiiForm = {
  guaranteeType: "",
  companyName: "",
  cui: "",
  countyId: "",
  countyName: "",
  cityId: "",
  cityName: "",
  email: "",
  phone: "",
  observations: "",
  consent: false,
};

const GUARANTEE_TYPES = [
  "Garanție de participare la licitații",
  "Garanție de bună execuție",
  "Garanție de rețineri succesive / deblocare cash",
  "Garanție post-execuție / mentenanță / vicii",
  "Garanție pentru obținere / retur avans",
  "Garanție de bună conduită",
  "Garanție de bună plată / plata la termen",
  "Garanție pentru livrarea produselor / prestarea serviciilor",
  "Garanție pentru obținerea de autorizații",
  "Garanție pentru oficialitățile publice",
  "Garanții financiare",
];

/* Bucharest sectors */
const BUCHAREST_SECTORS = [
  { label: "Sector 1", countyId: 14, cityId: 1598 },
  { label: "Sector 2", countyId: 5,  cityId: 1599 },
  { label: "Sector 3", countyId: 9,  cityId: 1600 },
  { label: "Sector 4", countyId: 22, cityId: 1601 },
  { label: "Sector 5", countyId: 39, cityId: 1602 },
  { label: "Sector 6", countyId: 8,  cityId: 1603 },
];
const BUCHAREST_COUNTY_IDS = new Set(BUCHAREST_SECTORS.map((s) => String(s.countyId)));
const BUCHAREST_SENTINEL = "-999";

const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

// ── Component ───────────────────────────────────────────────────────

export default function GarantiiPage() {
  const { currentStep, next, prev, goTo } = useWizard(3);
  const [form, setForm] = useState<GarantiiForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Inline validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step1Attempted, setStep1Attempted] = useState(false);
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const shouldShowError = (field: string) => touched[field] || step1Attempted;

  // Nomenclatures
  const [counties, setCounties] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);

  const isBucharest = BUCHAREST_COUNTY_IDS.has(form.countyId);
  const isBucharestSentinel = form.countyId === BUCHAREST_SENTINEL;

  const deduplicatedCounties = (() => {
    const filtered = counties.filter((c) => !BUCHAREST_COUNTY_IDS.has(String(c.id)));
    filtered.push({ id: Number(BUCHAREST_SENTINEL), name: "Bucuresti" });
    filtered.sort((a, b) => a.name.localeCompare(b.name, "ro"));
    return filtered;
  })();

  useEffect(() => {
    api.get<SelectOption[]>("/online/address/utils/counties")
      .then((data) => setCounties(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.countyId || form.countyId === BUCHAREST_SENTINEL) { setCities([]); return; }
    api.get<SelectOption[]>(`/online/address/utils/cities?countyId=${form.countyId}`)
      .then((data) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCities([]));
  }, [form.countyId]);

  const set = useCallback(<K extends keyof GarantiiForm>(field: K, value: GarantiiForm[K]) => {
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

  // ── Validation ──

  const step1Valid =
    form.guaranteeType !== "" &&
    form.companyName.length > 0 &&
    form.cui.length >= 2 &&
    form.countyId !== "" &&
    form.countyId !== BUCHAREST_SENTINEL &&
    form.cityId !== "" &&
    form.email.includes("@") &&
    form.phone.length >= 10;

  const fieldErrors = {
    guaranteeType: form.guaranteeType === "",
    companyName: form.companyName.length === 0,
    cui: form.cui.length < 2,
    countyId: form.countyId === "" || form.countyId === BUCHAREST_SENTINEL,
    cityId: form.cityId === "",
    email: !form.email.includes("@"),
    phone: form.phone.length < 10,
  };

  const errBorder = "!border-red-400";
  const inputErr = (field: string) =>
    shouldShowError(field) && fieldErrors[field as keyof typeof fieldErrors] ? errBorder : "";
  const selectErr = (field: string) =>
    shouldShowError(field) && fieldErrors[field as keyof typeof fieldErrors] ? errBorder : "";

  const step2Valid = form.consent;

  // ── Submit ──

  const handleSubmit = async () => {
    if (!step2Valid) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/garantii/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Cererea a fost trimisă cu succes!</h2>
        <p className="mt-2 text-gray-500">
          Un consultant vă va contacta în cel mai scurt timp cu oferta de garanții contractuale.
        </p>
        <button
          type="button"
          onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); goTo(0); }}
          className={`mt-8 ${btn.primary}`}
        >
          <span className="flex items-center gap-2">
            Trimite o nouă cerere
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </button>
      </section>
    );
  }

  // ── Steps ──

  const steps = [
    {
      title: "Detalii cerere",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Main card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">

            {/* Guarantee type section */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Tipul garanției</span>
              </div>
              <select className={`${selectCls} ${selectErr("guaranteeType")}`} value={form.guaranteeType} onChange={(e) => { set("guaranteeType", e.target.value); touch("guaranteeType"); }} onBlur={() => touch("guaranteeType")}>
                <option value="">Selectează tipul garanției</option>
                {GUARANTEE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {shouldShowError("guaranteeType") && fieldErrors.guaranteeType && (
                <p className="mt-1 text-xs text-red-500">Selectați tipul garanției</p>
              )}
            </div>

            {/* Company section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Date firmă</span>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className={`flex-1 ${inputCls} ${inputErr("cui")}`}
                    value={form.cui}
                    onChange={(e) => { set("cui", e.target.value); setCuiFound(false); setCuiError(null); }}
                    onBlur={() => touch("cui")}
                    placeholder="CUI"
                  />
                  <button
                    type="button"
                    onClick={lookupCUI}
                    disabled={cuiLoading || form.cui.length < 2}
                    className={btn.primary}
                  >
                    {cuiLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Se caută...
                      </span>
                    ) : "Caută firma"}
                  </button>
                </div>
                {cuiError && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {cuiError}
                  </div>
                )}
                {cuiFound && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Firma a fost identificată.
                  </div>
                )}
                <div>
                  <label className={labelCls}>Denumirea firmei</label>
                  <input className={`${inputCls} ${inputErr("companyName")}`} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} onBlur={() => touch("companyName")} placeholder="Denumirea firmei" />
                  {shouldShowError("companyName") && fieldErrors.companyName && (
                    <p className="mt-1 text-xs text-red-500">Numele firmei este obligatoriu</p>
                  )}
                </div>
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
                  <label className={labelCls}>Județ</label>
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
                    <option value="">Selectează județul</option>
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
                      <option value="">Selectează sectorul</option>
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
                      <option value="">Selectează localitatea</option>
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

            {/* Observations */}
            <div className="border-t border-gray-100 pt-4">
              <label className={labelCls}>Observații (opțional)</label>
              <textarea
                className={inputCls}
                rows={3}
                value={form.observations}
                onChange={(e) => set("observations", e.target.value)}
                placeholder="Informații suplimentare despre garanția solicitată..."
              />
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
                Continuă
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

    /* ────── Step 2: DNT ────── */
    {
      title: "Aproape gata",
      content: (
        <DntChoice
          productLabel="Garanții"
          onContinueDirect={() => next()}
          onBack={() => prev()}
          backLabel="Inapoi la detalii cerere"
          subtitle="Alege cum dorești să continui"
          directTitle="Completează cererea"
          directDescription="Completezi formularul și vei fi contactat cu oferta personalizată"
          directButtonLabel="Continuă"
        />
      ),
    },

    /* ────── Step 3: Confirmare ────── */
    {
      title: "Confirmare",
      content: (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Summary card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Rezumatul cererii</span>
            </div>

            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400">Tip garanție:</span> <span className="font-medium text-gray-700">{form.guaranteeType}</span></div>
              <div><span className="text-gray-400">Firmă:</span> <span className="font-medium text-gray-700">{form.companyName}</span></div>
              <div><span className="text-gray-400">CUI:</span> <span className="font-medium text-gray-700">{form.cui}</span></div>
              <div><span className="text-gray-400">Localitate:</span> <span className="font-medium text-gray-700">{form.cityName}, {form.countyName}</span></div>
              <div><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-700">{form.email}</span></div>
              <div><span className="text-gray-400">Telefon:</span> <span className="font-medium text-gray-700">{form.phone}</span></div>
              {form.observations && (
                <div><span className="text-gray-400">Observații:</span> <span className="font-medium text-gray-700">{form.observations}</span></div>
              )}
            </div>
          </div>

          {/* Consent with GDPR link */}
          <button
            type="button"
            onClick={() => set("consent", !form.consent)}
            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
              form.consent
                ? "border-[#2563EB] bg-blue-50/60"
                : "border-gray-200 bg-gray-50/30 hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
              form.consent ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-gray-300"
            }`}>
              {form.consent && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700">
              Sunt de acord cu{" "}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setShowGdprModal(true); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setShowGdprModal(true); } }}
                className="font-semibold text-[#2563EB] underline hover:text-blue-700"
              >
                prelucrarea datelor personale
              </span>
              {" "}în vederea primirii ofertei de garanții contractuale.
            </span>
          </button>

          {submitError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {submitError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={`${btn.secondary} px-6`}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Înapoi
              </span>
            </button>
            <button type="button" onClick={() => setShowTermsModal(true)} disabled={!step2Valid || submitting} className={`${btn.primary} px-6`}>
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* GDPR Modal */}
          {showGdprModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Prelucrarea datelor personale</h3>
                </div>
                <div className="max-h-64 overflow-y-auto text-sm text-gray-600 space-y-2">
                  <p>În conformitate cu Regulamentul (UE) 2016/679 (GDPR), datele personale furnizate vor fi prelucrate de Broker Asigurări în scopul:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Generării ofertei de garanții contractuale solicitate</li>
                    <li>Contactării dumneavoastră cu oferta personalizată</li>
                    <li>Îndeplinirii obligațiilor legale în domeniul asigurărilor</li>
                  </ul>
                  <p>Datele sunt stocate în siguranță și nu vor fi partajate cu terți neautorizați. Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor.</p>
                  <p>Pentru exercitarea drepturilor, contactați-ne la: <strong>bucuresti@broker-asigurari.com</strong></p>
                </div>
                <button type="button" onClick={() => setShowGdprModal(false)} className={`mt-4 w-full ${btn.primary}`}>Am înțeles</button>
              </div>
            </div>
          )}

          {/* Terms Modal */}
          <TermsModal
            isOpen={showTermsModal}
            productLabel="Garanții Contractuale"
            onClose={() => setShowTermsModal(false)}
            onAgree={() => { setShowTermsModal(false); handleSubmit(); }}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 pt-24 pb-8">
      {/* Page header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Garanții Contractuale</h1>
        <p className="mt-1 text-sm text-gray-500">Cerere de ofertă pentru garanții contractuale</p>
      </div>

      <WizardStepper steps={steps} currentStep={currentStep} onStepChange={goTo} />
    </section>
  );
}
