"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Phone } from "lucide-react";
import DesktopNav from "@/components/layout/DesktopNav";
import MobileMenu from "@/components/home/MobileMenu";
import HeaderAuthButton from "@/components/portal/HeaderAuthButton";

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
      className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ${scrolled
        ? "bg-white/90 shadow-sm backdrop-blur-md border-b border-gray-100"
        : "bg-transparent"
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        {/* Logo + PNRR */}
        <div className="flex flex-col">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-extrabold transition-opacity hover:opacity-90"
          >
            <ShieldCheck
              className="h-7 w-7 text-[#2563EB]"
            />
            <span className="text-[#2563EB]">
              Sigur
              <span className="text-[#F97316]">
                .Ai
              </span>
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-slate-400 ml-2 tracking-wide">Fii sigur. Fii asigurat.</span>
          </Link>
          <Image src="/images/pnrr/banner-pnrr.jpg" alt="Finanțat de Uniunea Europeană NextGenerationEU — Guvernul României — PNRR" width={400} height={33} className="object-contain mt-1" />
        </div>

        {/* Desktop nav */}
        <DesktopNav scrolled={scrolled} />

        {/* Mobile menu */}
        <MobileMenu scrolled={scrolled} />

        {/* CTA button placeholder + actions */}
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="tel:+40720385551"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-[#2563EB]"
          >
            <Phone className="h-4 w-4" />
            0720 38 55 51
          </a>
          <HeaderAuthButton />
          <Link
            href="/rca"
            className="rounded-full bg-[#F97316] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#F97316]/25 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#F97316]/40"
          >
            Calculator RCA
          </Link>
        </div>
      </nav>
    </header>
  );
}
