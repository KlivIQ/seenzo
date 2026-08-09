import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Calendar, Download, ExternalLink, Globe, Phone } from "lucide-react";

import { Logo } from "@/components/site/Logo";
import { loadReportBySlug, trackReportView, type ReportViewData } from "@/lib/server/report";

type Status = "pass" | "partial" | "fail";

const getReportPageData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const result = await loadReportBySlug(slug);
    if (!result) return { found: false as const };
    await trackReportView(result.leadId, slug);
    return { found: true as const, report: result.data };
  });

export const Route = createFileRoute("/r/$slug")({
  component: ReportPage,
  loader: ({ params }) => getReportPageData({ data: params.slug }),
  head: () => ({
    meta: [
      { title: "Your Seenzo Scan Report" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Seenzo AI-visibility scan report — how ChatGPT, Gemini, Perplexity and Claude see your business.",
      },
    ],
  }),
});

function trackCtaClick(slug: string, event: "cta_consult_clicked" | "cta_whatsapp_clicked") {
  void fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, event }),
  }).catch(() => {});
}

function gradeBadgeClass(g: string) {
  return (
    {
      A: "bg-[#10b981] text-white",
      B: "bg-[#10b981] text-white",
      C: "bg-[#f59e0b] text-white",
      D: "bg-orange-500 text-white",
      F: "bg-rose-500 text-white",
    }[g] ?? "bg-slate-500 text-white"
  );
}

function statusBarColor(s: Status) {
  return {
    pass: "bg-[#10b981]",
    partial: "bg-[#f59e0b]",
    fail: "bg-rose-500",
  }[s];
}

function Watermark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-2 right-3 select-none text-[10px] font-medium tracking-wide text-[#e2e8f0] print:text-slate-300"
    >
      seenzo.in
    </span>
  );
}

