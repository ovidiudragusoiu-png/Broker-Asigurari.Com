import type { Metadata } from "next";
import TravelPageContent from "./TravelPageContent";

export const metadata: Metadata = {
  title: "Asigurare de Calatorie Online - Oferte Instant | Broker Asigurari",
  description:
    "Compară și cumpără asigurare de călătorie online. Acoperire medicală, bagaje, anulare călătorie. Oferte instant de la asigurătorii din România.",
  openGraph: {
    title: "Asigurare de Calatorie Online - Oferte Instant | Broker Asigurari",
    description:
      "Compară și cumpără asigurare de călătorie online. Acoperire medicală, bagaje, anulare călătorie.",
    type: "website",
  },
};

export default function TravelPage() {
  return <TravelPageContent />;
}
