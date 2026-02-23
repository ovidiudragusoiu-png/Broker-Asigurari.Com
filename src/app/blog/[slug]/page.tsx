import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { ARTICLES, getArticleBySlug, getAllSlugs } from "@/lib/data/articles";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Articol negăsit" };

  return {
    title: `${article.title} | Blog Broker Asigurari`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.date,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  // Get related articles (same category, excluding current)
  const related = ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug
  ).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className={`bg-gradient-to-br ${article.gradient} py-16 sm:py-24`}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi la blog
          </Link>

          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-sm text-white/70">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          <p className="mt-4 text-lg text-white/80">{article.date}</p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div
            className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900 prose-ul:my-4 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-gradient-to-r from-sky-50 to-sky-100 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900">Ai nevoie de o asigurare?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Compară ofertele celor mai buni asigurători din România, 100% online.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/rca"
                className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                Calculează RCA
              </Link>
              <Link
                href="/casco"
                className="rounded-lg border border-sky-200 bg-white px-6 py-2.5 text-sm font-semibold text-sky-600 transition hover:bg-sky-50"
              >
                Cerere CASCO
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="bg-gray-50 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-extrabold text-slate-900">Articole similare</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`h-12 w-12 flex-shrink-0 rounded-lg bg-gradient-to-br ${r.gradient}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {r.title}
                    </p>
                    <p className="mt-1 flex items-center text-xs text-slate-400">
                      {r.date}
                      <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
