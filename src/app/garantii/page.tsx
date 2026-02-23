"use client";

import { useState, useEffect, useCallback } from "react";
import WizardStepper, { useWizard } from "@/components/shared/WizardStepper";
import { api } from "@/lib/api/client";
import { btn, inputClass } from "@/lib/ui/tokens";

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

// ── Component ───────────────────────────────────────────────────────

export default function GarantiiPage() {
  const { currentStep, next, prev, goTo } = useWizard(2);
  const [form, setForm] = useState<GarantiiForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Nomenclatures
  const [counties, setCounties] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);

  useEffect(() => {
    api.get<SelectOption[]>("/online/address/utils/counties")
      .then((data) => setCounties(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.countyId) { setCities([]); return; }
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

  // ── Validation ──

  const step1Valid =
    form.guaranteeType !== "" &&
    form.companyName.length > 0 &&
    form.cui.length >= 2 &&
    form.countyId !== "" &&
    form.cityId !== "" &&
    form.email.includes("@") &&
    form.phone.length >= 10;

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
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
          <svg className="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Cererea a fost trimisă cu succes!</h2>
        <p className="mt-2 text-gray-500">
          Un consultant vă va contacta în cel mai scurt timp cu oferta de garanții contractuale.
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
      title: "Detalii cerere",
      content: (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Cerere ofertă garanții contractuale</h2>
            <p className="mt-1 text-sm text-gray-500">Completați informațiile necesare pentru a primi oferta de garanții</p>
          </div>

          {/* Guarantee type */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tipul garanției solicitate</label>
            <select className={inputClass} value={form.guaranteeType} onChange={(e) => set("guaranteeType", e.target.value)}>
              <option value="">— Selectează tipul garanției —</option>
              {GUARANTEE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* CUI + lookup */}
          <div className="flex gap-2">
            <input
              className={`flex-1 ${inputClass}`}
              value={form.cui}
              onChange={(e) => { set("cui", e.target.value); setCuiFound(false); setCuiError(null); }}
              placeholder="CUI"
            />
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
          {cuiFound && <p className="text-sm text-sky-600">Firma a fost identificată.</p>}

          {/* Company name */}
          <input className={inputClass} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Denumirea firmei" />

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

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" />
            <input type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Telefon (07XXXXXXXX)" />
          </div>

          {/* Observations */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Observații (opțional)</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.observations}
              onChange={(e) => set("observations", e.target.value)}
              placeholder="Informații suplimentare despre garanția solicitată..."
            />
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
      title: "Confirmare",
      content: (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Verificați și trimiteți</h2>
            <p className="mt-1 text-sm text-gray-500">Verificați datele introduse și trimiteți cererea de ofertă</p>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Detalii cerere</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Tip garanție:</span>
              <span>{form.guaranteeType}</span>
              <span className="font-medium text-gray-700">Firmă:</span>
              <span>{form.companyName}</span>
              <span className="font-medium text-gray-700">CUI:</span>
              <span>{form.cui}</span>
              <span className="font-medium text-gray-700">Localitate:</span>
              <span>{form.cityName}, {form.countyName}</span>
              <span className="font-medium text-gray-700">Email:</span>
              <span>{form.email}</span>
              <span className="font-medium text-gray-700">Telefon:</span>
              <span>{form.phone}</span>
              {form.observations && (
                <>
                  <span className="font-medium text-gray-700">Observații:</span>
                  <span>{form.observations}</span>
                </>
              )}
            </div>
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm text-gray-600">
              Sunt de acord cu prelucrarea datelor personale în vederea primirii ofertei de garanții contractuale.
            </span>
          </label>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button type="button" onClick={prev} className={btn.secondary}>Înapoi</button>
            <button type="button" onClick={handleSubmit} disabled={!step2Valid || submitting} className={btn.primary}>
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
