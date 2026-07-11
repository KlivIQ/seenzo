import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Seenzo — AI Visibility for Indian Businesses" },
      {
        name: "description",
        content:
          "Learn about Seenzo, the AI Visibility scoring platform built by KlivIQ Technologies OPC Private Limited for Indian businesses.",
      },
      { property: "og:title", content: "About Seenzo — AI Visibility for Indian Businesses" },
      {
        property: "og:description",
        content:
          "Learn about Seenzo, the AI Visibility scoring platform built by KlivIQ Technologies OPC Private Limited for Indian businesses.",
      },
      { name: "twitter:title", content: "About Seenzo — AI Visibility for Indian Businesses" },
      {
        name: "twitter:description",
        content:
          "Learn about Seenzo, the AI Visibility scoring platform built by KlivIQ Technologies OPC Private Limited for Indian businesses.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Seenzo",
          url: "https://www.seenzo.in/about",
          mainEntity: {
            "@type": "Organization",
            name: "Seenzo",
            url: "https://www.seenzo.in",
            parentOrganization: {
              "@type": "Organization",
              name: "KlivIQ Technologies OPC Private Limited",
              url: "https://www.kliviq.com",
            },
          },
          founder: {
            "@type": "Person",
            name: "Sriram Ramkumar",
            jobTitle: "Founder",
            worksFor: { "@type": "Organization", name: "KlivIQ Technologies" },
            url: "https://www.linkedin.com/in/sriramr2212",
          },
        }),
      },
    ],
  }),
});

function AboutPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">Company</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          About Seenzo
        </h1>

        <section className="mt-10">
          <p className="text-[15px] leading-relaxed text-slate-600">
            Seenzo is an AI Visibility scoring platform built for Indian businesses. We scan your
            website and tell you exactly how ChatGPT, Gemini, Perplexity and Claude see your business
            — and what to fix to get found.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-[15px] leading-relaxed text-slate-600">
            Seenzo is built by{" "}
            <strong className="text-ink">KlivIQ Technologies OPC Private Limited</strong>, a boutique
            AI consulting and technology studio based in Chennai, India. KlivIQ was founded by Sriram
            Ramkumar, a technology professional with 20+ years enterprise IT experience across
            clients including Diageo, JPMC, GSK and AIG. KlivIQ builds AI-powered tools, web and
            mobile applications, and automation frameworks for businesses across India and globally.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-[15px] leading-relaxed text-slate-600">
            Seenzo was born from a simple observation: most Indian business websites are invisible to
            AI engines — not because of bad content, but because of fixable technical gaps. We built
            the scanner we wished existed when we were optimising our own site.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Contact</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            <a
              href="mailto:hello@kliviq.com?subject=Seenzo%20inquiry"
              className="font-medium text-brand-ink underline underline-offset-4 hover:text-ink"
            >
              hello@kliviq.com
            </a>{" "}
            |{" "}
            <a
              href="https://wa.me/919840497937"
              className="font-medium text-brand-ink underline underline-offset-4 hover:text-ink"
              target="_blank"
              rel="noopener noreferrer"
            >
              +91 98404 97937
            </a>{" "}
            | Chennai, India
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
