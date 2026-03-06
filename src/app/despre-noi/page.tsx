import type { Metadata } from "next";
import DespreNoiContent from "./DespreNoiContent";

export const metadata: Metadata = {
  title: "Despre noi | Sigur.Ai — Cine suntem",
  description:
    "Aflați povestea Sigur.Ai, misiunea noastră de a simplifica asigurările online și valorile care ne ghidează în fiecare zi.",
};

export default function DespreNoiPage() {
  return <DespreNoiContent />;
}
