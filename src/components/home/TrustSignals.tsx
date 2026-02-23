"use client";

import { useEffect, useRef } from "react";
import { Users, FileCheck, Globe } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TrustSignals() {
  const sectionRef = useRef<HTMLElement>(null);

  const partners = [
    "Allianz Țiriac",
    "Groupama",
    "Omniasig",
    "Generali",
    "Asirom",
    "Grawe",
  ];

  const stats = [
    { icon: Users, value: "6+", label: "Asiguratori parteneri" },
    { icon: FileCheck, value: "1000+", label: "Polițe emise" },
    { icon: Globe, value: "100%", label: "Online" },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".trust-item",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-16 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-10">
          Comparăm oferte de la cei mai buni asiguratori
        </p>

        {/* Partner logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
          {partners.map((name) => (
            <div
              key={name}
              className="trust-item text-lg font-bold text-slate-300 transition-all duration-300 hover:text-slate-700 md:text-xl"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="trust-item flex flex-col items-center rounded-[2rem] border border-gray-100 bg-gray-50/50 p-6 text-center sm:p-8"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4db8cc]/10">
                  <Icon className="h-6 w-6 text-[#4db8cc]" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
