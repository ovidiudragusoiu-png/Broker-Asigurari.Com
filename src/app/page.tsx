import HeroSection from "@/components/home/HeroSection";
import TrustSignals from "@/components/home/TrustSignals";
import Features from "@/components/home/Features";
import Reviews from "@/components/home/Reviews";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Sigur.Ai — Compară asigurări online în România",
  description:
    "Compară și cumpără asigurări online: RCA, călătorie, locuință, CASCO, malpraxis, garanții. Cele mai bune oferte de la asigurătorii din România.",
  path: "/",
});

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ce este asigurarea RCA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Conform Legii nr. 132/2017, RCA este asigurarea obligatorie de răspundere civilă auto care acoperă prejudiciile produse terților prin accidente de vehicule sau tramvaie. Circulația fără RCA valabil atrage sancțiunile prevăzute de legislația în vigoare.",
      },
    },
    {
      "@type": "Question",
      name: "Cum se calculează prețul RCA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Potrivit Legii nr. 132/2017 și Normei ASF nr. 20/2017, prima RCA este stabilită de fiecare asigurător pe baza propriilor criterii de risc, incluzând clasa bonus-malus, caracteristicile vehiculului, datele proprietarului sau utilizatorului și perioada asigurată.",
      },
    },
    {
      "@type": "Question",
      name: "Ce este sistemul Bonus-Malus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sistemul bonus-malus este reglementat de Norma ASF nr. 20/2017 și ajustează prima RCA în funcție de istoricul de daune. Clasele bonus pot reduce prima, iar clasele malus o pot majora atunci când există daune plătite pe polițele anterioare.",
      },
    },
    {
      "@type": "Question",
      name: "Care e diferența dintre RCA și CASCO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RCA este obligatorie prin Legea nr. 132/2017 și acoperă răspunderea pentru prejudiciile produse terților. CASCO este o asigurare facultativă pentru propriul vehicul, cu riscuri și condiții stabilite prin contractul ales.",
      },
    },
    {
      "@type": "Question",
      name: "Pot încheia asigurarea online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da. În cadrul normelor RCA în vigoare, oferta și emiterea poliței pot fi gestionate digital, cu transmiterea documentelor în format electronic. Este important ca datele introduse pentru ofertare și emitere să fie corecte și complete.",
      },
    },
    {
      "@type": "Question",
      name: "De ce diferă prețurile între asigurători?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Legea nr. 132/2017 stabilește cadrul RCA și limitele minime de răspundere, dar fiecare asigurător își stabilește propriile tarife și criterii de subscriere, în condițiile normelor ASF. De aceea, ofertele pot diferi și merită comparate înainte de alegere.",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection />
      <TrustSignals />
      <Features />
      <Reviews />
      <FAQ />
      <FinalCTA />
    </>
  );
}
