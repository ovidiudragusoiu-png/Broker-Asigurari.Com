import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";
import Image from "next/image";
import CinematicHeader from "@/components/layout/CinematicHeader";
import ChatWidget from "@/components/shared/ChatWidget";
import { AuthProvider } from "@/components/portal/AuthProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broker Asigurari - Asigurari Online",
  description:
    "Compara si cumpara asigurari online: RCA, Travel, Locuinta, CASCO, Malpraxis, Garantii. Cele mai bune oferte de la asiguratorii din Romania.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <head>
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "InsuranceAgency",
              name: "Broker-Asigurari.Com",
              legalName: "FLETHO LLC SRL",
              url: "https://broker-asigurari.com",
              logo: "https://broker-asigurari.com/images/logo.png",
              telephone: "+40720385551",
              email: "bucuresti@broker-asigurari.com",
              address: {
                "@type": "PostalAddress",
                addressCountry: "RO",
                addressLocality: "București",
              },
              openingHours: "Mo-Fr 09:00-18:00",
              sameAs: [
                "https://www.facebook.com/brokerasiguraricom",
                "https://instagram.com/brokerasigurari",
              ],
            }),
          }}
        />
        {/* Google Analytics (GA4) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-325066225" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied' });
          gtag('config', 'G-325066225');
        `}} />
        {/* Google Fonts: Inter, Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=Plus+Jakarta+Sans:wght@500..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-brand-bg text-brand-text font-sans antialiased selection:bg-brand-accent selection:text-white">
        <AuthProvider>

        <CinematicHeader />

        <main className="flex-grow">{children}</main>

        <ChatWidget />

        {/* Premium Footer */}
        <footer className="relative bg-[#0F172A] text-slate-400">
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
              {/* Brand column */}
              <div className="sm:col-span-2">
                <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-white mb-5">
                  <ShieldCheck className="h-7 w-7 text-[#2563EB]" />
                  <span>Broker<span className="text-[#F97316]">Asigurari</span><span className="text-[#2563EB]">.Com</span></span>
                </Link>
                <p className="text-sm text-slate-500 max-w-xs mb-8 leading-relaxed">
                  Platforma ta de încredere pentru asigurări online. Compară oferte și cumpără polița de care ai nevoie, simplu și rapid.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Phone className="h-4 w-4 text-[#F97316]" />
                    </div>
                    <span>0720 38 55 51</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Mail className="h-4 w-4 text-[#F97316]" />
                    </div>
                    <span>bucuresti@broker-asigurari.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Clock className="h-4 w-4 text-[#F97316]" />
                    </div>
                    <span>Luni - Vineri: 09:00 - 18:00</span>
                  </div>
                </div>
                {/* Social Media */}
                <div className="flex items-center gap-3 mt-6">
                  <a href="https://www.facebook.com/brokerasiguraricom" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href="https://instagram.com/brokerasigurari" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <Instagram className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Asigurări column */}
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-5">Asigurări</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/rca" className="transition-colors hover:text-white">Asigurare RCA</Link></li>
                  <li><Link href="/casco" className="transition-colors hover:text-white">Asigurare CASCO</Link></li>
                  <li><Link href="/travel" className="transition-colors hover:text-white">Asigurare de Călătorie</Link></li>
                  <li><Link href="/house" className="transition-colors hover:text-white">Asigurare Locuință</Link></li>
                  <li><Link href="/pad" className="transition-colors hover:text-white">Asigurare PAD</Link></li>
                  <li><Link href="/malpraxis" className="transition-colors hover:text-white">Asigurare Malpraxis</Link></li>
                  <li><Link href="/garantii" className="transition-colors hover:text-white">Garanții Contractuale</Link></li>
                  <li><Link href="/raspundere-profesionala" className="transition-colors hover:text-white">Răspundere Profesională</Link></li>
                </ul>
              </div>

              {/* Companie column */}
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-5">Companie</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/blog" className="transition-colors hover:text-white">Blog</Link></li>
                  <li><Link href="/despre-noi" className="transition-colors hover:text-white">Despre noi</Link></li>
                  <li><Link href="/contact" className="transition-colors hover:text-white">Contact</Link></li>
                  <li><Link href="/termeni" className="transition-colors hover:text-white">Termeni și Condiții</Link></li>
                  <li><Link href="/confidentialitate" className="transition-colors hover:text-white">Confidențialitate</Link></li>
                  <li><a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">ANPC</a></li>
                </ul>
              </div>

              {/* Autorizare column */}
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-5">Autorizare</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Broker-Asigurari.Com prin FLETHO LLC SRL, autorizată de Autoritatea de Supraveghere Financiară (ASF).<br /><br />
                  Număr autorizare: <strong className="text-slate-400">RAJ506943</strong>
                </p>
              </div>
            </div>

            {/* EU/PNRR Compliance */}
            <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex justify-center mb-4">
                <Image src="/images/pnrr/banner-pnrr.jpg" alt="Finanțat de Uniunea Europeană NextGenerationEU — Guvernul României — Planul Național de Redresare și Reziliență" width={700} height={58} className="object-contain w-full max-w-2xl h-auto" />
              </div>
              <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-3xl mx-auto">
                Proiect cofinanțat din Fondul European de Dezvoltare Regională prin
                Planul Național de Redresare și Reziliență (PNRR).
                <br />
                Conținutul acestui material nu reprezintă în mod obligatoriu
                poziția oficială a Uniunii Europene sau a Guvernului României.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-3 text-[11px]">
                <a href="https://mfe.gov.ro" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">mfe.gov.ro</a>
                <a href="https://pnrr.gov.ro" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">pnrr.gov.ro</a>
                <a href="https://europa.eu" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">europa.eu</a>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
              <p className="text-xs text-slate-600">
                &copy; {new Date().getFullYear()} Broker-Asigurari.Com. Toate drepturile rezervate.
              </p>

              {/* System Operational indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-dot" />
                <span
                  className="text-xs text-slate-600 font-mono"
                >
                  Sistem Operațional
                </span>
              </div>
            </div>
          </div>
        </footer>
        <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
