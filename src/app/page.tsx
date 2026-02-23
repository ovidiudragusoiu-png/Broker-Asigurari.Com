import HeroSection from "@/components/home/HeroSection";
import TrustSignals from "@/components/home/TrustSignals";
import Features from "@/components/home/Features";
import Philosophy from "@/components/home/Philosophy";
import Protocol from "@/components/home/Protocol";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustSignals />
      <Features />
      <Philosophy />
      <Protocol />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
