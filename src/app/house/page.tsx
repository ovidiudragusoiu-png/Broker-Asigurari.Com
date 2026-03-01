import type { Metadata } from "next";
import HousePageContent from "./HousePageContent";

export const metadata: Metadata = {
  title: "Asigurare Locuinta Online - Protectie Completa | Sigur.Ai",
  description:
    "Asigurare locuință online: incendiu, inundații, cutremur, furt. Compară oferte și protejează-ți casa cu cele mai bune prețuri.",
  openGraph: {
    title: "Asigurare Locuinta Online - Protectie Completa | Sigur.Ai",
    description:
      "Asigurare locuință online: incendiu, inundații, cutremur, furt. Compară oferte de la asigurătorii din România.",
    type: "website",
  },
};

export default function HousePage() {
  return <HousePageContent />;
}
