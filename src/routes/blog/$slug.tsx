import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";

type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  authorUrl: string;
};

const POSTS: Record<string, Post> = {
  "what-is-ai-visibility": {
    slug: "what-is-ai-visibility",
    title: "What is AI Visibility and why Indian businesses should care",
    description:
      "A plain-English guide to AI Visibility for Indian founders — what it means, how it differs from SEO, and what to fix first so ChatGPT, Gemini, Perplexity and Claude can find you.",
    date: "2026-07-11",
    author: "Sriram Ramkumar",
    authorUrl: "https://www.linkedin.com/in/sriramr2212",
  },
};

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = POSTS[params.slug];
    if (!post) throw notFound();
    return post;
  },
  component: BlogPostPage,
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post not found — Seenzo" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://www.seenzo.in/blog/${params.slug}`;
    return {
      meta: [
        { title: `${loaderData.title} — Seenzo` },
        { name: "description", content: loaderData.description },
        { name: "author", content: loaderData.author },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: loaderData.date },
        { property: "article:author", content: loaderData.author },
        { name: "twitter:title", content: loaderData.title },
        { name: "twitter:description", content: loaderData.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: loaderData.title,
            description: loaderData.description,
            url,
            datePublished: loaderData.date,
            dateModified: loaderData.date,
            author: {
              "@type": "Person",
              name: loaderData.author,
              url: loaderData.authorUrl,
            },
            publisher: {
              "@type": "Organization",
              name: "Seenzo",
              url: "https://www.seenzo.in",
              logo: {
                "@type": "ImageObject",
                url: "https://www.seenzo.in/logo/seenzo-full-light.svg",
              },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
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
              { "@type": "ListItem", position: 3, name: loaderData.title, item: url },
            ],
          }),
        },
      ],
    };
  },
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const dateLabel = new Date(post.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>

        <div className="mt-6 text-sm font-semibold tracking-widest text-brand-ink uppercase">
          AI Visibility
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          By{" "}
          <a
            href={post.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-ink hover:underline"
          >
            {post.author}
          </a>{" "}
          · {dateLabel}
        </p>

        <div className="mt-10 space-y-6 text-[16px] leading-relaxed text-slate-700">
          <p>
            For twenty years, "getting found online" meant one thing: ranking on Google. That
            playbook is being quietly rewritten. Millions of buyers in India — from a startup
            founder in Bengaluru evaluating a CRM to a homeowner in Chennai looking for an
            architect — are now opening ChatGPT, Gemini, Perplexity or Claude and typing full
            questions instead of keywords. The AI answers directly. Often, it never sends the
            user to a website at all.
          </p>

          <h2 className="font-display text-2xl font-bold text-ink">
            So what is AI Visibility?
          </h2>
          <p>
            AI Visibility is how well large language models can find, understand and recommend
            your business when someone asks them a relevant question. It is not a ranking on a
            search results page. It is whether ChatGPT names you when a user asks "best boutique
            interior designers in Chennai," whether Perplexity cites your website in its answer,
            and whether Gemini's summary of your industry mentions you at all.
          </p>

          <h2 className="font-display text-2xl font-bold text-ink">
            Why Indian businesses should care right now
          </h2>
          <p>
            India is one of the fastest-growing markets for AI assistants. English-first buyers,
            heavy WhatsApp usage and a young workforce mean AI-first discovery is scaling faster
            here than in most Western markets. But most Indian business websites were built for
            Google — thin metadata, no schema, missing GST/address details, absent from
            IndiaMART, Justdial and Sulekha. LLMs cannot describe what they cannot understand.
            When a competitor is cited and you are not, you don't just lose a click — you lose
            the entire consideration set.
          </p>

          <h2 className="font-display text-2xl font-bold text-ink">
            How AI Visibility differs from SEO
          </h2>
          <p>
            SEO optimises for a ranking algorithm that returns ten blue links. AI Visibility
            optimises for a language model that generates a single answer. The signals overlap —
            structured data, clean HTML, entity clarity — but the goals are different. SEO wants
            clicks; AI Visibility wants <em>citations</em>. A page that ranks #3 on Google can
            still be invisible to Perplexity if it lacks schema, clear entity naming and
            trustworthy cross-references.
          </p>

          <h2 className="font-display text-2xl font-bold text-ink">What to fix first</h2>
          <p>
            Start with the boring wins: add Organization and LocalBusiness schema, put your GST
            number and address in the footer, claim your IndiaMART and Justdial profiles, and
            make sure your homepage tells an AI in one paragraph what you sell, to whom, and
            where. Then check yourself in ChatGPT and Perplexity. If the answer is wrong or
            missing, you have your roadmap.
          </p>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center">
            <p className="text-[15px] text-slate-600">
              Want to see exactly how AI describes your business today?
            </p>
            <Link
              to="/"
              hash="scan"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Get my free AI Visibility Report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}