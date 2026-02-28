"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    step: "01",
    title: "Completezi Datele",
    description:
      "Alegi tipul de asigurare și completezi datele vehiculului sau personale. Procesul durează sub 2 minute — fără documente fizice.",
    animation: "helix",
  },
  {
    step: "02",
    title: "Compari Ofertele",
    description:
      "Algoritmul nostru scanează instant toate ofertele disponibile de la asigurătorii parteneri și le ordonează după preț și acoperire.",
    animation: "scanner",
  },
  {
    step: "03",
    title: "Plătești în Siguranță",
    description:
      "Alegi oferta potrivită, achiti securizat online și primești polița pe email imediat. Acoperirea începe din ziua aleasă de tine.",
    animation: "pulse",
  },
];

/* SVG Animation 1: Rotating geometric motif */
function HelixAnimation() {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32 sm:h-40 sm:w-40 animate-[spin_20s_linear_infinite]">
      {[0, 60, 120].map((rotation) => (
        <ellipse
          key={rotation}
          cx="100"
          cy="100"
          rx="80"
          ry="30"
          fill="none"
          stroke="#C9A84C"
          strokeWidth="1"
          opacity="0.4"
          transform={`rotate(${rotation} 100 100)`}
        />
      ))}
      <circle cx="100" cy="100" r="6" fill="#C9A84C" opacity="0.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 100 + 60 * Math.cos(rad);
        const y = 100 + 60 * Math.sin(rad);
        return (
          <circle
            key={angle}
            cx={x}
            cy={y}
            r="2"
            fill="#0D0D12"
            opacity="0.4"
          />
        );
      })}
    </svg>
  );
}

/* SVG Animation 2: Scanning laser line */
function ScannerAnimation() {
  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32 sm:h-40 sm:w-40">
      {/* Grid of dots */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={30 + col * 22}
            cy={30 + row * 22}
            r="2"
            fill="#0D0D12"
            opacity="0.25"
          />
        ))
      )}
      {/* Scanning line */}
      <line
        x1="20"
        y1="0"
        x2="20"
        y2="200"
        stroke="#C9A84C"
        strokeWidth="1.5"
        opacity="0.6"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="180 0"
          dur="3s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="20"
        y1="0"
        x2="20"
        y2="200"
        stroke="#C9A84C"
        strokeWidth="8"
        opacity="0.1"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="180 0"
          dur="3s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}

/* SVG Animation 3: Pulsing waveform (EKG-style) */
function PulseAnimation() {
  return (
    <svg viewBox="0 0 200 100" className="h-20 w-40 sm:h-24 sm:w-48">
      <path
        d="M0,50 L30,50 L40,50 L50,20 L60,80 L70,30 L80,70 L90,50 L120,50 L130,50 L140,25 L150,75 L160,35 L170,65 L180,50 L200,50"
        fill="none"
        stroke="#C9A84C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="400"
        strokeDashoffset="400"
        opacity="0.8"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="400"
          to="0"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M0,50 L30,50 L40,50 L50,20 L60,80 L70,30 L80,70 L90,50 L120,50 L130,50 L140,25 L150,75 L160,35 L170,65 L180,50 L200,50"
        fill="none"
        stroke="#C9A84C"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="400"
        strokeDashoffset="400"
        opacity="0.15"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="400"
          to="0"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

const ANIMATIONS = [HelixAnimation, ScannerAnimation, PulseAnimation];

export default function Protocol() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".protocol-card");

      cards.forEach((card, i) => {
        if (i < cards.length - 1) {
          ScrollTrigger.create({
            trigger: card,
            start: "top top",
            endTrigger: cards[i + 1],
            end: "top top",
            pin: true,
            pinSpacing: false,
            onUpdate: (self) => {
              const progress = self.progress;
              gsap.set(card, {
                scale: 1 - progress * 0.08,
                filter: `blur(${progress * 12}px)`,
                opacity: 1 - progress * 0.4,
              });
            },
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#0D0D12] font-mono"
          >
            Protocol
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#2A2A35] sm:text-4xl font-sans">
            Cum funcționează?
          </h2>
        </div>
      </div>

      {STEPS.map((step, i) => {
        const AnimComponent = ANIMATIONS[i];
        return (
          <div
            key={step.step}
            className="protocol-card relative flex min-h-screen items-center"
            style={{ zIndex: i + 1 }}
          >
            <div className="absolute inset-0 border-t border-gray-100 bg-[#FAF8F5]">
              {/* Noise */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]">
                <filter id={`proto-noise-${i}`}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter={`url(#proto-noise-${i})`} />
              </svg>
            </div>

            <div className="relative mx-auto flex w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:gap-20 lg:px-8">
              {/* Text */}
              <div className="flex-1">
                <span
                  className="mb-4 block text-5xl font-bold text-[#0D0D12]/20 sm:text-6xl font-mono"
                >
                  {step.step}
                </span>
                <h3 className="mb-4 text-2xl font-extrabold text-[#2A2A35] sm:text-3xl lg:text-4xl font-sans">
                  {step.title}
                </h3>
                <p className="max-w-md text-base text-slate-500 leading-relaxed sm:text-lg">
                  {step.description}
                </p>
              </div>

              {/* Animation */}
              <div className="hidden flex-shrink-0 items-center justify-center rounded-[3rem] border border-gray-200/60 bg-white/80 p-12 shadow-sm md:flex">
                <AnimComponent />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
