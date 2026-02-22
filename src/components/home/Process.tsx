import { ClipboardEdit, Scale, Shield } from "lucide-react";

export default function Process() {
  const steps = [
    {
      title: "Completezi Datele",
      description: "Alegi asigurarea potrivită și completezi informațiile necesare într-un formular simplificat.",
      icon: ClipboardEdit,
      step: "01",
    },
    {
      title: "Compari Ofertele",
      description: "Afișăm instant prețurile și acoperirile de la toți asiguratorii de top din piață.",
      icon: Scale,
      step: "02",
    },
    {
      title: "Plătești în Siguranță",
      description: "Achiti online prin plată securizată și primești polița imediat pe adresa de email.",
      icon: Shield,
      step: "03",
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Cum funcționează?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Obținerea unei asigurări nu a fost niciodată mai simplă. Urmează 3 pași rapizi.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg">
                <div className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-md">
                  {step.step}
                </div>
                <div className="mt-8 mb-6 text-emerald-600">
                  <Icon className="h-12 w-12" />
                </div>
                <h3 className="mb-4 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