// ---------- Score dial ----------
function ScoreDial({ score }: { score: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 120);
    return () => clearTimeout(t);
  }, [score]);
  const size = 240;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#f59e0b"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-6xl font-extrabold tabular-nums text-[#0f172a]">
          {score}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          out of 100
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
function ReportPage() {
  const { slug } = Route.useParams();
  const result = Route.useLoaderData();

  if (!result.found) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-5 font-sans text-[#0f172a] antialiased">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Report not found</h1>
          <p className="mt-2 text-slate-600">
            We couldn't find a scan report for this link. It may have expired or the URL may be
            incorrect.
          </p>
        </div>
      </div>
    );
  }

  const report: ReportViewData = result.report;
  const topIssues = report.issues.slice(0, 5);
  const remainingIssues = report.issues.slice(5);

  return (
    <div className="min-h-screen bg-white font-sans text-[#0f172a] antialiased">
      {/* Print-only running header */}
      <div className="hidden print:block print-running-header">seenzo.in</div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white print:border-slate-300">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo subLine={null} />
            <a
              href="https://kliviq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold tracking-wide text-slate-500 transition hover:text-[#10b981]"
            >
              by KlivIQ
            </a>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center justify-center gap-2 rounded-lg border border-[#10b981] bg-white px-4 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#ecfdf5]"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        {/* Report meta */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
            Scan report · #{slug}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {report.business}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              {report.url}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Scanned {report.scannedAt}
            </span>
          </div>
          <Watermark />
        </div>

        {/* Hero: dial + verdict */}
        <section className="relative mt-6 grid gap-6 rounded-2xl border border-emerald-100 bg-[#ecfdf5] p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
          <div className="mx-auto rounded-2xl bg-white p-4 shadow-sm">
            <ScoreDial score={report.score} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-xl font-display text-3xl font-black ${gradeBadgeClass(report.grade)}`}
              >
                {report.grade}
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                  Overall grade
                </div>
                <div className="font-display text-xl font-bold">Needs work</div>
              </div>
            </div>
            <p className="mt-5 text-lg leading-relaxed text-slate-700">{report.verdict}</p>
          </div>
          <Watermark />
        </section>

        {/* Navigation pills */}
        <nav className="no-print mt-6 flex flex-wrap gap-3">
          <a
            href="https://www.seenzo.in/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-[#10b981] px-5 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#ecfdf5]"
          >
            Contact us
          </a>
          <a
            href="https://www.kliviq.com/#products"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-[#10b981] px-5 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#ecfdf5]"
          >
            Our Products
          </a>
          <a
            href="https://www.kliviq.com/#services"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-[#10b981] px-5 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#ecfdf5]"
          >
            Our Services
          </a>
        </nav>

        {/* Category bars */}
        <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold">Category scores</h2>
          <p className="mt-1 text-sm text-slate-600">
            Six pillars that decide how AI engines describe you.
          </p>
          <div className="mt-6 space-y-5">
            {report.categories.map((c, i) => (
              <CategoryBar key={c.key} c={c} delay={i * 80} />
            ))}
          </div>
          <Watermark />
        </section>

        {/* Top issues */}
        <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold">Top 5 issues found</h2>
          <p className="mt-1 text-sm text-slate-600">
            The highest-impact gaps in how AI engines see your business.
          </p>
          <ol className="mt-6 space-y-4">
            {topIssues.map((issue, i) => (
              <li
                key={issue.title}
                className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] font-display text-base font-bold text-white">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold">{issue.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{issue.evidence}</p>
                </div>
              </li>
            ))}
          </ol>
          <Watermark />
        </section>

        {/* Remaining issues */}
        {remainingIssues.length > 0 && (
          <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-xl font-bold">Issues to be fixed</h2>
            <p className="mt-1 text-sm text-slate-600">
              The rest of what's holding back your AI visibility.
            </p>
            <ul className="mt-6 space-y-3">
              {remainingIssues.map((issue) => (
                <li
                  key={issue.title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <h3 className="font-display text-sm font-bold">{issue.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{issue.evidence}</p>
                </li>
              ))}
            </ul>
            <Watermark />
          </section>
        )}

        {/* CTA */}
        <section className="no-print relative mt-6 overflow-hidden rounded-2xl border border-emerald-100 bg-[#ecfdf5] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Ready to fix these?</h2>
          <p className="mt-2 max-w-2xl text-slate-700">
            These are the specific gaps holding your AI visibility back. Fixing them involves
            technical changes to your site's code and structured data — this is exactly what we do
            for Indian businesses at KlivIQ. Book a free 20-minute call and we'll walk you through
            your complete fix plan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://cal.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick(slug, "cta_consult_clicked")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f59e0b] px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
            >
              <Calendar className="h-4 w-4" />
              Book free consultation
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://wa.me/919840497937"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick(slug, "cta_whatsapp_clicked")}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#10b981] bg-white px-5 py-3 text-sm font-bold text-[#10b981] transition hover:bg-[#ecfdf5]"
            >
              <Phone className="h-4 w-4" />
              WhatsApp us
            </a>
          </div>
          <a
            href="https://kliviq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm font-semibold tracking-wide text-slate-500 transition hover:text-[#10b981]"
          >
            by KlivIQ
          </a>
          <Watermark />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-5 text-center text-xs text-slate-500">
          <div>Report generated by Seenzo by KlivIQ · seenzo.in</div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a href="/privacy" className="hover:text-[#10b981]">
              Privacy Policy
            </a>
            <span aria-hidden>·</span>
            <a href="/terms" className="hover:text-[#10b981]">
              Terms
            </a>
            <span aria-hidden>·</span>
            <a href="/#contact" className="hover:text-[#10b981]">
              Contact
            </a>
          </div>
          <div className="mt-2">© KlivIQ Technologies OPC Private Limited</div>
        </div>
      </footer>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          @page { margin: 18mm 14mm; }
          html, body { background: #ffffff !important; color: #000000 !important; }
          .no-print { display: none !important; }
          .print-running-header {
            position: fixed;
            top: 6mm;
            right: 10mm;
            font-size: 10px;
            color: #94a3b8;
            letter-spacing: 0.05em;
          }
          a { color: inherit !important; text-decoration: none !important; }
          section, .rounded-2xl { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function CategoryBar({
  c,
  delay,
}: {
  c: { key: string; score: number; status: Status };
  delay: number;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(c.score), 120 + delay);
    return () => clearTimeout(t);
  }, [c.score, delay]);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusBarColor(c.status)}`} />
          <span className="font-semibold text-[#0f172a]">{c.key}</span>
        </div>
        <span className="font-mono tabular-nums text-slate-700">{c.score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${statusBarColor(c.status)}`}
          style={{ width: `${w}%`, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  );
}
