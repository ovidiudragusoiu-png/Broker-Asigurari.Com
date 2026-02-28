"use client";

import { useEffect, useRef } from "react";
import { Car, ShieldCheck, Plane, Home, Stethoscope, FileCheck, ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const PRODUCTS = [
  {
    title: "Asigurare RCA",
    description: "Asigurare obligatorie auto. Compară instant oferte de la 11+ asiguratori și alege cel mai bun preț.",
    icon: Car,
    href: "/rca",
  },
  {
    title: "Asigurare CASCO",
    description: "Protecție completă pentru vehiculul tău — avarii, furt, calamități naturale și multe altele.",
    icon: ShieldCheck,
    href: "/casco",
  },
  {
    title: "Asigurare de Călătorie",
    description: "Călătorește fără griji. Acoperire medicală, bagaje pierdute și anulare călătorie.",
    icon: Plane,
    href: "/travel",
  },
  {
    title: "Asigurare Locuință",
    description: "Protejează-ți casa și bunurile. PAD obligatoriu și asigurări facultative pentru locuință.",
    icon: Home,
    href: "/house",
  },
  {
    title: "Asigurare Malpraxis",
    description: "Asigurare profesională pentru medici și personalul medical. Acoperire completă răspundere civilă.",
    icon: Stethoscope,
    href: "/malpraxis",
  },
  {
    title: "Garanții Contractuale",
    description: "Garanții de bună execuție, participare la licitații și returnare avans pentru companii.",
    icon: FileCheck,
    href: "/garantii",
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".feat-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".feature-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-[#F8F9FA] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="feat-header mx-auto max-w-2xl text-center mb-16 sm:mb-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-4xl lg:text-5xl font-heading">
            Produsele noastre
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Alege tipul de asigurare potrivit pentru tine — rapid, simplu, 100% online.
          </p>
        </div>

        {/* CSS Grid (6 cards — 3 cols on desktop, 2 on tablet) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {PRODUCTS.map((product) => {
            const Icon = product.icon;
            return (
              <div
                key={product.title}
                className="feature-card group relative flex flex-col items-center text-center rounded-[2.5rem] bg-white p-8 sm:p-10 shadow-sm border border-transparent transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#2563EB]/20"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-[#1E293B] transition-colors duration-300 group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB]">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#1E293B] font-heading">{product.title}</h3>
                <p className="mb-8 text-sm leading-relaxed text-slate-500 max-w-xs">{product.description}</p>
                <Link
                  href={product.href}
                  className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-[#1E293B] transition-colors group-hover:text-[#2563EB]"
                >
                  Află mai mult <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                {/* Bottom decorative bar on hover */}
                <div className="absolute bottom-0 left-1/2 h-1.5 w-0 -translate-x-1/2 rounded-t-full bg-[#2563EB] transition-all duration-300 group-hover:w-1/3 opacity-0 group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
