import type { Metadata } from "next";
import RaspunderePageContent from "./RaspunderePageContent";

export const metadata: Metadata = {
  title: "Asigurare Raspundere Profesionala Online | Broker Asigurari",
  description:
    "Solicită asigurare de răspundere profesională online. Protecție pentru liber profesioniști: avocați, contabili, ingineri, consultanți.",
  openGraph: {
    title: "Asigurare Raspundere Profesionala Online | Broker Asigurari",
    description:
      "Solicită asigurare de răspundere profesională online. Protecție pentru liber profesioniști.",
    type: "website",
  },
};

export default function RaspunderePage() {
  return <RaspunderePageContent />;
}
