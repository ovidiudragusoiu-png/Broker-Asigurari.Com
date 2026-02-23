"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Car, ShieldCheck, Plane, Home, Stethoscope, Handshake, ArrowRight } from "lucide-react";
import { gsap } from "gsap";

const products = [
  { title: "RCA", href: "/rca", icon: Car },
  { title: "CASCO", href: "/casco", icon: ShieldCheck },
  { title: "Locuință", href: "/house", icon: Home },
  { title: "Travel", href: "/travel", icon: Plane },
  { title: "Malpraxis", href: "/malpraxis", icon: Stethoscope },
  { title: "Garanții", href: "/garantii", icon: Handshake },
];

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".hero-line-1",
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 }
      )
        .fromTo(
          ".hero-line-2",
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2 },
          "-=0.6"
        )
        .fromTo(
          ".hero-sub",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          "-=0.6"
        )
        .fromTo(
          ".hero-cta",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          ".hero-product",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 },
          "-=0.3"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      id="cinematic-hero"
      className="relative flex min-h-[100dvh] items-end overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/80 to-[#0D1B2A]/30" />

      {/* Noise overlay */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]">
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" />
      </svg>

      {/* Content — bottom-left aligned */}
      <div className="relative z-10 w-full pb-16 pt-32 sm:pb-24 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Hero headline — sans bold + massive serif italic */}
            <h1>
              <span className="hero-line-1 block text-xl font-bold tracking-tight text-white/80 sm:text-2xl lg:text-3xl">
                Protecția ta este
              </span>
              <span
                className="hero-line-2 mt-2 block text-5xl font-bold italic tracking-tight text-white sm:text-7xl lg:text-8xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Certitudinea.
              </span>
            </h1>

            <p className="hero-sub mt-6 max-w-xl text-lg text-white/60 sm:text-xl">
              Compară cele mai bune oferte de pe piață și alege asigurarea potrivită pentru tine.
              Totul 100% online, în mai puțin de 2 minute.
            </p>

            <div className="hero-cta mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/rca"
                className="btn-magnetic group relative overflow-hidden rounded-full bg-[#4db8cc] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#4db8cc]/25 transition-all hover:shadow-xl hover:shadow-[#4db8cc]/30"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Calculează RCA
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/casco"
                className="btn-magnetic rounded-full border-2 border-white/20 px-8 py-4 text-sm font-bold text-white transition-all hover:border-white/40 hover:bg-white/5"
              >
                Cerere CASCO
              </Link>
            </div>
          </div>

          {/* Product quick-links — subtle pill bar */}
          <div className="mt-16 flex flex-wrap gap-3 sm:mt-20">
            {products.map((product) => {
              const Icon = product.icon;
              return (
                <Link
                  key={product.href}
                  href={product.href}
                  className="hero-product group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-[#4db8cc] transition-colors group-hover:text-white" />
                  {product.title}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
