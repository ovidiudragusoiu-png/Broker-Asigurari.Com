import type { Metadata } from "next";
import ContactPageContent from "./ContactPageContent";

export const metadata: Metadata = {
  title: "Contact - Broker Asigurari",
  description:
    "Contactează-ne pentru orice întrebare despre asigurări. Telefon: 0720 38 55 51. Email: bucuresti@broker-asigurari.com. Luni-Vineri 09:00-18:00.",
  openGraph: {
    title: "Contact - Broker Asigurari",
    description:
      "Contactează-ne pentru orice întrebare despre asigurări. Telefon: 0720 38 55 51.",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
