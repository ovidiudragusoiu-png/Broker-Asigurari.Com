"use client";

import { useEffect, useRef } from "react";
import { Star, Quote } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REVIEWS = [
  {
    name: "Andrei Popescu",
    role: "Antreprenor, București",
    text: "Am comparat ofertele RCA în mai puțin de 3 minute și am economisit peste 200 lei față de ce plăteam anul trecut. Super rapid și simplu!",
  },
  {
    name: "Maria Ionescu",
    role: "Manager marketing, Cluj-Napoca",
    text: "Echipa a fost extrem de profesionistă. M-au ghidat prin tot procesul de asigurare CASCO și am găsit exact polița potrivită pentru mine.",
  },
  {
    name: "Alexandru Dumitrescu",
    role: "Medic, Timișoara",
    text: "Am făcut asigurarea de malpraxis complet online, fără bătăi de cap. Recomand cu încredere oricui caută un broker serios și transparent.",
  },
  {
    name: "Elena Constantinescu",
    role: "Avocat, Iași",
    text: "Am încheiat asigurarea de călătorie în câteva minute, chiar înainte de plecare. Prețurile erau mult mai bune decât la ghișeu. Foarte mulțumită!",
  },
  {
    name: "Cristian Marin",
    role: "Inginer IT, Brașov",
    text: "Transparență totală și zero costuri ascunse. Am comparat 8 oferte RCA și am ales cea mai avantajoasă. Voi reveni cu siguranță anul viitor.",
  },
  {
    name: "Diana Radu",
    role: "Profesor, Constanța",
    text: "Am asigurat locuința online în mai puțin de 5 minute. Suportul a fost excelent când am avut întrebări despre acoperire. Recomand!",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Reviews() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".review-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
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
    <section ref={sectionRef} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-14 text-center sm:mb-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-4xl lg:text-5xl font-heading">
            Ce spun clienții noștri
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
            Feedback real de la persoane care au ales să-și facă asigurarea prin noi.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review, i) => (
            <div
              key={i}
              className="review-card flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Avatar & Info */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] font-bold text-sm">
                  {getInitials(review.name)}
                </div>
                <div>
                  <h4 className="font-bold text-[#1E293B] font-heading text-sm">{review.name}</h4>
                  <p className="text-xs text-slate-500">{review.role}</p>
                </div>
              </div>

              {/* Review Text & Stars */}
              <Quote className="mb-2 h-4 w-4 text-slate-200" />
              <p className="flex-1 text-sm leading-relaxed text-slate-600">
                {review.text}
              </p>
              <div className="mt-4 flex items-center gap-1">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-[#F97316] text-[#F97316]" />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
