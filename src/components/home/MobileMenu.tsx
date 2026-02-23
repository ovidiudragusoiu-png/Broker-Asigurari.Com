"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Car, ShieldCheck, Plane, Home, Building2, Stethoscope, Handshake } from "lucide-react";
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
    ],
  },
];

const PLAIN_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/despre-noi", label: "Despre noi" },
  { href: "/contact", label: "Contact" },
];

interface MobileMenuProps {
  scrolled?: boolean;
}

export default function MobileMenu({ scrolled = true }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);

  const close = () => { setOpen(false); setInsuranceOpen(false); };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rounded-xl p-2 transition ${
          scrolled ? "text-slate-600 hover:bg-gray-100" : "text-white hover:bg-white/10"
        }`}
        aria-label={open ? "Închide meniu" : "Deschide meniu"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-2 rounded-[2rem] border border-gray-100 bg-white/95 backdrop-blur-xl shadow-xl">
          <div className="px-4 py-4 space-y-1">
            {/* Asigurări accordion */}
            <button
              type="button"
              onClick={() => setInsuranceOpen(!insuranceOpen)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-600"
            >
              Asigurări
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${insuranceOpen ? "rotate-180" : ""}`} />
            </button>

            {insuranceOpen && (
              <div className="ml-4 space-y-3 pb-2">
                {INSURANCE_GROUPS.map((group) => (
                  <div key={group.heading}>
                    <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.heading}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition hover:bg-sky-50"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Plain links */}
            {PLAIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-600"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
