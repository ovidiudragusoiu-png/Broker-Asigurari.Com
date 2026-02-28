import type { Metadata } from "next";
import GarantiiPageContent from "./GarantiiPageContent";

export const metadata: Metadata = {
  title: "Garantii Contractuale - Scrisori de Garantie | Broker Asigurari",
  description:
    "Solicită garanții contractuale și scrisori de garanție bancară online. Garanții de bună execuție, participare la licitații, returnare avans.",
  openGraph: {
    title: "Garantii Contractuale - Scrisori de Garantie | Broker Asigurari",
    description:
      "Solicită garanții contractuale și scrisori de garanție bancară online.",
    type: "website",
  },
};

export default function GarantiiPage() {
  return <GarantiiPageContent />;
}
