import MalpraxisPageContent from "./MalpraxisPageContent";
import JsonLd from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo/metadata";
import { insuranceServiceJsonLd } from "@/lib/seo/structuredData";

const DESCRIPTION =
  "Asigurare malpraxis medical online. Compară oferte de la mai mulți asigurători. Acoperire răspundere civilă profesională pentru medici.";

export const metadata = createPageMetadata({
  title: "Asigurare malpraxis online — Compară oferte | Sigur.Ai",
  description: DESCRIPTION,
  path: "/malpraxis",
});

export default function MalpraxisPage() {
  return (
    <>
      <JsonLd
        data={insuranceServiceJsonLd({
          name: "Asigurare malpraxis medical online",
          description: DESCRIPTION,
          path: "/malpraxis",
        })}
      />
      <MalpraxisPageContent debugEnabled={process.env.MALPRAXIS_DEBUG === "1"} />
    </>
  );
}
