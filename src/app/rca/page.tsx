import RcaPageContent from "./RcaPageContent";
import { WizardSuspense } from "@/components/shared/WizardSuspense";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const TITLE = "Asigurare RCA online — Compară oferte | Sigur.Ai";
const DESCRIPTION =
  "Calculează și compară oferte RCA online de la cei mai importanți asigurători din România. Preț corect, emitere rapidă, plată online.";

export const metadata = createPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/rca",
});

export default function RcaPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare RCA online",
          description: DESCRIPTION,
          path: "/rca",
        })}
      />
      <WizardSuspense>
        <RcaPageContent />
      </WizardSuspense>
    </>
  );
}
