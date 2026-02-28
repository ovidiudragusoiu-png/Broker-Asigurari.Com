"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Car, ShieldCheck, Plane, Home, Building2, Stethoscope, Handshake, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DropdownItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface DropdownGroup {
  heading: string;
  items: DropdownItem[];
}

const INSURANCE_GROUPS: DropdownGroup[] = [
  {
    heading: "Auto",
    items: [
      { href: "/rca", label: "RCA", description: "Asigurare auto obligatorie", icon: Car },
      { href: "/casco", label: "CASCO", description: "Asigurare auto completă", icon: ShieldCheck },
    ],
  },
  {
    heading: "Altele",
    items: [
      { href: "/travel", label: "Travel", description: "Asigurare de călătorie", icon: Plane },
      { href: "/house", label: "Locuință", description: "Asigurare facultativă locuință", icon: Home },
      { href: "/pad", label: "PAD", description: "Asigurare obligatorie locuință", icon: Building2 },
      { href: "/malpraxis", label: "Malpraxis", description: "Asigurare profesională medici", icon: Stethoscope },
      { href: "/garantii", label: "Garanții", description: "Garanții contractuale firme", icon: Handshake },
      { href: "/raspundere-profesionala", label: "Răspundere profesională", description: "Asigurare de răspundere civilă profesională", icon: Scale },
    ],
  },
];

const PLAIN_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/despre-noi", label: "Despre noi" },
  { href: "/contact", label: "Contact" },
];

export { INSURANCE_GROUPS, PLAIN_LINKS };

interface DesktopNavProps {
  scrolled?: boolean;
}

export default function DesktopNav({ scrolled = true }: DesktopNavProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const linkColor = scrolled
    ? "text-slate-600 hover:text-[#2563EB]"
    : "text-[#1E293B]/80 hover:text-[#2563EB]";

  return (
    <div className="hidden items-center gap-7 md:flex">
      {/* Asigurări dropdown */}
      <div
        className="relative"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <button
          type="button"
          className={`flex items-center gap-1 text-sm font-semibold transition-colors duration-300 ${linkColor}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Asigurări
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown panel */}
        <div
          className={`absolute left-1/2 top-full z-50 mt-4 -translate-x-1/2 transition-all duration-200 ${open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
            }`}
        >
          <div className="grid w-[520px] grid-cols-2 gap-6 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl">
            {INSURANCE_GROUPS.map((group) => (
              <div key={group.heading}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.heading}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] transition-colors group-hover:bg-[#2563EB]/20">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1E293B]">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plain links */}
      {PLAIN_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm font-semibold transition-colors duration-300 lift-hover ${linkColor}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
