import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { faqs } from "@/lib/faq-data";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
  head: () => ({
    meta: [
      { title: "FAQ — Seenzo AI Visibility for Indian businesses" },
      {
        name: "description",
        content:
          "Answers about Seenzo's free AI Visibility Report, how ChatGPT, Gemini, Perplexity and Claude scan Indian businesses, the difference between SEO, GEO and AEO, and how your data is handled under the DPDP Act.",
      },
      { property: "og:title", content: "Seenzo FAQ — AI Visibility, GEO and AEO for India" },
      {
        property: "og:description",
        content:
          "Everything Indian founders and small business owners ask about AI search, GEO, AEO and the Seenzo Visibility Report.",
      },
      { property: "og:url", content: "https://seenzo-visibility-boost.lovable.app/faq" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://seenzo-visibility-boost.lovable.app/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});

function FAQPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 pt-16 pb-8 sm:pt-20">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">FAQ</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Questions, answered.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Common questions from Indian founders and small business owners about AI search, GEO, AEO
          and the free Seenzo Visibility Report.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {faqs.map((it, i) => (
            <FAQItem key={i} q={it.q} a={it.a} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center">
          <p className="text-[15px] text-slate-600">
            Still unsure how AI describes your business?
          </p>
          <a
            href="/#scan"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get my free AI Visibility Report
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-sm text-slate-500">
            New to the terminology? Read the{" "}
            <a href="/glossary" className="font-semibold text-brand-ink hover:underline">
              AI search glossary
            </a>
            .
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-ink">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-6 pb-5 text-[15px] leading-relaxed text-slate-600">{a}</div>}
    </div>
  );
}