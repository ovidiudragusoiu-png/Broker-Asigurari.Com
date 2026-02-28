import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ARTICLES } from "@/lib/data/articles";

export const metadata: Metadata = {
  title: "Blog | Broker Asigurari — Ghiduri și sfaturi despre asigurări",
  description:
    "Articole utile despre asigurări auto, călătorie, locuință și multe altele. Ghiduri practice, sfaturi de economisire și noutăți din piața asigurărilor din România.",
  openGraph: {
    title: "Blog | Broker Asigurari",
    description: "Ghiduri și sfaturi despre asigurări din România",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Blog
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Ghiduri practice, sfaturi de economisire și noutăți din piața asigurărilor din România.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Image placeholder */}
                <div className={`h-48 bg-gradient-to-br ${article.gradient} relative`}>
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                    {article.category}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3 text-xs text-slate-400">
                    <span>{article.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>

                  <h2 className="mb-2 text-lg font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                    {article.title}
                  </h2>
                  <p className="mb-4 flex-1 text-sm text-slate-500 leading-relaxed">
                    {article.excerpt}
                  </p>

                  <span className="mt-auto flex items-center text-sm font-semibold text-[#2563EB] group-hover:text-blue-700 transition-colors">
                    Citește mai mult
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
