"use client";

import { useState } from "react";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { btn, inputClass } from "@/lib/ui/tokens";

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
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
          <svg className="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Mesajul a fost trimis cu succes!</h2>
        <p className="mt-2 text-gray-500">
          Vă vom răspunde în cel mai scurt timp posibil.
        </p>
        <button
          type="button"
          onClick={() => { setForm(EMPTY_FORM); setSubmitted(false); }}
          className={`mt-8 ${btn.primary}`}
        >
          Trimite un alt mesaj
        </button>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Contact
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Suntem aici să te ajutăm. Trimite-ne un mesaj și îți vom răspunde cât de curând posibil.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Contact info sidebar */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Informații de contact</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Nu ezita să ne contactezi pentru orice întrebare legată de asigurări. Echipa noastră de specialiști îți stă la dispoziție.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Telefon</p>
                    <p className="text-sm text-slate-600">031 123 4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Email</p>
                    <p className="text-sm text-slate-600">contact@brokerasigurari.ro</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Adresă</p>
                    <p className="text-sm text-slate-600">București, România</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Program</p>
                    <p className="text-sm text-slate-600">Luni - Vineri: 09:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Trimite-ne un mesaj</h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Nume complet"
                    />
                    <input
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="Email"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input
                      type="tel"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="Telefon (07XXXXXXXX)"
                    />
                    <select
                      className={inputClass}
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                    >
                      <option value="">— Selectează subiectul —</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    className={inputClass}
                    rows={5}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Mesajul tău..."
                  />

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-gray-600">
                      Sunt de acord cu prelucrarea datelor personale în vederea procesării cererii mele de contact.
                    </span>
                  </label>

                  {error && (
                    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isValid || submitting}
                    className={btn.primary}
                  >
                    {submitting ? "Se trimite..." : "Trimite mesajul"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
