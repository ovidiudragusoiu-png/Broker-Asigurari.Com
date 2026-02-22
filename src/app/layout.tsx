import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, Clock } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broker Asigurari - Asigurari Online",
  description:
    "Compara si cumpara asigurari online: RCA, Travel, Locuinta, PAD, Malpraxis. Cele mai bune oferte de la asiguratorii din Romania.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
              <span>Broker<span className="text-emerald-600">Asigurari</span></span>
            </Link>
            <div className="hidden gap-8 md:flex items-center">
              <Link href="/rca" className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600">
                RCA
              </Link>
              <Link href="/travel" className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600">
                Travel
              </Link>
              <Link href="/house" className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600">
                Locuință
              </Link>
              <Link href="/pad" className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600">
                PAD
              </Link>
              <Link href="/malpraxis" className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600">
                Malpraxis
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-grow">{children}</main>

        <footer className="bg-slate-900 text-slate-300">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
              <div className="md:col-span-2">
                <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-white mb-4">
                  <ShieldCheck className="h-7 w-7 text-emerald-500" />
                  <span>Broker<span className="text-emerald-500">Asigurari</span></span>
                </Link>
                <p className="text-sm text-slate-400 max-w-xs mb-6">
                  Platforma ta de încredere pentru asigurări online. Compară oferte și cumpără polița de care ai nevoie, simplu și rapid.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <span>031 123 4567</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-500" />
                    <span>contact@brokerasigurari.ro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span>Luni - Vineri: 09:00 - 18:00</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Produse</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/rca" className="hover:text-emerald-400 transition-colors">Asigurare RCA</Link></li>
                  <li><Link href="/travel" className="hover:text-emerald-400 transition-colors">Asigurare de Călătorie</Link></li>
                  <li><Link href="/house" className="hover:text-emerald-400 transition-colors">Asigurare Locuință</Link></li>
                  <li><Link href="/pad" className="hover:text-emerald-400 transition-colors">Asigurare PAD</Link></li>
                  <li><Link href="/malpraxis" className="hover:text-emerald-400 transition-colors">Asigurare Malpraxis</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/termeni" className="hover:text-emerald-400 transition-colors">Termeni și Condiții</Link></li>
                  <li><Link href="/confidentialitate" className="hover:text-emerald-400 transition-colors">Politica de Confidențialitate</Link></li>
                  <li><a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">ANPC</a></li>
                  <li><a href="https://sal.ro/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">SAL</a></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Autorizare</h3>
                <p className="text-xs text-slate-400">
                  Broker Asigurari SRL este autorizată de Autoritatea de Supraveghere Financiară (ASF).<br/><br/>
                  Număr de înregistrare în Registrul Brokerilor: <strong>RBK-1234/2020</strong>
                </p>
              </div>
            </div>
            
            <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-slate-500">
                &copy; {new Date().getFullYear()} Broker Asigurari SRL. Toate drepturile rezervate.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
