import CascoPageContent from "./CascoPageContent";
import { WizardSuspense } from "@/components/shared/WizardSuspense";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Solicită ofertă asigurare CASCO online. Acoperire completă pentru vehiculul tău: daune proprii, furt, calamități naturale.";

export const metadata = createPageMetadata({
  title: "Asigurare CASCO online — Ofertă personalizată | Sigur.Ai",
  description: DESCRIPTION,
  path: "/casco",
});

export default function CascoPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare CASCO online",
          description: DESCRIPTION,
          path: "/casco",
        })}
      />
      <WizardSuspense>
        <CascoPageContent />
      </WizardSuspense>
    </>
  );
}
