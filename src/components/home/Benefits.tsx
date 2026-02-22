import { Smartphone, Zap, ShieldCheck, HeadphonesIcon } from "lucide-react";

export default function Benefits() {
  const benefits = [
    {
      title: "100% Online",
      description: "Fără hârtii inutile, direct de pe telefon sau laptop. Tot procesul este digital.",
      icon: Smartphone,
    },
    {
      title: "Comparație Rapidă",
      description: "Afișăm cele mai bune oferte de la toți asiguratorii în mai puțin de 2 minute.",
      icon: Zap,
    },
    {
      title: "Plată Securizată",
      description: "Tranzacțiile sunt criptate și complet sigure. Primești polița instant pe email.",
      icon: ShieldCheck,
    },
    {
      title: "Suport Dedicat",
      description: "Oferim asistență la daună și consultanță gratuită pentru orice nelămurire.",
      icon: HeadphonesIcon,
    },
  ];

  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            De ce să ne alegi pe noi?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Misiunea noastră este să facem asigurările simple, transparente și accesibile tuturor.
          </p>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{benefit.title}</h3>
                <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
