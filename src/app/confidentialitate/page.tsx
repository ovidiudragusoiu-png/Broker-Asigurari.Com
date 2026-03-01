import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Confidențialitate | Sigur.Ai",
  description:
    "Politica de confidențialitate Sigur.Ai. Cum colectăm, utilizăm și protejăm datele dumneavoastră personale.",
};

export default function ConfidentialitatePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-brand-text mb-8">
        Politica de Confidențialitate
      </h1>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-600">
        <p>
          <strong>Ultima actualizare:</strong> 28 februarie 2026
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          1. Operatorul de date
        </h2>
        <p>
          <strong>FLETHO LLC SRL</strong>, în calitate de operator de date cu caracter
          personal, respectă legislația europeană (GDPR — Regulamentul UE 2016/679) și
          legislația națională privind protecția datelor personale.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          2. Date colectate
        </h2>
        <p>Colectăm următoarele categorii de date personale:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Date de identificare:</strong> nume, prenume, CNP, seria și numărul
            actului de identitate.
          </li>
          <li>
            <strong>Date de contact:</strong> adresă email, număr de telefon, adresă
            de domiciliu/reședință.
          </li>
          <li>
            <strong>Date despre vehicul:</strong> număr de înmatriculare, serie de
            șasiu, date tehnice (doar pentru asigurări auto).
          </li>
          <li>
            <strong>Date de navigare:</strong> adresă IP, cookie-uri, tip browser
            (prin Google Analytics).
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          3. Scopul prelucrării
        </h2>
        <p>Datele personale sunt prelucrate pentru:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Întocmirea și emiterea polițelor de asigurare.</li>
          <li>Comunicarea cu utilizatorii privind polițele achiziționate.</li>
          <li>
            Respectarea obligațiilor legale (raportări către ASF, prevenirea fraudei).
          </li>
          <li>Îmbunătățirea serviciilor și a experienței de utilizare.</li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          4. Temeiuri legale
        </h2>
        <p>
          Prelucrarea datelor se bazează pe: executarea contractului de asigurare,
          obligații legale, interesul legitim al operatorului și, acolo unde este cazul,
          consimțământul utilizatorului.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          5. Destinatari
        </h2>
        <p>
          Datele personale pot fi transmise către: companiile de asigurare partenere
          (pentru emiterea polițelor), procesatorii de plăți, autoritățile de
          reglementare (ASF, BAAR) și alte entități conform obligațiilor legale.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          6. Durata păstrării
        </h2>
        <p>
          Datele personale sunt păstrate pe durata valabilității poliței de asigurare
          și pentru o perioadă suplimentară conform cerințelor legale (minimum 5 ani
          de la expirarea poliței).
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          7. Drepturile dumneavoastră
        </h2>
        <p>Conform GDPR, aveți dreptul la:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Acces la datele personale prelucrate.</li>
          <li>Rectificarea datelor inexacte.</li>
          <li>Ștergerea datelor (&quot;dreptul de a fi uitat&quot;).</li>
          <li>Restricționarea prelucrării.</li>
          <li>Portabilitatea datelor.</li>
          <li>Opoziția la prelucrare.</li>
          <li>
            Depunerea unei plângeri la ANSPDCP (Autoritatea Națională de Supraveghere
            a Prelucrării Datelor cu Caracter Personal).
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          8. Cookie-uri
        </h2>
        <p>
          Utilizăm cookie-uri esențiale pentru funcționarea site-ului și cookie-uri
          analitice (Google Analytics) pentru a înțelege modul de utilizare a
          platformei. Puteți gestiona preferințele privind cookie-urile din setările
          browserului.
        </p>

        <h2 className="text-xl font-semibold text-brand-text mt-8">
          9. Contact
        </h2>
        <p>
          Pentru exercitarea drepturilor sau întrebări privind prelucrarea datelor
          personale:
        </p>
        <ul className="list-none space-y-1">
          <li>Telefon: <strong>0720 38 55 51</strong></li>
          <li>Email: <strong>bucuresti@broker-asigurari.com</strong></li>
        </ul>
      </div>
    </section>
  );
}
