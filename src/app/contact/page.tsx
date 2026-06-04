import ContactPageContent from "./ContactPageContent";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Contact | Sigur.Ai",
  description:
    "Contactează-ne pentru orice întrebare despre asigurări. Telefon: 0720 38 55 51. Email: office@sigur.ai. Luni–Vineri 09:00–18:00.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactPageContent />;
}
