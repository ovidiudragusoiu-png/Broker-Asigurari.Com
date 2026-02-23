"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ============================
   Card 1 — Diagnostic Shuffler
   ============================ */
const SHUFFLER_ITEMS = [
  { label: "Analiză RCA", color: "#4db8cc" },
  { label: "Comparație Prețuri", color: "#3a9db0" },
  { label: "Ofertă Personalizată", color: "#2a7c8e" },
];

function DiagnosticShuffler() {
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOrder((prev) => {
        const next = [...prev];
        const last = next.pop()!;
        next.unshift(last);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-40 w-full">
      {order.map((itemIdx, stackPos) => {
        const item = SHUFFLER_ITEMS[itemIdx];
        return (
          <div
            key={item.label}
            className="absolute left-4 right-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-md transition-all duration-500"
            style={{
              top: `${stackPos * 16}px`,
              zIndex: 3 - stackPos,
              transform: `scale(${1 - stackPos * 0.04})`,
              opacity: 1 - stackPos * 0.15,
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
            </div>
            <div className="mt-2 h-2 w-3/4 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: stackPos === 0 ? "85%" : `${60 - stackPos * 15}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==============================
   Card 2 — Telemetry Typewriter
   ============================== */
const FEED_MESSAGES = [
  ">> Procesare oferte de la 6 asiguratori...",
  ">> Oferta Allianz Țiriac: 245 RON / 6 luni",
  ">> Oferta Groupama: 268 RON / 6 luni",
  ">> Oferta Generali: 251 RON / 6 luni",
  ">> Cea mai bună ofertă găsită: 245 RON",
  ">> Status: Polița pregătită pentru emitere",
];

function TelemetryTypewriter() {
  const [currentMsg, setCurrentMsg] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (currentMsg >= FEED_MESSAGES.length) {
      const timeout = setTimeout(() => {
        setLines([]);
        setCurrentMsg(0);
        setDisplayed("");
      }, 3000);
      return () => clearTimeout(timeout);
    }

    const msg = FEED_MESSAGES[currentMsg];
    let charIdx = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      charIdx++;
      setDisplayed(msg.slice(0, charIdx));
      if (charIdx >= msg.length) {
        clearInterval(interval);
        setTimeout(() => {
          setLines((prev) => [...prev.slice(-3), msg]);
          setCurrentMsg((prev) => prev + 1);
        }, 400);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentMsg]);

  return (
    <div className="rounded-xl bg-[#0D1B2A] p-4 font-mono text-xs leading-relaxed text-green-400/80">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse-dot" />
        <span className="text-[10px] uppercase tracking-widest text-green-400/60">
          Live Feed
        </span>
      </div>
      <div className="space-y-1 min-h-[80px]">
        {lines.map((line, i) => (
          <div key={i} className="text-green-400/50">{line}</div>
        ))}
        {currentMsg < FEED_MESSAGES.length && (
          <div>
            {displayed}
            <span className="animate-blink text-[#4db8cc]">▋</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================
   Card 3 — Cursor Protocol Scheduler
   ====================================== */
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function CursorScheduler() {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -20, y: -20 });
  const [clicking, setClicking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const runAnimation = useCallback(() => {
    setActiveDay(null);
    setSaved(false);
    setShowCursor(true);
    setCursorPos({ x: -10, y: 30 });

    const targetDay = Math.floor(Math.random() * 5); // weekdays only

    // Move to target day
    setTimeout(() => {
      const dayX = 16 + targetDay * 38;
      setCursorPos({ x: dayX, y: 50 });
    }, 600);

    // Click the day
    setTimeout(() => {
      setClicking(true);
      setTimeout(() => {
        setClicking(false);
        setActiveDay(targetDay);
      }, 150);
    }, 1400);

    // Move to save button
    setTimeout(() => {
      setCursorPos({ x: 100, y: 100 });
    }, 2200);

    // Click save
    setTimeout(() => {
      setClicking(true);
      setTimeout(() => {
        setClicking(false);
        setSaved(true);
      }, 150);
    }, 2800);

    // Fade out cursor
    setTimeout(() => {
      setShowCursor(false);
    }, 3400);
  }, []);

  useEffect(() => {
    runAnimation();
    const interval = setInterval(runAnimation, 5000);
    return () => clearInterval(interval);
  }, [runAnimation]);

  return (
    <div ref={gridRef} className="relative overflow-hidden">
      {/* Week grid */}
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 ${
              activeDay === i
                ? "bg-[#4db8cc] text-white scale-95"
                : "bg-gray-100 text-slate-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`w-full rounded-xl py-2 text-xs font-bold transition-all duration-200 ${
          saved
            ? "bg-green-500 text-white"
            : "bg-gray-100 text-slate-600"
        }`}
      >
        {saved ? "Salvat!" : "Salvează"}
      </button>

      {/* Animated cursor */}
      {showCursor && (
        <svg
          className="pointer-events-none absolute transition-all duration-500 ease-out"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: clicking ? "scale(0.85)" : "scale(1)",
          }}
          width="18"
          height="22"
          viewBox="0 0 18 22"
          fill="none"
        >
          <path
            d="M1 1L1 16.5L5.5 12L10 19L13 17.5L8.5 10.5L14 10L1 1Z"
            fill="#0D1B2A"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  );
}

/* =================
   Features Section
   ================= */
const FEATURES = [
  {
    title: "Analiză Inteligentă",
    description: "Algoritmul nostru scanează ofertele de la toți asigurătorii și selectează cele mai avantajoase opțiuni pentru profilul tău.",
    Component: DiagnosticShuffler,
  },
  {
    title: "Procesare în Timp Real",
    description: "Monitorizăm și comparăm prețurile instant. Primești oferta cea mai bună în secunde, nu în zile.",
    Component: TelemetryTypewriter,
  },
  {
    title: "Programare Flexibilă",
    description: "Alege ziua și ora care ți se potrivesc pentru consultanță gratuită. Adaptat programului tău.",
    Component: CursorScheduler,
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".feature-card",
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
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
    <section ref={sectionRef} className="relative bg-[#F2F0E9] py-24 sm:py-32">
      {/* Noise */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]">
        <filter id="feat-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#feat-noise)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#4db8cc]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Funcționalități
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Instrumente construite pentru{" "}
            <span
              className="italic text-[#4db8cc]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              certitudine.
            </span>
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="feature-card group rounded-[2rem] border border-gray-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 sm:p-8"
            >
              <div className="mb-6 overflow-hidden rounded-2xl bg-gray-50 p-4">
                <feat.Component />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{feat.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
