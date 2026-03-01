import type { Metadata } from "next";
import CascoPageContent from "./CascoPageContent";

export const metadata: Metadata = {
  title: "Asigurare CASCO Online - Oferta Personalizata | Sigur.Ai",
  description:
    "Solicită ofertă asigurare CASCO online. Acoperire completă pentru vehiculul tău: daune proprii, furt, calamități naturale.",
  openGraph: {
    title: "Asigurare CASCO Online - Oferta Personalizata | Sigur.Ai",
    description:
      "Solicită ofertă asigurare CASCO online. Acoperire completă pentru vehiculul tău.",
    type: "website",
  },
};

export default function CascoPage() {
  return <CascoPageContent />;
}
