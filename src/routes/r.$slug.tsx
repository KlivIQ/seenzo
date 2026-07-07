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
  Printer,
  X,
} from "lucide-react";

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

function gradeColor(g: string) {
  return (
    {
      A: "bg-emerald-500 text-emerald-950",
      B: "bg-lime-400 text-lime-950",
      C: "bg-amber-500 text-amber-950",
      D: "bg-orange-500 text-orange-950",
      F: "bg-rose-500 text-rose-50",
    }[g] ?? "bg-slate-500 text-white"
  );
}

function statusColor(s: Status) {
  return {
    pass: "bg-emerald-500",
    partial: "bg-amber-500",
    fail: "bg-rose-500",
  }[s];
}

function StatusIcon({ s }: { s: Status }) {
  const base = "inline-flex h-5 w-5 items-center justify-center rounded-full";
  if (s === "pass")
    return (
      <span className={`${base} bg-emerald-500/20 text-emerald-400`}>
        <Check className="h-3 w-3" />
      </span>
    );
  if (s === "partial")
    return (
      <span className={`${base} bg-amber-500/20 text-amber-400`}>
        <Minus className="h-3 w-3" />
      </span>
    );
  return (
    <span className={`${base} bg-rose-500/20 text-rose-400`}>
      <X className="h-3 w-3" />
    </span>
  );
}

