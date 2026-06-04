import TravelPageContent from "./TravelPageContent";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Compară și cumpără asigurare de călătorie online. Acoperire medicală, bagaje, anulare călătorie. Oferte instant de la asigurătorii din România.";

export const metadata = createPageMetadata({
  title: "Asigurare de călătorie online — Oferte instant | Sigur.Ai",
  description: DESCRIPTION,
  path: "/travel",
});

export default function TravelPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare de călătorie online",
          description: DESCRIPTION,
          path: "/travel",
        })}
      />
      <TravelPageContent />
    </>
  );
}
