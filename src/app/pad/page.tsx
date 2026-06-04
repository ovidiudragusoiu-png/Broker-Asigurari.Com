import PadPageContent from "./PadPageContent";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Cumpără asigurare PAD obligatorie online. Protecție împotriva cutremurelor, inundațiilor și alunecărilor de teren. Emitere rapidă.";

export const metadata = createPageMetadata({
  title: "Asigurare PAD online — Polița obligatorie | Sigur.Ai",
  description: DESCRIPTION,
  path: "/pad",
});

export default function PadPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare PAD online",
          description: DESCRIPTION,
          path: "/pad",
        })}
      />
      <PadPageContent />
    </>
  );
}
