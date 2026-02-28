import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Eye, Zap, HeadphonesIcon, Users, FileCheck, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Despre noi | Broker Asigurari — Cine suntem",
  description:
    "Aflați povestea Broker Asigurari, misiunea noastră de a simplifica asigurările online și valorile care ne ghidează în fiecare zi.",
};

const VALUES = [
  {
    icon: Eye,
    title: "Transparență",
    description: "Afișăm toate costurile și condițiile clar, fără clauze ascunse. Comparăm ofertele obiectiv pentru a te ajuta să faci alegerea corectă.",
  },
  {
    icon: Zap,
    title: "Simplitate",
    description: "Am transformat un proces complicat într-o experiență digitală simplă. Obții polița în mai puțin de 2 minute, 100% online.",
  },
  {
    icon: ShieldCheck,
    title: "Siguranță",
    description: "Datele tale sunt protejate cu cele mai avansate tehnologii de criptare. Tranzacțiile sunt complet securizate.",
  },
  {
    icon: HeadphonesIcon,
    title: "Suport dedicat",
    description: "Echipa noastră te asistă la fiecare pas — de la alegerea poliței potrivite până la procesul de daună.",
  },
];

const STATS = [
  { icon: Users, value: "11+", label: "Asiguratori parteneri" },
  { icon: FileCheck, value: "10.000+", label: "Polițe emise" },
  { icon: Globe, value: "100%", label: "Proces online" },
];

export default function DespreNoiPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Despre noi
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Misiunea noastră este să facem asigurările simple, transparente și accesibile tuturor românilor.
          </p>
        </div>
      </section>

      {/* Cine suntem */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Cine suntem</h2>
            <div className="mt-6 space-y-4 text-lg text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">Broker Asigurari</strong> este o platformă digitală de brokeraj de asigurări,
                autorizată de Autoritatea de Supraveghere Financiară (ASF). Conectăm clienții cu cei mai buni asiguratori
                din România pentru a oferi cele mai competitive prețuri și cea mai bună acoperire.
              </p>
              <p>
                Credem că procesul de achiziție al unei asigurări nu trebuie să fie complicat.
                De aceea, am construit o platformă unde poți compara, alege și cumpăra asigurarea potrivită
                în mai puțin de 2 minute, complet online, de pe orice dispozitiv.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valorile noastre */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Valorile noastre
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]/10 text-[#2563EB]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{value.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-12 sm:gap-20">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm text-white/80">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Ai întrebări? Contactează-ne
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Echipa noastră îți stă la dispoziție pentru orice nelămurire despre asigurări.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="rounded-xl bg-[#2563EB] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
            >
              Contactează-ne
            </Link>
            <Link
              href="/rca"
              className="rounded-xl border-2 border-[#2563EB]/20 px-8 py-4 text-sm font-bold text-[#2563EB] transition hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
            >
              Calculează RCA
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
