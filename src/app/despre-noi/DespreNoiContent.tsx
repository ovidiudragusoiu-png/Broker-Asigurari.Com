"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Clock,
  HeadphonesIcon,
  Monitor,
  Users,
  FileCheck,
  Globe,
  Landmark,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/* ─── Benefits ─── */
const BENEFITS = [
  {
    icon: Clock,
    title: "Economie de timp & bani",
    description:
      "Compari sute de oferte de la toți asigurătorii într-un singur loc. Fără deplasări, fără cozi, fără presiune comercială.",
    features: [
      "Compari rapid prețurile disponibile",
      "Vezi acoperirile și alegi oferta potrivită pentru tine",
      "Poți finaliza online după ce analizezi opțiunile",
    ],
  },
  {
    icon: HeadphonesIcon,
    title: "Consultanță profesionistă",
    description: "Echipa noastră de experți vă oferă :",
    features: [
      "Suport dedicat prin email și telefon",
      "Asistență completă la dosare de daună",
      "Recomandări obiective în funcție de nevoia dumneavoastră de asigurare",
    ],
  },
  {
    icon: Monitor,
    title: "100% digital",
    description:
      "Întregul proces se desfășoară online. Primești polița pe email imediat după plată, fără documente fizice.",
    features: [
      "Disponibil 24/7, de pe orice dispozitiv",
      "Plată securizată cu cardul",
      "Polița emisă instant pe email",
    ],
  },
];

/* ─── Stats ─── */
const STATS = [
  { icon: Users, value: "11+", label: "Asiguratori parteneri" },
  { icon: FileCheck, value: "10.000+", label: "Polițe emise" },
  { icon: Globe, value: "100%", label: "Proces online" },
  { icon: Landmark, value: "ASF", label: "Autorizare oficială" },
];

/* ─── FAQ ─── */
const FAQS = [
  {
    question: "Cine este Sigur.Ai?",
    answer:
      "Sigur.Ai este o platformă digitală unde poți compara oferte de la toți asigurătorii, alege varianta potrivită și finaliza totul online, în mai puțin de 3 minute. Fără presiune comercială, fără costuri ascunse.",
  },
  {
    question: "Sunteți autorizați de ASF?",
    answer:
      "Da, activăm ca intermediar secundar persoană juridică în parteneriat cu MaxyGo Broker de Asigurare SRL, autorizat ASF.",
  },
  {
    question: "Cum funcționează platforma?",
    answer:
      "Completezi datele necesare, compari ofertele de la toți asigurătorii, alegi varianta potrivită, plătești online cu cardul și primești polița pe email — totul în mai puțin de 3 minute.",
  },
  {
    question: "Cât costă serviciul vostru?",
    answer:
      "Serviciul nostru este complet gratuit pentru clienți. Nu percepem niciun comision suplimentar. Prețurile afișate sunt cele oficiale ale asiguratorilor.",
  },
  {
    question: "Ce tipuri de asigurări oferiți?",
    answer:
      "Oferim asigurări RCA, CASCO, de călătorie, locuință (facultativă + PAD), malpraxis medical, garanții contractuale și răspundere profesională.",
  },
  {
    question: "Cum contactez un consultant?",
    answer:
      "Ne poți contacta prin email la office@sigur.ai (sau bucuresti@broker-asigurari.com) ori prin formularul de contact de pe site. Un consultant te va contacta în cel mai scurt timp.",
  },
];

