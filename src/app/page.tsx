import HeroSection from "@/components/home/HeroSection";
import TrustSignals from "@/components/home/TrustSignals";
import Features from "@/components/home/Features";
import Reviews from "@/components/home/Reviews";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ce este asigurarea RCA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Asigurarea obligatorie care acoperă daunele cauzate terților într-un accident auto. Lipsa RCA se sancționează cu amendă de 1.000 lei și reținerea plăcuțelor.",
      },
    },
    {
      "@type": "Question",
      name: "Cum se calculează prețul RCA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Depinde de clasa Bonus-Malus, vârsta șoferului, tipul vehiculului, capacitatea motorului, județul de înmatriculare și perioada de asigurare (1-12 luni).",
      },
    },
    {
      "@type": "Question",
      name: "Ce este sistemul Bonus-Malus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Recompensează șoferii prudenți cu reduceri de până la 50% (clasa B8). Șoferii cu daune pot plăti cu până la 80% mai mult. Clasa se transferă la schimbarea mașinii.",
      },
    },
    {
      "@type": "Question",
      name: "Care e diferența dintre RCA și CASCO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RCA acoperă daunele cauzate altora (obligatorie). CASCO protejează propria mașină contra furtului, grindini, coliziunilor și vandalismului (opțională).",
      },
    },
    {
      "@type": "Question",
      name: "Pot încheia asigurarea online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Da, 100%. Compari oferte de la 11+ asiguratori, completezi datele, plătești cu cardul și primești polița pe email — totul în mai puțin de 3 minute.",
      },
    },
    {
      "@type": "Question",
      name: "De ce diferă prețurile între asigurători?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fiecare asigurător stabilește tarife proprii, dar limitele de despăgubire sunt identice. Diferențele pot ajunge la sute de lei — de aceea merită să compari.",
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
