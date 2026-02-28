"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-box",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
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
    <section ref={sectionRef} className="bg-[#F8F9FA] px-4 pb-24 pt-8 sm:px-6 sm:pb-32 lg:px-8">
      <div className="cta-box mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-[#2563EB] relative shadow-2xl shadow-blue-500/20">

        {/* Background blurs */}
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/3 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:p-24 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl font-heading mb-4">
            Hai să găsim oferta perfectă
          </h2>
          <p className="mx-auto max-w-xl text-lg text-blue-100 mb-10">
            Calculează prețul asigurării tale în câteva minute sau contactează-ne pentru o ofertă personalizată.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/rca"
              className="flex items-center gap-2 rounded-full bg-[#F97316] px-8 py-4 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition-all hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5"
            >
              Calculator RCA
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/25 hover:-translate-y-0.5"
            >
              Contactează-ne
            </Link>
          </div>

          {/* Quick contact info */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-blue-200">
            <a href="tel:+40720385551" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone className="h-4 w-4" /> 0720 385 551
            </a>
            <a href="mailto:bucuresti@broker-asigurari.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="h-4 w-4" /> bucuresti@broker-asigurari.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
