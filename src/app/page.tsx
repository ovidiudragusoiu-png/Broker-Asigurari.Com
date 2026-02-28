import HeroSection from "@/components/home/HeroSection";
import TrustSignals from "@/components/home/TrustSignals";
import Features from "@/components/home/Features";
import Reviews from "@/components/home/Reviews";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustSignals />
      <Features />
      <Reviews />
      <FAQ />
      <FinalCTA />
    </>
  );
}
