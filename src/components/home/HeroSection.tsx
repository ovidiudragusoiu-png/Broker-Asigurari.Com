"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car, ShieldCheck, Plane, Home, Stethoscope, FileCheck, ArrowRight } from "lucide-react";
import { gsap } from "gsap";

interface Category {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  description: string;
  features: string[];
  badge?: string;
}

const CATEGORIES: Category[] = [
  {
    title: "RCA",
    href: "/rca",
    icon: Car,
    active: true,
    description: "Asigurare obligatorie de răspundere civilă auto. Compară oferte de la 11+ asigurători.",
    features: ["Carte Verde inclusă", "Validare în timp real", "Polița emisă instant"],
    badge: "Cel mai căutat",
  },
  {
    title: "CASCO",
    href: "/casco",
    icon: ShieldCheck,
    active: false,
    description: "Protecție completă pentru mașina ta, indiferent de cine produce accidentul.",
    features: ["Avarii, furturi, calamități", "Asistență rutieră 24/7", "Mașină de înlocuire"],
  },
  {
    title: "Călătorie",
    href: "/travel",
    icon: Plane,
    active: false,
    description: "Asigurare de călătorie pentru vacanțe și deplasări în Europa sau mondial.",
    features: ["Cheltuieli medicale", "Anulare călătorie", "Bagaje și documente"],
  },
  {
    title: "Locuință",
    href: "/house",
    icon: Home,
    active: false,
    description: "Protejează-ți locuința împotriva incendiilor, inundațiilor și altor riscuri.",
    features: ["Facultativă + PAD combo", "Conținut și structură", "Asistență la domiciliu"],
  },
  {
    title: "Malpraxis",
    href: "/malpraxis",
    icon: Stethoscope,
    active: false,
    description: "Asigurare de răspundere profesională pentru cadrele medicale.",
    features: ["Conform legislației române", "Medici și stomatologi", "Emitere rapidă online"],
  },
  {
    title: "Garanții",
    href: "/garantii",
    icon: FileCheck,
    active: false,
    description: "Scrisori de garanție pentru participare la licitații și bună execuție.",
    features: ["Licitații publice", "Bună execuție", "Returnare avans"],
  },
];

const STATS = [
  { value: "50.000+", label: "Oferte comparate" },
  { value: "11+", label: "Asiguratori parteneri" },
  { value: "100%", label: "Online, fără deplasări" },
];

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCategory = (title: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHoveredCategory(title);
  };

  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setHoveredCategory(null), 300);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".hero-text",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 }
      )
        .fromTo(
          ".hero-image",
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: 1 },
          "-=0.6"
        )
        .fromTo(
          ".hero-floating",
          { y: 20, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          ".hero-categories",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.2"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-[#F8F9FA] pt-32 pb-8">
      {/* Background blobs */}
      <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/50 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] translate-x-1/3 -translate-y-1/2 rounded-full bg-orange-100/50 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">

          {/* Left Column */}
          <div className="max-w-2xl">
            <h1 className="hero-text text-5xl font-extrabold tracking-tight text-[#1E293B] sm:text-6xl lg:text-7xl font-heading leading-[1.1]">
              Partenerul tău <br />
              de încredere <br />
              în <span className="text-[#2563EB]">asigurări</span>
            </h1>

            <p className="hero-text mt-6 text-lg text-slate-500 max-w-lg leading-relaxed">
              Compară sute de oferte de la 11+ asiguratori, personalizează polița și obține cel mai bun preț în doar câteva minute.
            </p>

            {/* CTA Buttons */}
            <div className="hero-text mt-8 sm:mt-10 flex flex-wrap gap-3">
              <Link
                href="/rca"
                className="flex items-center gap-2 rounded-full bg-[#2563EB] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5"
              >
                Calculator RCA
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-bold text-[#1E293B] shadow-sm transition-all hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5"
              >
                Contactează-ne
              </Link>
            </div>
          </div>

          {/* Right Column: Dark holographic car card */}
          <div className="relative mt-8 lg:mt-0">
            <div className="hero-image relative overflow-hidden rounded-[2.5rem] shadow-2xl shadow-blue-900/30 bg-[#060D1F]">
              {/* Car image */}
              <div className="relative w-full overflow-hidden aspect-[16/10]">
                <Image
                  src="/images/hero-car.png"
                  alt="Asigurare auto"
                  width={800}
                  height={500}
                  priority
                  className="absolute top-0 left-0 w-full h-[135%] object-cover object-top"
                />
              </div>
              {/* Stats bar */}
              <div className="hero-floating grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#060D1F]/90 backdrop-blur-sm">
                {STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center py-5 px-3 text-center">
                    <span className="text-xl font-extrabold text-white sm:text-2xl">{stat.value}</span>
                    <span className="mt-1 text-[11px] font-medium text-slate-400 leading-tight">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Strip */}
        <div className="hero-categories mt-16 border-t border-gray-200/60 pt-8 pb-4">
          <div className="relative flex items-center rounded-full border border-gray-100 bg-white p-2 shadow-sm">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isHovered = hoveredCategory === cat.title;
              return (
                <div
                  key={cat.title}
                  className="relative flex-1"
                  onMouseEnter={() => showCategory(cat.title)}
                  onMouseLeave={scheduleHide}
                >
                  <Link
                    href={cat.href}
                    className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      cat.active
                        ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[#1E293B]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${cat.active ? "text-white" : "text-slate-400"}`} />
                    {cat.title}
                  </Link>

                  {/* Hover preview card */}
                  {isHovered && (
                    <div
                      className="absolute bottom-full left-1/2 z-50 mb-3 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/80"
                      style={{ animation: "fadeInUp 0.15s ease-out" }}
                      onMouseEnter={() => showCategory(cat.title)}
                      onMouseLeave={scheduleHide}
                    >
                      {/* Card header */}
                      <div className={`flex items-center gap-3 px-4 py-3.5 ${cat.active ? "bg-orange-50" : "bg-blue-50"}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cat.active ? "bg-orange-100" : "bg-blue-100"}`}>
                          <Icon className={`h-5 w-5 ${cat.active ? "text-orange-600" : "text-blue-600"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{cat.title}</p>
                            {cat.badge && (
                              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                {cat.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description + features */}
                      <div className="px-4 py-3">
                        <p className="text-xs leading-relaxed text-gray-500">{cat.description}</p>
                        <ul className="mt-2.5 space-y-1.5">
                          {cat.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                              <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA */}
                      <div className="border-t border-gray-100 px-4 py-3">
                        <Link
                          href={cat.href}
                          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                            cat.active
                              ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          Calculează oferta
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {/* Arrow pointer */}
                      <div className="absolute bottom-[-6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-100 bg-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </section>
  );
}