function effortBadge(e: Effort) {
  return {
    "Quick Win": "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    "2–3 Days": "border-amber-400/40 bg-amber-500/10 text-amber-300",
    "1 Week": "border-sky-400/40 bg-sky-500/10 text-sky-300",
  }[e];
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
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#F59E0B"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-6xl font-extrabold text-white tabular-nums">{score}</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 font-sans text-slate-100 antialiased">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-white">Report not found</h1>
          <p className="mt-2 text-slate-400">
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased print:bg-white print:text-black">
      {/* Header */}
      <header className="no-print border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 font-display text-lg font-black text-amber-950">
              S
            </div>
            <div>
              <div className="font-display text-lg font-bold text-white leading-tight">Seenzo</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-400">by KlivIQ</div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        {/* Report meta */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 print:border-slate-300 print:bg-white">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Scan report · #{slug}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl print:text-black">
            {report.business}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400 print:text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              {report.url}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Scanned {report.scannedAt}
            </span>
          </div>
        </div>

        {/* Hero: dial + verdict */}
        <section className="mt-6 grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-center print:border-slate-300 print:bg-white">
          <div className="mx-auto">
            <ScoreDial score={report.score} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-xl font-display text-3xl font-black ${gradeColor(report.grade)}`}
              >
                {report.grade}
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600">
                  Overall grade
                </div>
                <div className="font-display text-xl font-bold text-white print:text-black">
                  Needs work
                </div>
              </div>
            </div>
            <p className="mt-5 text-lg leading-relaxed text-slate-200 print:text-slate-800">
              {report.verdict}
            </p>
          </div>
        </section>

        {/* Category bars */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
          <h2 className="font-display text-xl font-bold text-white print:text-black">
            Category scores
          </h2>
          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
            Six pillars that decide how AI engines describe you.
          </p>
          <div className="mt-6 space-y-5">
            {report.categories.map((c, i) => (
              <CategoryBar key={c.key} c={c} delay={i * 80} />
            ))}
          </div>
        </section>

        {/* Priority fixes */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
          <h2 className="font-display text-xl font-bold text-white print:text-black">
            Top 5 priority fixes
          </h2>
          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
            Highest impact per hour of effort.
          </p>
          <ol className="mt-6 space-y-4">
            {report.fixes.map((f, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-5 print:border-slate-200 print:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 font-display text-base font-bold text-amber-950">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-bold text-white print:text-black">
                      {f.title}
                    </h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${effortBadge(f.effort)}`}
                    >
                      {f.effort}
                    </span>
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                      +{f.impact} pts
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300 print:text-slate-700">
                    {f.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Projected score */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
          <h2 className="font-display text-xl font-bold text-white print:text-black">
            Projected score after fixes
          </h2>
          <div className="mt-6 grid grid-cols-3 items-center gap-4 text-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600">
                Today
              </div>
              <div className="mt-2 font-display text-5xl font-extrabold text-slate-300 tabular-nums print:text-slate-800">
                {report.score}
              </div>
              <div
                className={`mt-2 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${gradeColor(report.grade)}`}
              >
                Grade {report.grade}
              </div>
            </div>
            <div className="text-4xl text-amber-400">→</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                After fixes
              </div>
              <div className="mt-2 font-display text-5xl font-extrabold text-amber-400 tabular-nums">
                {report.projected}
              </div>
              <div className="mt-2 inline-flex items-center justify-center rounded-md bg-lime-400 px-2 py-0.5 text-xs font-bold text-lime-950">
                Grade B
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-400 print:text-slate-600">
            Implementing the 5 fixes above would move you from bottom third to top quartile in AI
            visibility.
          </p>
        </section>

        {/* CTA */}
        <section className="no-print mt-6 overflow-hidden rounded-2xl bg-amber-500 p-8 text-amber-950 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Want us to fix these for you?
          </h2>
          <p className="mt-2 max-w-2xl text-amber-950/80">
            Book a free 20-minute consultation with the KlivIQ team. We'll walk you through your
            report and show you exactly what a fix plan looks like.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://cal.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick(slug, "cta_consult_clicked")}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-950 px-5 py-3 text-sm font-bold text-amber-50 transition hover:bg-black"
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
              className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-950 bg-transparent px-5 py-3 text-sm font-bold text-amber-950 transition hover:bg-amber-950 hover:text-amber-50"
            >
              <Phone className="h-4 w-4" />
              WhatsApp us
            </a>
          </div>
        </section>

        {/* Appendix */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 print:border-slate-300 print:bg-white">
          <h2 className="font-display text-xl font-bold text-white print:text-black">
            Full check appendix
          </h2>
          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
            All 30 checks with evidence.
          </p>
          <div className="mt-6 space-y-3">
            {grouped.map((g) => (
              <details
                key={g.key}
                className="group rounded-xl border border-white/10 bg-slate-900/40 open:bg-slate-900/60 print:border-slate-200 print:bg-white print:open"
                open
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColor(g.status)}`} />
                    <span className="font-display font-bold text-white print:text-black">
                      {g.key}
                    </span>
                    <span className="text-sm text-slate-400 print:text-slate-600">
                      {g.score}/100
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/10 px-4 py-3 print:border-slate-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {g.checks.map((c, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/5 last:border-0 print:border-slate-100"
                        >
                          <td className="py-2.5 pr-3 align-top w-6">
                            <StatusIcon s={c.status} />
                          </td>
                          <td className="py-2.5 pr-4 align-top font-medium text-slate-200 print:text-black">
                            {c.name}
                          </td>
                          <td className="py-2.5 align-top text-slate-400 print:text-slate-700">
                            {c.evidence}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10 bg-slate-950 py-8 no-print">
        <div className="mx-auto max-w-5xl px-5 text-center text-xs text-slate-500">
          Report generated by Seenzo by KlivIQ · seenzo.in · Data sourced from publicly available
          information
        </div>
      </footer>

      {/* Print-only footer */}
      <div className="hidden print:block print-only-footer mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
        Report generated by Seenzo by KlivIQ · seenzo.in · Data sourced from publicly available
        information
      </div>
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
          <span className={`h-2 w-2 rounded-full ${statusColor(c.status)}`} />
          <span className="font-semibold text-white print:text-black">{c.key}</span>
        </div>
        <span className="font-mono tabular-nums text-slate-300 print:text-slate-800">
          {c.score}/100
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10 print:bg-slate-200">
        <div
          className={`h-full rounded-full ${statusColor(c.status)}`}
          style={{ width: `${w}%`, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  );
}
