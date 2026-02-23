"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-content",
        { y: 40, opacity: 0 },
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#0D1B2A] py-24 sm:py-32">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')",
        }}
      />

      {/* Noise */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]">
        <filter id="cta-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cta-noise)" />
      </svg>

      <div className="cta-content relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
          Protejează-te acum cu{" "}
          <span
            className="italic text-[#4db8cc]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            asigurarea potrivită.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/40">
          Compară oferte de la cei mai buni asiguratori, 100% online, în mai puțin de 2 minute.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/rca"
            className="btn-magnetic group relative overflow-hidden rounded-full bg-[#4db8cc] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#4db8cc]/25 transition-all hover:shadow-xl"
          >
            <span className="relative z-10 flex items-center gap-2">
              Calculează RCA
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/casco"
            className="btn-magnetic rounded-full border-2 border-white/15 px-8 py-4 text-sm font-bold text-white transition-all hover:border-white/30 hover:bg-white/5"
          >
            Cerere CASCO
          </Link>
        </div>
      </div>
    </section>
  );
}
