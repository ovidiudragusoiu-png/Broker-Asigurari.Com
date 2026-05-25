import type { Metadata } from "next";
import { ShieldCheck, Wrench } from "lucide-react";
import SiteAccessForm from "@/components/site-access/SiteAccessForm";

export const metadata: Metadata = {
  title: "În dezvoltare | Sigur.Ai",
  description:
    "Platforma Sigur.Ai este în curs de dezvoltare. Accesul este disponibil doar cu parolă pentru echipa de testare.",
  robots: { index: false, follow: false },
};

export default function UnderDevelopmentPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-bg px-6 text-brand-text">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/5">
          <ShieldCheck className="h-9 w-9 text-[#2563EB]" aria-hidden />
        </div>

        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-primary">
          <Wrench className="h-3.5 w-3.5 text-brand-accent" aria-hidden />
          În dezvoltare
        </p>

        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-brand-primary sm:text-4xl">
          Revinem în curând
        </h1>

        <p className="mt-4 text-base leading-relaxed text-brand-text/80">
          Site-ul nu este încă deschis publicului. Dacă faci parte din echipa de
          testare, introdu parola de acces mai jos.
        </p>

        <div className="mt-6 rounded-2xl border border-brand-primary/10 bg-white p-6 shadow-sm">
          <SiteAccessForm />
        </div>

        <p className="mt-6 text-xs text-brand-text/50">
          Întrebări?{" "}
          <a
            href="mailto:office@sigur.ai"
            className="font-medium text-[#2563EB] hover:underline"
          >
            office@sigur.ai
          </a>
        </p>
      </div>
    </div>
  );
}
