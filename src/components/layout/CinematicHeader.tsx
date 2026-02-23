"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import DesktopNav from "@/components/layout/DesktopNav";
import MobileMenu from "@/components/home/MobileMenu";

export default function CinematicHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  return (
    <header
      className={`fixed top-4 left-1/2 z-50 w-[94%] max-w-6xl -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
        scrolled
          ? "rounded-[2rem] bg-white/80 shadow-lg shadow-black/5 backdrop-blur-xl border border-gray-200/60"
          : "rounded-[2rem] bg-white/5 backdrop-blur-sm border border-white/10"
      }`}
    >
      <nav className="flex items-center justify-between px-5 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-2 text-lg font-extrabold transition-colors duration-300 ${
            scrolled ? "text-slate-900" : "text-white"
          }`}
        >
          <ShieldCheck
            className={`h-6 w-6 transition-colors duration-300 ${
              scrolled ? "text-[#4db8cc]" : "text-white"
            }`}
          />
          <span>
            Broker
            <span
              className={`transition-colors duration-300 ${
                scrolled ? "text-[#4db8cc]" : "text-white/90"
              }`}
            >
              Asigurari
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <DesktopNav scrolled={scrolled} />

        {/* Mobile menu */}
        <MobileMenu scrolled={scrolled} />

        {/* CTA button */}
        <Link
          href="/rca"
          className={`btn-magnetic hidden items-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 md:inline-flex ${
            scrolled
              ? "bg-[#4db8cc] text-white hover:bg-[#3a9db0] shadow-sm"
              : "bg-white/15 text-white backdrop-blur-sm border border-white/25 hover:bg-white/25"
          }`}
        >
          Calculează RCA
        </Link>
      </nav>
    </header>
  );
}
