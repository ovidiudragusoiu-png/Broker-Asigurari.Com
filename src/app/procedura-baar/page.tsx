import Link from "next/link";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Procedura BAAR — Asigurați cu risc ridicat | Sigur.Ai",
  description:
    "Informații despre procedura BAAR pentru asigurații RCA cu risc ridicat: condiții de eligibilitate, documente necesare și pașii de urmat.",
  path: "/procedura-baar",
});

export default function ProceduraBaarPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-brand-text mb-4">
        Procedura BAAR – Asigurați RCA cu risc ridicat
      </h1>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed">
        Informațiile de mai jos sunt prezentate în baza procedurii oficiale publicate de
        Biroul Asigurătorilor de Autovehicule din România (BAAR). Pentru textul integral
        și actualizări, consultați{" "}
        <a
          href="https://www.baar.ro/asigurati-cu-risc-ridicat/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2563EB] hover:underline"
        >
          baar.ro/asigurati-cu-risc-ridicat
        </a>
        .
      </p>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-600">
        <p>
          <strong>Cadru legal:</strong> Politicile și procedurile BAAR pentru gestionarea
          asigurărilor RCA aplicabile asiguratului cu risc ridicat sunt avizate de ASF
          (aviz nr. 121/19.04.2024 și actualizări ulterioare), în conformitate cu Legea
          nr. 132/2017 și Norma ASF nr. 20/2017.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Rolul BAAR
        </h2>
        <p>
          BAAR <strong>nu este asigurător, companie de brokeraj sau alt intermediar de
          asigurări</strong> și, prin urmare, <strong>nu emite polițe de asigurare</strong>.
          BAAR alocă un asigurător RCA către asiguratul cu risc ridicat. Solicitările
          privind emiterea polițelor, data de început a valabilității, perioade mai mici
          de un an, plata primei în rate, acoperirea teritorială extinsă sau alte clauze
          contractuale se adresează în continuare asigurătorilor RCA sau intermediarilor
          de asigurări.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Când vă încadrați în categoria de risc ridicat
        </h2>
        <p>Sunteți încadrat ca asigurat cu risc ridicat dacă îndepliniți cumulativ:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Aveți cel puțin <strong>3 oferte RCA valabile</strong>, primite de la
            asigurători diferiți.
          </li>
          <li>
            Ofertele sunt calculate pentru <strong>12 luni</strong>, reprezentând prima
            totală (prima netă + cheltuieli de distribie), <strong>fără decontare
            directă</strong> și <strong>fără clauze sau acoperiri suplimentare</strong>.
          </li>
          <li>
            Toate primele totale din oferte sunt, la data emiterii, mai mari decât:{" "}
            <strong>tariful de referință × factorul N × coeficientul clasei
            bonus-malus</strong>.
          </li>
        </ul>
        <p>
          Puteți solicita alocarea unui asigurător RCA prin BAAR doar dacă primele totale
          ofertate de cel puțin 3 asigurători pentru 12 luni sunt cu{" "}
          <strong>cel puțin 36% mai mari</strong> decât tariful de referință aferent
          segmentului de risc. Majorarea se raportează la tariful de referință publicat
          de ASF, nu la prima plătită pe polița anterioară.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Prima recomandată (solicitări din 01.07.2025)
        </h2>
        <p>
          Pentru solicitările înregistrate în platforma electronică începând cu
          01.07.2025, prima recomandată se determină astfel:
        </p>
        <p className="font-mono text-xs bg-slate-100 p-3 rounded-lg text-slate-700">
          Pr = {"{"}TR × N + [(PO1 + PO2 + PO3) : 3] × 64%{"}"} : 2
        </p>
        <p>unde:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Pr</strong> = prima recomandată;
          </li>
          <li>
            <strong>TR</strong> = tariful de referință la care se aplică coeficientul
            clasei bonus-malus;
          </li>
          <li>
            <strong>N</strong> = factorul N;
          </li>
          <li>
            <strong>PO1, PO2, PO3</strong> = cele mai mici prime nete de cheltuieli din
            ofertele anexate.
          </li>
        </ul>
        <p>
          Calculul se efectuează strict pentru polițe de <strong>12 luni</strong>, conform
          prevederilor legale.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Pașii de urmat
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            Accesați aplicația BAAR la{" "}
            <a
              href="https://public.riscridicat.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              public.riscridicat.ro
            </a>{" "}
            și completați datele solicitate, anexând documentele necesare. Alternativ,
            puteți trimite formularul de cerere ofertă și documentele prin fax sau poștă
            (vezi contact mai jos). Puteți solicita și link-ul aplicației prin email la{" "}
            <a
              href="mailto:riscridicat@baar.ro"
              className="text-[#2563EB] hover:underline"
            >
              riscridicat@baar.ro
            </a>
            .
          </li>
          <li>
            BAAR verifică dacă cererea este admisibilă și comunică rezultatul (în termen de
            până la 5 zile lucrătoare pentru verificarea admisibilității, conform
            informațiilor publice BAAR).
          </li>
          <li>
            Dacă vă încadrați, solicitarea este plasată în platforma electronică; un
            asigurător RCA o poate prelua benevol în maximum o zi lucrătoare, iar dacă nu
            este preluată, alocarea se face automat în ziua lucrătoare următoare
            termenului legal.
          </li>
          <li>
            Aveți <strong>10 zile lucrătoare</strong> de la comunicarea alocării pentru a
            contacta asigurătorul desemnat și a încheia contractul RCA.
          </li>
        </ol>
        <p>
          Soluționarea completă durează <strong>maximum 20 de zile</strong> de la
          înregistrarea cererii cu documentație completă și corectă. Dacă documentele sunt
          incomplete, retransmiterea reluă procedura și termenul de 20 de zile curge de la
          data retransmiterii.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Documente necesare
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Minimum <strong>3 oferte RCA</strong> pentru 12 luni, de la asigurători
            diferiți, pentru aceeași persoană și același vehicul, cu aceeași clasă
            bonus-malus, în perioada de valabilitate, cu cod de ofertă alocat de
            asigurător. Nu sunt acceptate simulări rapide de preț de pe platforme online
            care nu conțin toate elementele obligatorii.
          </li>
          <li>
            Copie certificat de înmatriculare al vehiculului.
          </li>
          <li>
            Copie act de identitate al proprietarului/utilizatorului (persoane fizice).
          </li>
          <li>
            Pentru persoane juridice: certificat de înregistrare la Registrul Comerțului
            sau certificat de înscriere (asociații, fundații), după caz; certificat de
            înregistrare fiscală pentru alte entități înregistrate fiscal.
          </li>
          <li>
            Copie mandat reprezentant conventional, dacă solicitarea este depusă de altă
            persoană decât asiguratul (ex.: broker de asigurări).
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Contact BAAR
        </h2>
        <ul className="list-none space-y-1">
          <li>
            Email:{" "}
            <a
              href="mailto:riscridicat@baar.ro"
              className="text-[#2563EB] hover:underline"
            >
              riscridicat@baar.ro
            </a>
          </li>
          <li>Fax: 004 021 319 13 01</li>
          <li>
            Poștă: str. Vasile Lascăr nr. 40–40 bis, et. 6, sect. 2, București, cod
            poștal 020502
          </li>
          <li>
            Platformă:{" "}
            <a
              href="https://public.riscridicat.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              public.riscridicat.ro
            </a>
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Asistență prin Sigur.Ai
        </h2>
        <p>
          FLETHO LLC SRL (Sigur.Ai) acționează ca asistent in brokeraj autorizat ASF
          (RAJ506943). Dacă vă încadrați în categoria asiguraților cu risc ridicat și
          doriți sprijin pentru obținerea ofertelor sau depunerea cererii către BAAR, ne
          puteți contacta:
        </p>
        <ul className="list-none space-y-1">
          <li>
            Telefon: <strong>0720 38 55 51</strong>
          </li>
          <li>
            Email: <strong>office@sigur.ai</strong>
          </li>
          <li>
            <Link href="/contact" className="text-[#2563EB] hover:underline">
              Formular contact
            </Link>
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          Documente oficiale de referință
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a
              href="https://www.baar.ro/asigurati-cu-risc-ridicat/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              BAAR – Asigurați cu risc ridicat
            </a>
          </li>
          <li>Legea nr. 132/2017 privind asigurarea RCA obligatorie</li>
          <li>Norma ASF nr. 20/2017 privind asigurările auto din România</li>
        </ul>
      </div>
    </section>
  );
}
