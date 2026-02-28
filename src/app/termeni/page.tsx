import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termeni și Condiții | Broker Asigurari",
  description:
    "Termenii și condițiile de utilizare a platformei Broker-Asigurari.Com. Informații despre drepturile și obligațiile utilizatorilor.",
};

export default function TermeniPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-brand-text mb-8">
        Termeni și Condiții
      </h1>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-600">
        <p>
          <strong>Ultima actualizare:</strong> 28 februarie 2026
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          1. Informații generale
        </h2>
        <p>
          Platforma Broker-Asigurari.Com este operată de <strong>FLETHO LLC SRL</strong>,
          societate de brokeraj în asigurări autorizată de Autoritatea de Supraveghere
          Financiară (ASF), număr autorizare <strong>RAJ506943</strong>.
        </p>
        <p>
          Prin accesarea și utilizarea acestui site, acceptați în totalitate prezentele
          termene și condiții.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          2. Servicii oferite
        </h2>
        <p>
          Broker-Asigurari.Com oferă servicii de intermediere în asigurări, permițând
          utilizatorilor să compare și să achiziționeze polițe de asigurare online
          (RCA, CASCO, călătorie, locuință, PAD, malpraxis, garanții contractuale,
          răspundere profesională).
        </p>
        <p>
          Polițele de asigurare sunt emise de companiile de asigurare partenere.
          FLETHO LLC SRL acționează în calitate de broker de asigurări, oferind
          consultanță imparțială.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          3. Obligațiile utilizatorilor
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Să furnizeze informații corecte și complete la completarea formularelor.
          </li>
          <li>
            Să nu utilizeze platforma în scopuri ilegale sau neautorizate.
          </li>
          <li>
            Să verifice datele introduse înainte de finalizarea comenzii.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          4. Limitarea răspunderii
        </h2>
        <p>
          FLETHO LLC SRL depune toate eforturile pentru a asigura acuratețea
          informațiilor prezentate. Cu toate acestea, nu garantăm că toate informațiile
          sunt complete sau lipsite de erori. Prețurile afișate sunt informative și pot
          varia în funcție de datele furnizate de utilizator.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          5. Proprietate intelectuală
        </h2>
        <p>
          Conținutul site-ului (texte, grafice, logo-uri, imagini) este proprietatea
          FLETHO LLC SRL sau a partenerilor săi și este protejat de legile privind
          drepturile de autor.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          6. Plăți și rambursări
        </h2>
        <p>
          Plățile pentru polițele de asigurare se efectuează online, prin card bancar.
          Condițiile de rambursare sunt cele stabilite de fiecare companie de asigurare
          în parte, conform legislației în vigoare.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          7. Contact
        </h2>
        <p>
          Pentru orice întrebare legată de termenii și condițiile de utilizare,
          ne puteți contacta la:
        </p>
        <ul className="list-none space-y-1">
          <li>Telefon: <strong>0720 38 55 51</strong></li>
          <li>Email: <strong>bucuresti@broker-asigurari.com</strong></li>
        </ul>
      </div>
    </section>
  );
}
