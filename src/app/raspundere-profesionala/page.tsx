import RaspunderePageContent from "./RaspunderePageContent";
import { WizardSuspense } from "@/components/shared/WizardSuspense";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Asigurare răspundere profesională online. Compară oferte și protejează-ți activitatea profesională cu polițe adaptate nevoilor tale.";

export const metadata = createPageMetadata({
  title: "Răspundere profesională online | Sigur.Ai",
  description: DESCRIPTION,
  path: "/raspundere-profesionala",
});

export default function RaspundereProfesionalaPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare răspundere profesională",
          description: DESCRIPTION,
          path: "/raspundere-profesionala",
        })}
      />
      <WizardSuspense>
        <RaspunderePageContent />
      </WizardSuspense>
    </>
  );
}
