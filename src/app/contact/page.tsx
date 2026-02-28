"use client";

import { useState } from "react";
import { Phone, Mail, Clock } from "lucide-react";
import { btn } from "@/lib/ui/tokens";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: boolean;
}

const EMPTY_FORM: ContactForm = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  consent: false,
};

const SUBJECTS = [
  "Informații generale",
  "Asigurare RCA",
  "Asigurare CASCO",
  "Asigurare de călătorie",
  "Asigurare locuință",
  "Asigurare malpraxis",
  "Garanții contractuale",
  "Asistență daune",
  "Altele",
];

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ContactForm>(field: K, value: ContactForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.name.length > 0 &&
    form.email.includes("@") &&
    form.phone.length >= 10 &&
    form.subject !== "" &&
    form.message.length > 10 &&
    form.consent;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Eroare la trimiterea mesajului");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimiterea mesajului");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Mesajul a fost trimis cu succes!</h2>
          <p className="mt-1 text-sm text-gray-500">Vă vom răspunde în cel mai scurt timp posibil.</p>
          <button
            type="button"
            onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); }}
            className={`mt-6 ${btn.primary}`}
          >
            Trimite un alt mesaj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Contact</h2>
        <p className="mt-0.5 text-sm text-gray-500">Suntem aici sa te ajutam cu orice intrebare</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left sidebar — contact info */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-gray-900">Informatii de contact</h3>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Telefon</p>
                <p className="text-sm font-semibold text-gray-900">0720 38 55 51</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email</p>
                <p className="text-sm font-semibold text-gray-900 break-all">bucuresti@broker-asigurari.com</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Program</p>
                <p className="text-sm font-semibold text-gray-900">L-V: 09:00 - 18:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Contact form card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Trimite-ne un mesaj</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Nume complet</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ion Popescu"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ion@exemplu.ro"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Telefon</label>
              <input
                type="tel"
                className={inputCls}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="07XXXXXXXX"
              />
            </div>
            <div>
              <label className={labelCls}>Subiect</label>
              <select
                className={selectCls}
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
              >
                <option value="">— Selecteaza subiectul —</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Mesaj</label>
            <textarea
              className={inputCls}
              rows={5}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Scrie mesajul tau aici..."
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-xs text-gray-500">
              Sunt de acord cu prelucrarea datelor personale in vederea procesarii cererii mele de contact.
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
              <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className={`${btn.primary} inline-flex items-center gap-2`}
            >
              {submitting ? "Se trimite..." : "Trimite mesajul"}
              {!submitting && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
