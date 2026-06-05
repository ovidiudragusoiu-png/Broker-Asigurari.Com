"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Car, ShieldCheck, Plane, Home, Building2, Stethoscope, Handshake, Scale, User, LogIn, Phone } from "lucide-react";
import { useAuth } from "@/components/portal/AuthProvider";
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

interface MobileMenuProps {
  scrolled?: boolean;
  hideRcaCta?: boolean;
}

export default function MobileMenu({
  scrolled = true,
  hideRcaCta = false,
}: MobileMenuProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);

  const close = () => { setOpen(false); setInsuranceOpen(false); };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rounded-xl p-2 transition ${scrolled ? "text-[#1E293B] hover:bg-slate-50" : "text-[#1E293B] hover:bg-white/50"
          }`}
        aria-label={open ? "Închide meniu" : "Deschide meniu"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="z-layer-menu absolute left-2 right-2 top-full mt-2 max-h-[calc(100dvh-5rem-env(safe-area-inset-top,0px))] overflow-y-auto rounded-[2rem] border border-gray-100 bg-white/95 backdrop-blur-xl shadow-xl">
          <div className="space-y-1 px-4 py-4">
            {/* Phone + RCA CTA */}
            <div className="mb-3 space-y-3 border-b border-gray-100 pb-3">
              <a
                href="tel:+40720385551"
                onClick={close}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB]/5 px-4 py-3.5 text-base font-bold text-[#2563EB] transition hover:bg-[#2563EB]/10"
                aria-label="Sună la 0720 38 55 51"
              >
                <Phone className="h-5 w-5" />
                0720 38 55 51
              </a>
              {!hideRcaCta && (
                <Link
                  href="/rca"
                  onClick={close}
                  className="flex items-center justify-center rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#F97316]/25 transition hover:bg-orange-600"
                >
                  Calculator RCA
                </Link>
              )}
            </div>

            {/* Asigurări accordion */}
            <button
              type="button"
              onClick={() => setInsuranceOpen(!insuranceOpen)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-[#1E293B] transition hover:bg-slate-50 hover:text-[#2563EB]"
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
                          className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition hover:bg-slate-50"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1E293B]">{item.label}</p>
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
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#1E293B] transition hover:bg-slate-50 hover:text-[#2563EB]"
              >
                {link.label}
              </Link>
            ))}

            {/* Auth link */}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <Link
                href={user ? "/dashboard" : "/login"}
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#2563EB] transition hover:bg-[#2563EB]/5"
              >
                {user ? (
                  <>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
                      {(user.firstName?.[0] ?? user.email[0] ?? "U").toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">
                        {user.firstName?.trim() || user.email.split("@")[0]}
                      </span>
                      <span className="block truncate text-xs font-normal text-gray-500">
                        Polițele mele
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Autentificare
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
