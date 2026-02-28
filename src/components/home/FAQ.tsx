"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    question: "Ce este asigurarea RCA?",
    answer: "Asigurarea obligatorie care acoperă daunele cauzate terților într-un accident auto. Lipsa RCA se sancționează cu amendă de 1.000 lei și reținerea plăcuțelor.",
  },
  {
    question: "Cum se calculează prețul RCA?",
    answer: "Depinde de clasa Bonus-Malus, vârsta șoferului, tipul vehiculului, capacitatea motorului, județul de înmatriculare și perioada de asigurare (1-12 luni).",
  },
  {
    question: "Ce este sistemul Bonus-Malus?",
    answer: "Recompensează șoferii prudenți cu reduceri de până la 50% (clasa B8). Șoferii cu daune pot plăti cu până la 80% mai mult. Clasa se transferă la schimbarea mașinii.",
  },
  {
    question: "Care e diferența dintre RCA și CASCO?",
    answer: "RCA acoperă daunele cauzate altora (obligatorie). CASCO protejează propria mașină contra furtului, grindini, coliziunilor și vandalismului (opțională).",
  },
  {
    question: "Ce fac în caz de accident?",
    answer: "Daune minore: completezi Constatarea Amiabilă. Accidente grave: suni la 112, nu muți vehiculele, aștepți Poliția. Apoi depui cererea de despăgubire.",
  },
  {
    question: "Ce este decontarea directă?",
    answer: "Ceri despăgubirea direct de la propriul asigurător, fără a contacta asiguratorul vinovatului. Disponibilă pentru daune materiale cu RCA valid.",
  },
  {
    question: "Pot încheia asigurarea online?",
    answer: "Da, 100%. Compari oferte de la 11+ asiguratori, completezi datele, plătești cu cardul și primești polița pe email — totul în mai puțin de 3 minute.",
  },
  {
    question: "Cum verific validitatea poliței RCA?",
    answer: "Gratuit pe site-ul BAAR (www.baar.ro) sau baza de date CEDAM a ASF, folosind seria de șasiu sau numărul de înmatriculare.",
  },
  {
    question: "Pot recupera banii dacă vând mașina?",
    answer: "Da, poți solicita restituirea primei neconsumate cu actul de vânzare și dovada radierii. Noul proprietar poate prelua polița existentă.",
  },
  {
    question: "De ce diferă prețurile între asigurători?",
    answer: "Fiecare asigurător stabilește tarife proprii, dar limitele de despăgubire sunt identice. Diferențele pot ajunge la sute de lei — de aceea merită să compari.",
  },
];

const INITIAL_COUNT = 6;

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const visibleFaqs = showAll ? FAQS : FAQS.slice(0, INITIAL_COUNT);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-item",
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power2.out",
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

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="bg-[#F8F9FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E293B] sm:text-4xl lg:text-5xl font-heading">
            Întrebări frecvente
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
            Tot ce trebuie să știi despre asigurări auto.
          </p>
        </div>

        {/* Two-column FAQ grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleFaqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`faq-item overflow-hidden rounded-xl border bg-white transition-all duration-200 ${isOpen ? "border-[#2563EB]/40 shadow-sm" : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
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
                  className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
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

        {/* Show more / less */}
        {FAQS.length > INITIAL_COUNT && (
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
  );
}
