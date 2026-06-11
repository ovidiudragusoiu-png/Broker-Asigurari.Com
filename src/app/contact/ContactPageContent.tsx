"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  Clock,
  MapPin,
  Shield,
  MessageCircle,
  Facebook,
  Instagram,
  Plus,
  Minus,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { btn } from "@/lib/ui/tokens";
import EmailInput from "@/components/shared/EmailInput";

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

const PHONE_DISPLAY = "0720 38 55 51";
const PHONE_HREF = "tel:+40720385551";
const WHATSAPP_NUMBER = "40775190741";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=Bun%C4%83%20ziua%2C%20a%C8%99%20dori%20s%C4%83%20v%C4%83%20contactez%20privind%20o%20asigurare.`;

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
] as const;

const QUICK_TOPICS: { label: string; subject: (typeof SUBJECTS)[number] }[] = [
  { label: "RCA", subject: "Asigurare RCA" },
  { label: "Daune", subject: "Asistență daune" },
  { label: "Polița mea", subject: "Informații generale" },
  { label: "Altceva", subject: "Altele" },
];

const SUBJECT_HINTS: Partial<Record<(typeof SUBJECTS)[number], string>> = {
  "Asistență daune":
    "Pregătește numărul poliței și data evenimentului — ne ajută să răspundem mai repede.",
  "Asigurare RCA":
    "Poți compara oferte RCA direct online sau ne lași un mesaj și te ghidăm pas cu pas.",
  "Asigurare CASCO":
    "Menționează marca, modelul și anul vehiculului pentru o estimare mai rapidă.",
  "Asigurare de călătorie":
    "Include destinația și perioada călătoriei în mesaj, dacă le știi deja.",
  "Asigurare locuință":
    "Spune-ne dacă este apartament sau casă și în ce localitate se află.",
  "Asigurare malpraxis":
    "Indică profesia și dacă ai nevoie de ofertă pentru persoană fizică sau juridică.",
  "Garanții contractuale":
    "Menționează tipul garanției și valoarea contractului, dacă este cazul.",
  "Informații generale":
    "Pentru polițele deja emise, verifică și în contul tău din portalul Sigur.Ai.",
  Altele: "Descrie pe scurt situația — orice detaliu ne ajută să te direcționăm corect.",
};

const TRUST_BADGES = [
  { icon: Clock, label: "Răspuns în 24h", sub: "în zilele lucrătoare" },
  { icon: MessageCircle, label: "Consiliere gratuită", sub: "fără obligații" },
  { icon: Shield, label: "Date protejate", sub: "conform GDPR" },
];

const FAQS = [
  {
    question: "În cât timp primesc răspuns?",
    answer:
      "Mesajele primite în timpul programului (Luni–Vineri, 09:00–18:00) sunt preluate în aceeași zi lucrătoare. În afara programului, răspundem la prima oră a următoarei zile lucrătoare.",
  },
  {
    question: "Pot trimite un dosar de daună prin formular?",
    answer:
      "Da. Selectează „Asistență daune” și include numărul poliței, data evenimentului și o scurtă descriere. Un consultant te va contacta pentru pașii următori.",
  },
  {
    question: "Cum găsesc polița mea în cont?",
    answer:
      "După autentificare, accesează Dashboard-ul din meniu. Acolo vezi polițele emise, documentele și datele de expirare. Dacă nu găsești polița, scrie-ne și te ajutăm.",
  },
  {
    question: "Pot cumpăra o asigurare direct, fără formular?",
    answer:
      "Da. Pentru RCA, călătorie, locuință, PAD, malpraxis și alte produse poți finaliza online din secțiunile dedicate. Formularul este util când ai nevoie de consultanță personalizată.",
  },
  {
    question: "Ce date ar trebui să includ în mesaj?",
    answer:
      "Nume, telefon, tipul asigurării sau problemei și orice detaliu relevant (număr poliță, dată eveniment, localitate). Cu cât mesajul este mai clar, cu atât răspundem mai rapid.",
  },
];

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const selectCls =
  "w-full appearance-none rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"
      />
    </svg>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  const steps = [
    { title: "Confirmare primită", desc: "Mesajul tău a fost înregistrat în sistemul nostru." },
    { title: "Te contactăm", desc: "Un consultant îți răspunde telefonic sau pe email." },
    { title: "Rezolvăm cererea", desc: "Îți oferim soluția potrivită sau te ghidăm online." },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
        <CheckCircle2 className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Mesajul a fost trimis cu succes!</h2>
      <p className="mt-2 text-base text-gray-500">Îți mulțumim — revenim în cel mai scurt timp posibil.</p>

      <div className="mt-10 space-y-4 text-left">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-sm font-bold text-[#2563EB]">
              {i + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{step.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/rca" className={`${btn.primary} inline-flex items-center gap-2`}>
          Compară RCA online
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/dashboard" className={btn.secondary}>
          Mergi la contul meu
        </Link>
      </div>

      <button type="button" onClick={onReset} className={`mt-6 ${btn.tertiary}`}>
        Trimite un alt mesaj
      </button>
    </div>
  );
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const subjectHint = form.subject
    ? SUBJECT_HINTS[form.subject as (typeof SUBJECTS)[number]]
    : undefined;

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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimiterea mesajului");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessState
        onReset={() => {
          setForm(EMPTY_FORM);
          setSubmitted(false);
        }}
      />
    );
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0F172A] pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.45), transparent), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(249,115,22,0.15), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">Contact</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Hai să vorbim
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
            Suntem aici să te ajutăm cu orice întrebare despre asigurări. Răspundem în aceeași zi lucrătoare.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-600"
            >
              <Phone className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                >
                  <Icon className="h-5 w-5 text-[#F97316]" />
                  <p className="mt-2 text-sm font-semibold text-white">{badge.label}</p>
                  <p className="text-xs text-slate-400">{badge.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact + form — two separate cards, fully below the hero */}
      <section className="bg-[#F8F9FA] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="mb-8 text-center text-sm text-slate-500 sm:text-base">
            Completează formularul sau contactează-ne direct — alegi ce ți se pare mai comod.
          </p>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-8">
            {/* Contact card */}
            <div className="flex flex-col rounded-2xl bg-[#0F172A] p-6 text-slate-300 shadow-lg sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                Informații de contact
              </h2>

              <div className="mt-6 space-y-5">
                <a href={PHONE_HREF} className="group flex items-center gap-3 transition-colors hover:text-white">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F97316] group-hover:bg-white/15">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Telefon</p>
                    <p className="text-sm font-semibold text-white">{PHONE_DISPLAY}</p>
                  </div>
                </a>

                <a
                  href="mailto:office@sigur.ai"
                  className="group flex items-center gap-3 transition-colors hover:text-white"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F97316] group-hover:bg-white/15">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="text-sm font-semibold text-white break-all">office@sigur.ai</p>
                    <p className="text-xs text-slate-400 break-all">bucuresti@broker-asigurari.com</p>
                  </div>
                </a>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F97316]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Program</p>
                    <p className="text-sm font-semibold text-white">Luni – Vineri: 09:00 – 18:00</p>
                  </div>
                </div>
              </div>

              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5d]"
              >
                <MessageCircle className="h-4 w-4" />
                Scrie-ne pe WhatsApp
              </a>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-xs font-medium text-slate-500">Urmărește-ne</p>
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href="https://www.facebook.com/brokerasigurariAi"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a
                    href="https://www.instagram.com/sigur.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a
                    href="https://ro.pinterest.com/wwwSigurAI/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Pinterest"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <PinterestIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#F97316]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">București · serviciu național</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Platformă 100% online — poți cumpăra și gestiona asigurări din orice județ al României.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">Trimite-ne un mesaj</h2>
            <p className="mt-1 text-sm text-gray-500">Completează formularul și revenim cu un răspuns personalizat.</p>

            {/* Quick topic chips */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-gray-500">Subiect rapid</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TOPICS.map((topic) => {
                  const active = form.subject === topic.subject;
                  return (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => set("subject", topic.subject)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "border border-gray-200 bg-gray-50 text-gray-600 hover:border-[#2563EB]/40 hover:text-[#2563EB]"
                      }`}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 space-y-4">
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
                  <EmailInput
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    placeholder="ion@exemplu.ro"
                    className={inputCls}
                    errorClassName={inputCls.replace("border-gray-200", "border-red-300")}
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
                    <option value="">— Selectează subiectul —</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {subjectHint && (
                <div className="flex items-start gap-2 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-3">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                  <p className="text-xs leading-relaxed text-[#1e40af]">{subjectHint}</p>
                </div>
              )}

              <div>
                <label className={labelCls}>Mesaj</label>
                <textarea
                  className={inputCls}
                  rows={5}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Scrie mesajul tău aici..."
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-xs text-gray-500">
                  Sunt de acord cu prelucrarea datelor personale în vederea procesării cererii mele de contact, conform{" "}
                  <Link href="/confidentialitate" className="font-medium text-[#2563EB] hover:underline">
                    politicii de confidențialitate
                  </Link>
                  .
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
                  <svg
                    className="h-4 w-4 shrink-0 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-center pt-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isValid || submitting}
                  className={`${btn.primary} inline-flex items-center gap-2`}
                >
                  {submitting ? "Se trimite..." : "Trimite mesajul"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl bg-[#F8F9FA] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Întrebări frecvente</h2>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Poate găsești răspunsul mai repede aici — altfel, suntem la un mesaj distanță.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={faq.question}
                className={`overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                  isOpen ? "border-[#2563EB]/40 shadow-sm" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none"
                >
                  <span className={`text-sm font-semibold leading-snug ${isOpen ? "text-gray-900" : "text-slate-700"}`}>
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <Minus className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
