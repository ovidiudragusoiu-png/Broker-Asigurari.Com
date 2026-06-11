import ContactPageContent from "./ContactPageContent";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Contact | Sigur.Ai",
  description:
    "Contactează Sigur.Ai pentru întrebări despre asigurări. Telefon, WhatsApp, email sau formular online. Răspundem în aceeași zi lucrătoare, Luni–Vineri 09:00–18:00.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactPageContent />;
}
