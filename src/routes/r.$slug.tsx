import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Globe,
  Minus,
  Phone,
  X,
} from "lucide-react";

import { Logo } from "@/components/site/Logo";
import kliviqLogo from "@/assets/kliviq-logo.png.asset.json";
import { loadReportBySlug, trackReportView, type ReportViewData } from "@/lib/server/report";

type Status = "pass" | "partial" | "fail";
type Effort = "Quick Win" | "2–3 Days" | "1 Week";

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

function StatusIcon({ s }: { s: Status }) {
  const base = "inline-flex h-5 w-5 items-center justify-center rounded-full";
  if (s === "pass")
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        <Check className="h-3 w-3" />
      </span>
    );
  if (s === "partial")
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        <Minus className="h-3 w-3" />
      </span>
    );
  return (
    <span className={`${base} bg-rose-100 text-rose-700`}>
      <X className="h-3 w-3" />
    </span>
  );
}

function effortBadge(e: Effort) {
  return {
    "Quick Win": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "2–3 Days": "border-amber-200 bg-amber-50 text-amber-700",
    "1 Week": "border-sky-200 bg-sky-50 text-sky-700",
  }[e];
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
  const grouped = report.categories.map((cat) => ({
    ...cat,
    checks: report.checks.filter((c) => c.cat === cat.key),
  }));

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

        {/* Priority fixes */}
        <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold">Top 5 priority fixes</h2>
          <p className="mt-1 text-sm text-slate-600">Highest impact per hour of effort.</p>
          <ol className="mt-6 space-y-4">
            {report.fixes.map((f, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] font-display text-base font-bold text-white">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-bold">{f.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${effortBadge(f.effort)}`}
                    >
                      {f.effort}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      +{f.impact} pts
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <Watermark />
        </section>

        {/* Projected score */}
        <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold">Projected score after fixes</h2>
          <div className="mt-6 grid grid-cols-3 items-center gap-4 text-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                Today
              </div>
              <div className="mt-2 font-display text-5xl font-extrabold tabular-nums text-slate-700">
                {report.score}
              </div>
              <div
                className={`mt-2 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${gradeBadgeClass(report.grade)}`}
              >
                Grade {report.grade}
              </div>
            </div>
            <div className="text-4xl text-[#f59e0b]">→</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
                After fixes
              </div>
              <div className="mt-2 font-display text-5xl font-extrabold tabular-nums text-[#f59e0b]">
                {report.projected}
              </div>
              <div className="mt-2 inline-flex items-center justify-center rounded-md bg-[#10b981] px-2 py-0.5 text-xs font-bold text-white">
                Grade B
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            Implementing the 5 fixes above would move you from bottom third to top quartile in AI
            visibility.
          </p>
          <Watermark />
        </section>

        {/* CTA */}
        <section className="no-print relative mt-6 overflow-hidden rounded-2xl border border-emerald-100 bg-[#ecfdf5] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Want us to fix these for you?
          </h2>
          <p className="mt-2 max-w-2xl text-slate-700">
            Our team at KlivIQ implements these fixes for Indian businesses. Book a free 20-min
            call.
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
            className="mt-6 inline-flex items-center gap-2"
            aria-label="KlivIQ"
          >
            <img src={kliviqLogo.url} alt="KlivIQ" className="h-8 w-auto" />
          </a>
          <Watermark />
        </section>

        {/* Appendix */}
        <section className="relative mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold">Full check appendix</h2>
          <p className="mt-1 text-sm text-slate-600">All 30 checks with evidence.</p>
          <div className="mt-6 space-y-3">
            {grouped.map((g) => (
              <details
                key={g.key}
                className="group rounded-xl border border-slate-200 bg-slate-50 open:bg-white print:open"
                open
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusBarColor(g.status)}`} />
                    <span className="font-display font-bold">{g.key}</span>
                    <span className="text-sm text-slate-600">{g.score}/100</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-200 px-4 py-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {g.checks.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="w-6 py-2.5 pr-3 align-top">
                            <StatusIcon s={c.status} />
                          </td>
                          <td className="py-2.5 pr-4 align-top font-medium text-[#0f172a]">
                            {c.name}
                          </td>
                          <td className="py-2.5 align-top text-slate-600">{c.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
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