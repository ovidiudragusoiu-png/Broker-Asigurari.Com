import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ARTICLES } from "@/lib/data/articles";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Blog | Sigur.Ai — Ghiduri și sfaturi despre asigurări",
  description:
    "Articole utile despre asigurări auto, călătorie, locuință și multe altele. Ghiduri practice, sfaturi de economisire și noutăți din piața asigurărilor din România.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Blog Sigur.Ai
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Ghiduri, sfaturi și noutăți despre asigurări în România
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div
                className={`h-2 bg-gradient-to-r ${article.gradient}`}
              />
              <div className="flex flex-1 flex-col p-6">
                <span className="mb-2 inline-block w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {article.category}
                </span>
                <h2 className="mb-2 text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h2>
                <p className="mb-4 flex-1 text-sm text-gray-500 line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {article.readTime}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-600 group-hover:gap-2 transition-all">
                    Citește <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
