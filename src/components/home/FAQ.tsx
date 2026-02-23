"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    question: "Cât durează până primesc polița?",
    answer:
      "Polița este emisă instantaneu și trimisă pe email imediat ce plata a fost confirmată. Întregul proces, de la completare până la primirea documentului, durează în medie sub 2 minute.",
  },
  {
    question: "Sunt datele mele în siguranță?",
    answer:
      "Absolut. Folosim cele mai avansate tehnologii de criptare (SSL/TLS) pentru a proteja informațiile tale personale și de plată. Datele tale nu sunt partajate cu terțe părți neautorizate.",
  },
  {
    question: "Pot plăti în rate?",
    answer:
      "Da, oferim opțiunea de plată în rate fără dobândă prin intermediul cardurilor de cumpărături partenere (ex: StarBT, CardAvantaj, etc.), direct în platforma noastră de plată securizată.",
  },
  {
    question: "Ce fac în caz de daună?",
    answer:
      "Echipa noastră de suport îți stă la dispoziție cu consultanță gratuită. Contactează-ne la numărul de telefon afișat sau folosește formularul de contact, iar noi te vom ghida pas cu pas prin procesul de avizare.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[2rem] border border-gray-200/60 bg-white transition-all hover:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-6 text-left sm:p-8"
      >
        <span className="text-lg font-bold text-slate-900 pr-4">{question}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-[#4db8cc] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-slate-500 leading-relaxed sm:px-8 sm:pb-8">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-item",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
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
    <section ref={sectionRef} className="relative bg-[#F2F0E9] py-24 sm:py-32">
      {/* Noise */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]">
        <filter id="faq-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#faq-noise)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#4db8cc]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            FAQ
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Întrebări Frecvente
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Află răspunsurile la cele mai comune întrebări despre platforma și serviciile noastre.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {FAQS.map((faq, index) => (
            <div key={index} className="faq-item">
              <FAQItem question={faq.question} answer={faq.answer} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
