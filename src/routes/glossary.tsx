import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { glossary } from "@/lib/glossary-data";

export const Route = createFileRoute("/glossary")({
  component: GlossaryPage,
  head: () => ({
    meta: [
      {
        title:
          "AI Search Glossary for Indian Startups & Small Businesses — SEO, GEO, AEO | Seenzo",
      },
      {
        name: "description",
        content:
          "Plain-English glossary of AI search, GEO, AEO and SEO terms every Indian startup founder and small business owner should know — from ChatGPT Search and Gemini to schema, llms.txt, RAG and AI Overviews.",
      },
      {
        name: "keywords",
        content:
          "AI search, GEO, AEO, SEO India, ChatGPT SEO, Gemini SEO, Perplexity, LLM optimization, AI visibility, generative engine optimization, answer engine optimization, AI for startups India, AI for small business India",
      },
      {
        property: "og:title",
        content: "AI Search Glossary for Indian Startups & SMBs — Seenzo",
      },
      {
        property: "og:description",
        content:
          "Definitions of SEO, GEO, AEO, LLMs, RAG, llms.txt and every term Indian founders need for AI search.",
      },
      { property: "og:url", content: "https://seenzo-visibility-boost.lovable.app/glossary" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://seenzo-visibility-boost.lovable.app/glossary" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "Seenzo AI Search Glossary",
          description:
            "Plain-English AI search, GEO, AEO and SEO terminology for Indian startups and small businesses.",
          hasDefinedTerm: glossary.map((g) => ({
            "@type": "DefinedTerm",
            name: g.term,
            description: g.definition,
            inDefinedTermSet: "https://seenzo-visibility-boost.lovable.app/glossary",
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.seenzo.in/" },
            { "@type": "ListItem", position: 2, name: "Glossary", item: "https://www.seenzo.in/glossary" },
          ],
        }),
      },
    ],
  }),
});

function GlossaryPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 sm:pt-20">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
          AI Search Glossary
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          The words Indian founders need for AI search.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Plain-English definitions of the terms every startup founder and small business owner in
          India should know when starting with AI implementation, AI search, and the shift from SEO
          to GEO and AEO.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <dl className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {glossary.map((g) => (
            <div key={g.term} className="px-6 py-6">
              <dt
                id={slugify(g.term)}
                className="font-display text-xl font-bold tracking-tight text-ink"
              >
                {g.term}
              </dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-slate-600">{g.definition}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center">
          <p className="text-[15px] text-slate-600">
            See how your business scores on AI search today.
          </p>
          <a
            href="/#scan"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get my free AI Visibility Report
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-sm text-slate-500">
            Have a specific question? Read the{" "}
            <a href="/faq" className="font-semibold text-brand-ink hover:underline">
              Seenzo FAQ
            </a>
            .
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}