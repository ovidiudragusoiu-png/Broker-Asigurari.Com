"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    question: "Ce este asigurarea RCA?",
    answer: "Conform Legii nr. 132/2017, RCA este asigurarea obligatorie de răspundere civilă auto care acoperă prejudiciile produse terților prin accidente de vehicule sau tramvaie. Circulația fără RCA valabil atrage sancțiunile prevăzute de legislația în vigoare.",
  },
  {
    question: "Cum se calculează prețul RCA?",
    answer: "Potrivit Legii nr. 132/2017 și Normei ASF nr. 20/2017, prima RCA este stabilită de fiecare asigurător pe baza propriilor criterii de risc, incluzând clasa bonus-malus, caracteristicile vehiculului, datele proprietarului sau utilizatorului și perioada asigurată.",
  },
  {
    question: "Ce este sistemul Bonus-Malus?",
    answer: "Sistemul bonus-malus este reglementat de Norma ASF nr. 20/2017 și ajustează prima RCA în funcție de istoricul de daune. Clasele bonus pot reduce prima, iar clasele malus o pot majora atunci când există daune plătite pe polițele anterioare.",
  },
  {
    question: "Care e diferența dintre RCA și CASCO?",
    answer: "RCA este obligatorie prin Legea nr. 132/2017 și acoperă răspunderea pentru prejudiciile produse terților. CASCO este o asigurare facultativă pentru propriul vehicul, cu riscuri și condiții stabilite prin contractul ales.",
  },
  {
    question: "Ce fac în caz de accident?",
    answer: "În condițiile Legii nr. 132/2017 și ale Normei ASF nr. 20/2017, pentru accidente cu doar daune materiale se poate folosi constatarea amiabilă dacă sunt îndeplinite condițiile legale. Pentru accidente cu victime sau situații care cer intervenția autorităților, se contactează Poliția sau 112, apoi se deschide dosarul de daună la asigurătorul RCA competent.",
  },
  {
    question: "Ce este decontarea directă?",
    answer: "Decontarea directă este un serviciu opțional prevăzut de legislația RCA. Dacă este inclusă în polița ta și sunt îndeplinite condițiile legale, propriul asigurător RCA gestionează despăgubirea, urmând să recupereze ulterior suma de la asigurătorul persoanei vinovate.",
  },
  {
    question: "Pot încheia asigurarea online?",
    answer: "Da. În cadrul normelor RCA în vigoare, oferta și emiterea poliței pot fi gestionate digital, cu transmiterea documentelor în format electronic. Este important ca datele introduse pentru ofertare și emitere să fie corecte și complete.",
  },
  {
    question: "Cum verific validitatea poliței RCA?",
    answer: "Validitatea RCA se poate verifica în baza de date AIDA, administrată de BAAR, folosind numărul de înmatriculare sau seria de șasiu. Verificarea reflectă informațiile raportate de asigurători conform normelor RCA aplicabile.",
  },
  {
    question: "Pot recupera banii dacă vând mașina?",
    answer: "Da, în condițiile art. 13 din Legea nr. 132/2017, poți solicita încetarea contractului RCA și restituirea părții de primă aferente perioadei rămase, pe baza documentelor cerute de asigurător și dacă sunt îndeplinite condițiile legale.",
  },
  {
    question: "De ce diferă prețurile între asigurători?",
    answer: "Legea nr. 132/2017 stabilește cadrul RCA și limitele minime de răspundere, dar fiecare asigurător își stabilește propriile tarife și criterii de subscriere, în condițiile normelor ASF. De aceea, ofertele pot diferi și merită comparate înainte de alegere.",
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
