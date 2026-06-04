import DespreNoiContent from "./DespreNoiContent";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Despre noi | Sigur.Ai — Cine suntem",
  description:
    "Află povestea Sigur.Ai, misiunea noastră de a simplifica asigurările online și valorile care ne ghidează în fiecare zi.",
  path: "/despre-noi",
});

export default function DespreNoiPage() {
  return <DespreNoiContent />;
}