export default function DespreNoiContent() {
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const philRef = useRef<HTMLElement>(null);
  const benefitsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? FAQS : FAQS.slice(0, 4);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Hero */
      gsap.fromTo(
        ".despre-hero",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" }
      );

      /* Story */
      gsap.fromTo(
        ".despre-story",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: storyRef.current, start: "top 75%", once: true },
        }
      );

      /* Philosophy */
      gsap.fromTo(
        ".despre-phil",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: philRef.current, start: "top 65%", once: true },
        }
      );

      /* Benefits */
      gsap.fromTo(
        ".benefit-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: benefitsRef.current, start: "top 70%", once: true },
        }
      );

      /* FAQ */
      gsap.fromTo(
        ".despre-faq",
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: faqRef.current, start: "top 75%", once: true },
        }
      );

      /* CTA */
      gsap.fromTo(
        ".despre-cta",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: ctaRef.current, start: "top 80%", once: true },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ───── 1. HERO ───── */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pb-28">
        {/* Blobs */}
        <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full bg-orange-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="despre-hero text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl font-heading leading-[1.1]">
            Asigurări online,{" "}
            <span className="text-[#60A5FA]">simplificate</span>
          </h1>
          <p className="despre-hero mx-auto mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed sm:text-xl">
            Ce ar fi dacă asigurările ar putea fi încheiate complet online, fără hârtii, fără deplasări, fără ore pierdute la ghișeu?
          </p>
          <p className="despre-hero mx-auto mt-4 max-w-xl text-base text-slate-400">
            Aceasta a fost întrebarea de la care a pornit totul.
          </p>
        </div>
      </section>

      {/* ───── 2. STORY ───── */}
      <section ref={storyRef} className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="despre-story text-center text-3xl font-extrabold text-[#1E293B] sm:text-4xl font-heading">
            Povestea noastră
          </h2>
          <div className="despre-story mt-8 space-y-5 text-lg text-slate-600 leading-relaxed">
            <p>
              Am fondat <strong className="text-[#1E293B]">Sigur.Ai</strong> din convingerea că nimeni nu ar trebui să piardă timp și energie pentru a-și asigura mașina, locuința sau sănătatea. Procesul tradițional — deplasări la sediu, dosare de hârtie, oferte limitate — era depășit.
            </p>
            <p>
              Am construit o platformă unde poți <strong className="text-[#2563EB]">compara sute de oferte de la toți asigurătorii</strong>, alege varianta potrivită și finaliza totul online, în mai puțin de 3 minute. Fără presiune comercială, fără costuri ascunse.
            </p>
            <p>
              <strong className="text-[#1E293B]">FLETHO LLC SRL</strong> este intermediar secundar persoană juridică și partener al MaxyGo Broker de Asigurare SRL.
            </p>
          </div>
        </div>
      </section>

      {/* ───── 3. PHILOSOPHY ───── */}
      <section ref={philRef} className="relative overflow-hidden bg-[#0D0D12] py-28 sm:py-40">
        {/* Noise */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]">
          <filter id="despre-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#despre-noise)" />
        </svg>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 sm:space-y-12">
            <p className="despre-phil text-lg text-[#FAF8F5]/40 sm:text-xl lg:text-2xl">
              Majoritatea intermediarilor se concentrează pe:{" "}
              <span className="text-[#FAF8F5]/60">vânzare, oferte limitate, comisioane.</span>
            </p>
            <div>
              <p className="despre-phil text-2xl font-bold text-[#FAF8F5] sm:text-3xl lg:text-4xl">
                Noi ne concentrăm pe:
              </p>
              <p className="despre-phil mt-3 sm:mt-4">
                <span className="text-5xl font-light italic text-[#C9A84C] sm:text-6xl lg:text-8xl font-serif">
                  transparență
                </span>
                <span className="text-4xl font-bold text-[#FAF8F5]/80 sm:text-5xl lg:text-7xl">
                  {" "}și{" "}
                </span>
                <span className="text-5xl font-light italic text-[#C9A84C] sm:text-6xl lg:text-8xl font-serif">
                  suport.
                </span>
              </p>
            </div>
            <p className="despre-phil max-w-2xl text-base text-[#FAF8F5]/40 sm:text-lg">
              Îți oferim vizibilitate totală asupra opțiunilor, dincolo de interese comerciale.
              Tu alegi ce e mai bine, noi te susținem necondiționat, mai ales la dosarele de daună.
            </p>
          </div>
        </div>
      </section>

      {/* ───── 4. BENEFITS ───── */}
      <section ref={benefitsRef} className="bg-[#F8F9FA] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-18">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-4xl lg:text-5xl font-heading">
              De ce Sigur.Ai?
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Trei motive pentru care mii de români ne aleg.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 lg:gap-8">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="benefit-card group relative flex flex-col rounded-[2rem] bg-white p-8 sm:p-10 shadow-sm border border-transparent transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#2563EB]/20"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-[#1E293B] transition-colors duration-300 group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB]">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[#1E293B] font-heading">
                    {b.title}
                  </h3>
                  <p className="mb-6 text-sm leading-relaxed text-slate-500">
                    {b.description}
                  </p>
                  <ul className="mt-auto space-y-2">
                    {b.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                        <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {/* Bottom accent bar */}
                  <div className="absolute bottom-0 left-1/2 h-1.5 w-0 -translate-x-1/2 rounded-t-full bg-[#2563EB] transition-all duration-300 group-hover:w-1/3 opacity-0 group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── 5. STATS ───── */}
      <section className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-12 sm:gap-20">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm text-white/80">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── 6. FAQ ───── */}
      <section ref={faqRef} className="bg-[#F8F9FA] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-4xl lg:text-5xl font-heading">
              Întrebări despre Sigur.Ai
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
              Tot ce vrei să știi despre platforma și serviciile noastre.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleFaqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  className={`despre-faq overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                    isOpen ? "border-[#2563EB]/40 shadow-sm" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none"
                  >
                    <span className={`text-sm font-semibold leading-snug ${isOpen ? "text-[#1E293B]" : "text-slate-700"}`}>
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
                      <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {FAQS.length > 4 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setShowAll(!showAll); if (showAll) setOpenIndex(null); }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] transition-colors hover:text-blue-700"
              >
                {showAll ? "Arată mai puține" : `Vezi toate ${FAQS.length} întrebări`}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ───── 7. CTA ───── */}
      <section ref={ctaRef} className="bg-white py-20 sm:py-28">
        <div className="despre-cta mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#1E293B] sm:text-4xl font-heading">
            Ai întrebări? Contactează-ne
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Echipa noastră îți stă la dispoziție pentru orice nelămurire despre asigurări.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="rounded-xl bg-[#2563EB] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
            >
              Contactează-ne
            </Link>
            <Link
              href="/rca"
              className="rounded-xl border-2 border-[#2563EB]/20 px-8 py-4 text-sm font-bold text-[#2563EB] transition hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
            >
              Calculează RCA
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
