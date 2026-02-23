import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, Clock } from "lucide-react";
import CinematicHeader from "@/components/layout/CinematicHeader";
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
        {/* Google Fonts: Plus Jakarta Sans, Outfit, Cormorant Garamond, IBM Plex Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-brand-bg text-brand-text font-sans antialiased selection:bg-brand-accent selection:text-white">
        {/* Global noise overlay */}
        <svg className="pointer-events-none fixed inset-0 z-[9999] h-full w-full opacity-[0.05]">
          <filter id="global-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#global-noise)" />
        </svg>

        <CinematicHeader />

        <main className="flex-grow">{children}</main>

        {/* Premium Footer */}
        <footer className="relative rounded-t-[3rem] bg-[#0D1B2A] text-slate-400 sm:rounded-t-[4rem]">
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
              {/* Brand column */}
              <div className="sm:col-span-2">
                <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-white mb-5">
                  <ShieldCheck className="h-7 w-7 text-[#4db8cc]" />
                  <span>Broker<span className="text-[#4db8cc]">Asigurari</span></span>
                </Link>
                <p className="text-sm text-slate-500 max-w-xs mb-8 leading-relaxed">
                  Platforma ta de încredere pentru asigurări online. Compară oferte și cumpără polița de care ai nevoie, simplu și rapid.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Phone className="h-4 w-4 text-[#4db8cc]" />
                    </div>
                    <span>031 123 4567</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Mail className="h-4 w-4 text-[#4db8cc]" />
                    </div>
                    <span>contact@brokerasigurari.ro</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
                      <Clock className="h-4 w-4 text-[#4db8cc]" />
                    </div>
                    <span>Luni - Vineri: 09:00 - 18:00</span>
                  </div>
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
                  Broker Asigurari SRL este autorizată de Autoritatea de Supraveghere Financiară (ASF).<br/><br/>
                  Număr de înregistrare în Registrul Brokerilor: <strong className="text-slate-400">RBK-1234/2020</strong>
                </p>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
              <p className="text-xs text-slate-600">
                &copy; {new Date().getFullYear()} Broker Asigurari SRL. Toate drepturile rezervate.
              </p>

              {/* System Operational indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-dot" />
                <span
                  className="text-xs text-slate-600"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Sistem Operațional
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
