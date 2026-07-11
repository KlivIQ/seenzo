import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Seenzo" },
      {
        name: "description",
        content:
          "Seenzo Privacy Policy. Learn what data we collect, how we use it, where it is stored and how to request deletion.",
      },
      { property: "og:title", content: "Privacy Policy — Seenzo" },
      {
        property: "og:description",
        content:
          "Seenzo Privacy Policy. Learn what data we collect, how we use it, where it is stored and how to request deletion.",
      },
      { name: "twitter:title", content: "Privacy Policy — Seenzo" },
      {
        name: "twitter:description",
        content:
          "Seenzo Privacy Policy. Learn what data we collect, how we use it, where it is stored and how to request deletion.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.seenzo.in/" },
            { "@type": "ListItem", position: 2, name: "Privacy Policy", item: "https://www.seenzo.in/privacy" },
          ],
        }),
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">Legal</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: 6 July 2026</p>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Who we are</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Seenzo is operated by{" "}
            <strong className="text-ink">KlivIQ Technologies OPC Private Limited</strong>, an Indian
            company. This Privacy Policy explains how we collect, use, store and protect the
            personal data you share with us when you request a free AI Visibility Report or
            otherwise interact with our website.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">What data we collect</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            When you submit a scan request, we collect the following information:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            <li>Your name</li>
            <li>Business name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Website URL</li>
          </ul>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We do not collect payment information, passwords or government IDs through the free scan
            form.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Why we collect it</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We use your data for two specific purposes:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            <li>
              <strong className="text-ink">AI visibility scanning:</strong> to run the scan against
              ChatGPT, Gemini, Perplexity and Claude, generate your Visibility Score, and deliver
              the report by email and/or WhatsApp.
            </li>
            <li>
              <strong className="text-ink">KlivIQ service outreach:</strong> to follow up with
              relevant information about Seenzo and other KlivIQ services that may help your
              business get found by AI engines.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Where your data is stored</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Your data is stored on servers located in the India region. We do not transfer personal
            data outside India for processing unless required to deliver a service you have
            explicitly requested, and only with adequate safeguards in place.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">How long we keep it</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We retain your personal data only for as long as it is needed for the purposes described
            above. You may request deletion of your data at any time by emailing us at{" "}
            <a
              href="mailto:hello@kliviq.com"
              className="font-medium text-brand-ink underline underline-offset-4 hover:text-ink"
            >
              hello@kliviq.com
            </a>
            . We will complete the deletion within{" "}
            <strong className="text-ink">7 business days</strong> of receiving and verifying your
            request.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">DPDP Act 2023 compliance</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We process personal data in accordance with the Digital Personal Data Protection Act,
            2023 (DPDP Act). In particular:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            <li>
              We collect and process personal data only with your consent, or as necessary for a
              legitimate use consistent with the DPDP Act.
            </li>
            <li>
              We use your data only for the purposes stated in this Privacy Policy and do not sell
              or rent it to third parties.
            </li>
            <li>
              We implement reasonable technical and organisational measures to protect your data
              from unauthorised access, disclosure, alteration or destruction.
            </li>
            <li>
              You have the right to access, correct, update and request deletion of your personal
              data. You also have the right to withdraw consent and to register a grievance with us.
            </li>
            <li>
              In case of a personal data breach that is likely to cause harm to you, we will notify
              the Data Protection Board of India and affected users in accordance with the DPDP Act.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Cookies and analytics</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We may use essential cookies and basic analytics to understand how visitors use our
            website. We do not use these technologies to track you across unrelated websites or to
            build advertising profiles.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Contact us</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            For questions, access requests, corrections, deletion requests or grievances related to
            this Privacy Policy, please write to{" "}
            <a
              href="mailto:hello@kliviq.com"
              className="font-medium text-brand-ink underline underline-offset-4 hover:text-ink"
            >
              hello@kliviq.com
            </a>
            .
          </p>
        </section>
      </div>
    </SiteShell>
  );
}
