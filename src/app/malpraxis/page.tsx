import type { Metadata } from "next";
import MalpraxisPageContent from "./MalpraxisPageContent";

export const metadata: Metadata = {
  title: "Asigurare Malpraxis Online - Compara Oferte | Sigur.Ai",
  description:
    "Asigurare malpraxis medical online. Compară oferte de la mai mulți asigurători. Acoperire răspundere civilă profesională pentru medici.",
  openGraph: {
    title: "Asigurare Malpraxis Online - Compara Oferte | Sigur.Ai",
    description:
      "Asigurare malpraxis medical online. Compară oferte de la mai mulți asigurători.",
    type: "website",
  },
};

export default function MalpraxisPage() {
  return <MalpraxisPageContent />;
}
