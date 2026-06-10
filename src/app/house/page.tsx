import HousePageContent from "./HousePageContent";
import { WizardSuspense } from "@/components/shared/WizardSuspense";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Asigurare locuință online: incendiu, inundații, cutremur, furt. Compară oferte și protejează-ți casa cu cele mai bune prețuri.";

export const metadata = createPageMetadata({
  title: "Asigurare locuință online — Protecție completă | Sigur.Ai",
  description: DESCRIPTION,
  path: "/house",
});

export default function HousePage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare locuință online",
          description: DESCRIPTION,
          path: "/house",
        })}
      />
      <WizardSuspense>
        <HousePageContent />
      </WizardSuspense>
    </>
  );
}
