"use client";

import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    quote:
      "Am obținut polița RCA în mai puțin de 2 minute. Interfața e foarte intuitivă, iar prețurile au fost cele mai bune pe care le-am găsit.",
    name: "Andrei M.",
    type: "Asigurare RCA",
  },
  {
    quote:
      "Echipa de suport m-a ajutat cu procesul de daună de la A la Z. Recomand cu încredere oricui are nevoie de asigurare.",
    name: "Maria P.",
    type: "Asigurare CASCO",
  },
  {
    quote:
      "Am comparat ofertele de la toți asigurătorii într-un singur loc. Foarte convenabil și am economisit bani față de prețul vechi.",
    name: "Cristian D.",
    type: "Asigurare Travel",
  },
  {
    quote:
      "Serviciu excelent! Am primit polița instant pe email după plată. Nu mai pierd timp la ghișeu sau la agenți.",
    name: "Elena S.",
    type: "Asigurare Locuință",
  },
];

export default function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.8;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".testimonial-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
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
      {/* Noise */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]">
        <filter id="test-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#test-noise)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#4db8cc]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Testimoniale
          </p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ce spun clienții noștri
          </h2>
          <p className="mt-4 text-lg text-white/40">
            Mii de clienți mulțumiți ne-au ales pentru simplitate și transparență.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="btn-magnetic absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-3 text-white backdrop-blur-sm transition hover:bg-white/10 lg:block"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="testimonial-card w-[85%] flex-shrink-0 snap-center rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm sm:w-[45%] lg:w-[30%]"
              >
                <Quote className="mb-5 h-8 w-8 text-[#4db8cc]/40" />
                <p className="mb-6 text-white/70 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-bold text-white">{t.name}</p>
                  <p className="text-sm text-[#4db8cc]/70">{t.type}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll("right")}
            className="btn-magnetic absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-3 text-white backdrop-blur-sm transition hover:bg-white/10 lg:block"
            aria-label="Următor"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-white/20 lg:hidden">
          ← Glisați pentru mai multe →
        </p>
      </div>
    </section>
  );
}
