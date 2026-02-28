"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Philosophy() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Word-by-word reveal for the main statement
      gsap.fromTo(
        ".phil-line",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 65%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0D0D12] py-28 sm:py-40"
    >
      {/* Parallax texture */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.07]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2500')",
        }}
      />

      {/* Noise */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]">
        <filter id="phil-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#phil-noise)" />
      </svg>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Contrasting statements */}
        <div className="space-y-8 sm:space-y-12">
          <p className="phil-line text-lg text-[#FAF8F5]/40 sm:text-xl lg:text-2xl font-sans">
            Majoritatea brokerilor se concentrează pe:{" "}
            <span className="text-[#FAF8F5]/60">vânzare, oferte limitate, comisioane.</span>
          </p>

          <div>
            <p className="phil-line text-2xl font-bold text-[#FAF8F5] sm:text-3xl lg:text-4xl font-sans">
              Noi ne concentrăm pe:
            </p>
            <p className="phil-line mt-3 sm:mt-4">
              <span
                className="text-5xl font-light italic text-[#C9A84C] sm:text-6xl lg:text-8xl font-serif"
              >
                transparență
              </span>
              <span className="text-4xl font-bold text-[#FAF8F5]/80 sm:text-5xl lg:text-7xl font-sans">
                {" "}și{" "}
              </span>
              <span
                className="text-5xl font-light italic text-[#C9A84C] sm:text-6xl lg:text-8xl font-serif"
              >
                suport.
              </span>
            </p>
          </div>

          <p className="phil-line max-w-2xl text-base text-[#FAF8F5]/40 sm:text-lg font-sans">
            Îți oferim vizibilitate totală asupra opțiunilor, dincolo de interese comerciale.
            Tu alegi ce e mai bine, noi te susținem necondiționat, mai ales la dosarele de daună.
          </p>
        </div>
      </div>
    </section>
  );
}
