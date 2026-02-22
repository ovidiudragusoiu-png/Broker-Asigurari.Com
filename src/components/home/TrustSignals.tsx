export default function TrustSignals() {
  const partners = [
    { name: "Allianz Țiriac", id: "allianz" },
    { name: "Groupama", id: "groupama" },
    { name: "Omniasig", id: "omniasig" },
    { name: "Generali", id: "generali" },
    { name: "Asirom", id: "asirom" },
    { name: "Grawe", id: "grawe" },
  ];

  return (
    <section className="border-b border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500 mb-8">
          Comparăm oferte de la cei mai buni asiguratori din România
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale transition-all hover:grayscale-0">
          {partners.map((partner) => (
            <div key={partner.id} className="text-xl md:text-2xl font-bold text-slate-800 flex items-center justify-center">
              {partner.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
