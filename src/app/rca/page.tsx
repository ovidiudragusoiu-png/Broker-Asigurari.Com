import type { Metadata } from "next";
import RcaPageContent from "./RcaPageContent";

export const metadata: Metadata = {
  title: "Asigurare RCA Online - Compara Oferte | Broker Asigurari",
  description:
    "Calculează și compară oferte RCA online de la cei mai importanți asiguratori din România. Preț corect, emitere rapidă, plată online.",
  openGraph: {
    title: "Asigurare RCA Online - Compara Oferte | Broker Asigurari",
    description:
      "Calculează și compară oferte RCA online de la cei mai importanți asiguratori din România.",
    type: "website",
  },
};

export default function RcaPage() {
  return <RcaPageContent />;
}
