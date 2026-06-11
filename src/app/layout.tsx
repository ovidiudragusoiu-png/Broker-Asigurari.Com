import type { Viewport } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ShieldCheck, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";
import Image from "next/image";
import CinematicHeader from "@/components/layout/CinematicHeader";
import ChatWidget from "@/components/shared/ChatWidget";
import JsonLd from "@/components/seo/JsonLd";
import { AuthProvider } from "@/components/portal/AuthProvider";
import { rootLayoutMetadata } from "@/lib/seo/metadata";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structuredData";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = rootLayoutMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className={inter.variable}>
      <head>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        {/* Google Analytics (GA4) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3V7KLWL34F" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied' });
          gtag('config', 'G-3V7KLWL34F');
        `}} />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-brand-bg text-brand-text font-sans antialiased selection:bg-brand-accent selection:text-white">
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
                  <span>Sigur<span className="text-[#F97316]">.Ai</span></span>
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
                    <div className="flex flex-col">
                      <span>office@sigur.ai</span>
                      <span className="text-xs text-slate-400">bucuresti@broker-asigurari.com</span>
                    </div>
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
                  <a href="https://www.facebook.com/brokerasigurariAi" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href="https://www.instagram.com/sigur.ai/" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a href="https://ro.pinterest.com/wwwSigurAI/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
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
                  <li><Link href="/procedura-baar" className="transition-colors hover:text-white">Procedura BAAR</Link></li>
                </ul>
              </div>

              {/* Autorizare column */}
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-5">Autorizare</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sigur.Ai prin FLETHO LLC SRL, autorizată de Autoritatea de Supraveghere Financiară (ASF).<br /><br />
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
                &copy; {new Date().getFullYear()} Sigur.Ai. Toate drepturile rezervate.
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
