import type { Metadata } from "next";
import PadPageContent from "./PadPageContent";

export const metadata: Metadata = {
  title: "Asigurare PAD Online - Polita de Asigurare a Locuintei | Broker Asigurari",
  description:
    "Cumpără asigurare PAD obligatorie online. Protecție împotriva cutremurelor, inundațiilor și alunecărilor de teren. Emitere rapidă.",
  openGraph: {
    title: "Asigurare PAD Online | Broker Asigurari",
    description:
      "Cumpără asigurare PAD obligatorie online. Protecție împotriva cutremurelor, inundațiilor și alunecărilor de teren.",
    type: "website",
  },
};

export default function PadPage() {
  return <PadPageContent />;
}
