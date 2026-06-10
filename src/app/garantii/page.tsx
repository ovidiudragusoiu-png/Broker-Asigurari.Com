import GarantiiPageContent from "./GarantiiPageContent";
import { WizardSuspense } from "@/components/shared/WizardSuspense";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Solicită garanții contractuale și scrisori de garanție bancară online. Garanții de bună execuție, participare la licitații, returnare avans.";

export const metadata = createPageMetadata({
  title: "Garanții contractuale — Scrisori de garanție | Sigur.Ai",
  description: DESCRIPTION,
  path: "/garantii",
});

export default function GarantiiPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Garanții contractuale",
          description: DESCRIPTION,
          path: "/garantii",
        })}
      />
      <WizardSuspense>
        <GarantiiPageContent />
      </WizardSuspense>
    </>
  );
}
