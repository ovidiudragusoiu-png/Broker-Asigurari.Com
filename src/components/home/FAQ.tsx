export default function FAQ() {
  const faqs = [
    {
      question: "Cât durează până primesc polița?",
      answer: "Polița este emisă instantaneu și trimisă pe email imediat ce plata a fost confirmată. Întregul proces, de la completare până la primirea documentului, durează în medie sub 2 minute.",
    },
    {
      question: "Sunt datele mele în siguranță?",
      answer: "Absolut. Folosim cele mai avansate tehnologii de criptare (SSL/TLS) pentru a proteja informațiile tale personale și de plată. Datele tale nu sunt partajate cu terțe părți neautorizate.",
    },
    {
      question: "Pot plăti în rate?",
      answer: "Da, oferim opțiunea de plată în rate fără dobândă prin intermediul cardurilor de cumpărături partenere (ex: StarBT, CardAvantaj, etc.), direct în platforma noastră de plată securizată.",
    },
    {
      question: "Ce fac în caz de daună?",
      answer: "Echipa noastră de suport îți stă la dispoziție cu consultanță gratuită. Contactează-ne la numărul de telefon afișat sau folosește formularul de contact, iar noi te vom ghida pas cu pas prin procesul de avizare.",
    },
  ];

  return (
    <section className="bg-slate-900 py-24 sm:py-32 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Întrebări Frecvente
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Află răspunsurile la cele mai comune întrebări despre platforma și serviciile noastre.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-2xl bg-slate-800 p-8 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <span className="text-emerald-500 mr-3">Q.</span>
                {faq.question}
              </h3>
              <p className="text-slate-300 leading-relaxed ml-7">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
