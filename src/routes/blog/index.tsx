import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";

const POSTS = [
  {
    slug: "what-is-ai-visibility",
    title: "What is AI Visibility and why Indian businesses should care",
    excerpt:
      "Buyers are asking ChatGPT, Gemini, Perplexity and Claude before they Google. Here's what AI Visibility means, how it's different from SEO, and where Indian businesses lose out.",
    date: "2026-07-11",
    author: "Sriram Ramkumar",
  },
];

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: "Blog — Seenzo AI Visibility for Indian businesses" },
      {
        name: "description",
        content:
          "Practical guides on AI Visibility, GEO and AEO for Indian founders and small business owners. Written by the team behind Seenzo.",
      },
      { property: "og:title", content: "Seenzo Blog — AI Visibility, GEO and AEO for India" },
      {
        property: "og:description",
        content:
          "Practical guides on AI Visibility, GEO and AEO for Indian founders and small business owners.",
      },
      { property: "og:url", content: "https://www.seenzo.in/blog" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.seenzo.in/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Seenzo Blog",
          url: "https://www.seenzo.in/blog",
          publisher: {
            "@type": "Organization",
            name: "Seenzo",
            url: "https://www.seenzo.in",
          },
          blogPost: POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `https://www.seenzo.in/blog/${p.slug}`,
            datePublished: p.date,
            author: { "@type": "Person", name: p.author },
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
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.seenzo.in/blog" },
          ],
        }),
      },
    ],
  }),
});

function BlogIndex() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 sm:pt-20">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">Blog</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Notes on AI Visibility.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Short, practical writing for Indian founders and small business owners navigating AI
          search, GEO and AEO.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {POSTS.map((p) => (
            <li key={p.slug} className="p-6">
              <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                {new Date(p.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {p.author}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                <Link
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="transition hover:text-brand-ink"
                >
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{p.excerpt}</p>
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline"
              >
                Read the post <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}