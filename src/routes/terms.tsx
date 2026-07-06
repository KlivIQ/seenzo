import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Seenzo" },
      {
        name: "description",
        content:
          "Seenzo Terms of Service. Read the terms that apply to the free AI Visibility Report and your use of this website.",
      },
      { property: "og:title", content: "Terms of Service — Seenzo" },
      {
        property: "og:description",
        content:
          "Seenzo Terms of Service. Read the terms that apply to the free AI Visibility Report and your use of this website.",
      },
      { name: "twitter:title", content: "Terms of Service — Seenzo" },
      {
        name: "twitter:description",
        content:
          "Seenzo Terms of Service. Read the terms that apply to the free AI Visibility Report and your use of this website.",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
          Legal
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: 6 July 2026
        </p>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">About these terms</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            These Terms of Service govern your use of the Seenzo website and the free AI Visibility Report provided by{" "}
            <strong className="text-ink">KlivIQ Technologies OPC Private Limited</strong>. By submitting your website
            for a scan or otherwise using our services, you agree to these terms.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Free scan is provided as-is</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            The free AI Visibility Report is provided on an "as-is" and "as-available" basis without warranties of
            any kind, either express or implied. We do not guarantee that the report will be error-free, complete,
            accurate at all times, or that it will produce any specific business outcome. Results are indicative and
            based on the behaviour of third-party AI models at the time of scanning.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Where scan data comes from</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Scan data is sourced from publicly available information and from the outputs of publicly accessible AI
            engines, including ChatGPT, Google Gemini, Perplexity and Anthropic Claude. We do not hack, scrape behind
            login walls, or access non-public systems to obtain this information. You are responsible for ensuring you
            have the right to request a scan of the website URL you submit.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Consent to be contacted</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            By submitting a scan request, you consent to being contacted by KlivIQ Technologies OPC Private Limited and
            its representatives via:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            <li>Email, at the address you provide</li>
            <li>WhatsApp, at the phone number you provide</li>
          </ul>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Contact may include delivery of your report, follow-up questions about your scan results, and information
            about Seenzo or other KlivIQ services that may be relevant to your business.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">How to opt out</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            You can opt out of future communications at any time:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            <li>
              On WhatsApp, reply with the keyword <strong className="text-ink">STOP</strong>.
            </li>
            <li>
              By email, reply to any message from us with the word <strong className="text-ink">UNSUBSCRIBE</strong> or{" "}
              <strong className="text-ink">STOP</strong>.
            </li>
          </ul>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Once you opt out, we will stop sending marketing and follow-up messages within a reasonable time, but we
            may still send one final confirmation of your opt-out request.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Your responsibilities</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            You agree to provide accurate information, to use Seenzo only for lawful purposes, and not to use the report
            or our platform to mislead others, infringe intellectual property, or violate any applicable law. You must
            have the authority to request a scan of the website URL you submit.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Limitation of liability</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            To the fullest extent permitted by law, KlivIQ Technologies OPC Private Limited shall not be liable for any
            indirect, incidental, special, consequential or punitive damages, or any loss of profits, revenue, data or
            goodwill, arising out of or related to your use of the free scan or this website.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Changes to these terms</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            We may update these Terms of Service from time to time. The latest version will always be posted on this
            page with the updated date. Continued use of Seenzo after changes are posted means you accept the revised
            terms.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Contact us</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            For questions about these Terms of Service, please contact us at{" "}
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
