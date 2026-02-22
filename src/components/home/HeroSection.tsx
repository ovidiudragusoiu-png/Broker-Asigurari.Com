import Link from "next/link";
import { Car, Plane, Home, Building2, Stethoscope, ArrowRight } from "lucide-react";

export default function HeroSection() {
  const products = [
    {
      title: "RCA",
      description: "Asigurare auto obligatorie",
      href: "/rca",
      icon: Car,
    },
    {
      title: "Travel",
      description: "Asigurare de călătorie",
      href: "/travel",
      icon: Plane,
    },
    {
      title: "Locuință",
      description: "Asigurare facultativă",
      href: "/house",
      icon: Home,
    },
    {
      title: "PAD",
      description: "Asigurare obligatorie PAD",
      href: "/pad",
      icon: Building2,
    },
    {
      title: "Malpraxis",
      description: "Asigurare profesională",
      href: "/malpraxis",
      icon: Stethoscope,
    },
  ];

  return (
    <section className="bg-slate-900 pb-24 pt-16 sm:pb-32 sm:pt-24 lg:pb-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Asigurările tale, simplu și sigur, într-un singur loc.
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Compară cele mai bune oferte de pe piață și alege asigurarea potrivită pentru tine. Totul 100% online, în mai puțin de 2 minute.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <Link
                key={product.href}
                href={product.href}
                className="group relative flex flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-emerald-500"
              >
                <div className="mb-4 rounded-full bg-emerald-50 p-4 transition-colors group-hover:bg-emerald-100">
                  <Icon className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{product.title}</h3>
                <p className="text-sm text-slate-600 mb-6">{product.description}</p>
                <div className="mt-auto flex items-center text-sm font-semibold text-emerald-600">
                  Calculează acum
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
