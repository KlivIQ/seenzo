import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  X,
  Search,
  FileText,
  Sparkles,
  Globe2,
  MessageCircle,
  ShieldCheck,
  BarChart3,
  Target,
  Languages,
  Star,
  Quote,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ScanForm } from "@/components/site/ScanForm";
import { faqs } from "@/lib/faq-data";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Seenzo — See how AI sees your business" },
      {
        name: "description",
        content:
          "Free AI Visibility Report for Indian businesses. Find out how ChatGPT, Gemini, Perplexity and Claude describe your business — and how to get found.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-white font-sans text-ink antialiased">
      <NavBar />
      <Hero />
      <TrustedBy />
      <WhyItMatters />
      <HowItWorks />
      <ScoreOverview />
      <SampleReport />
      <Features />
      <Benefits />
      <Comparison />
      <WhyIndia />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  );
}

/* ---------- Nav ---------- */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const navLinks: Array<[string, string]> = [
    ["Home", "#top"],
    ["How it works", "#how"],
    ["Score", "#score"],
    ["Sample report", "#sample"],
    ["Benefits", "#benefits"],
    ["Features", "#features"],
    ["FAQ", "#faq"],
    ["Blog", "/blog"],
    ["Contact", "#contact"],
  ];
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-slate-200 bg-white/85 backdrop-blur" : "border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[15px] font-medium text-slate-600 transition hover:text-ink"
            >
              {label}
            </a>
          ))}
          <a
            href="https://www.kliviq.com/#products"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-bold text-brand transition hover:text-brand-ink"
          >
            kliviq.com
          </a>
        </nav>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[15px] font-medium text-slate-600 transition hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <a
              href="https://www.kliviq.com/#products"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-bold text-brand transition hover:text-brand-ink"
              onClick={() => setMenuOpen(false)}
            >
              kliviq.com
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <BackgroundGrid />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pt-16 pb-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-x-14 lg:gap-y-6 lg:pt-24 lg:pb-32">
        {/* Lead: pills + headline */}
        <div className="rise-in order-1 lg:col-span-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-ink">
              <Sparkles className="h-3.5 w-3.5" />
              Get seen by AI
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              Built in India · For Indian businesses
            </div>
          </div>
          <h2 className="mt-6 font-display text-[19px] leading-[1.1] font-extrabold tracking-tight text-ink sm:text-[24px] lg:text-[27px]">
            Search is moving to <span className="text-brand">AI</span>.
            <br /> Can it find your business?
            <br /> Do a 30-second check.
          </h2>
        </div>

        {/* Form */}
        <div
          id="scan"
          className="rise-in order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 [animation-delay:120ms] scroll-mt-24"
        >
          <ScanForm />
        </div>

        {/* Details: subtitle + bullets + buttons + trust */}
        <div className="rise-in order-3 lg:col-span-1">
          <p className="max-w-xl text-lg text-slate-600">
            Get your AI Visibility Score, engine-by-engine breakdown and prioritised fix list —
            right here on this page in about 30 seconds.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-base text-slate-600">
            {[
              "Scans ChatGPT, Gemini, Perplexity, Claude",
              "India-specific directory & GST checks",
              "Plain-English fix list you can act on this week",
            ].map((t) => (
              <li key={t} className="inline-flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-slate-300"
            >
              See how it works
            </a>
            <a
              href="#sample"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-slate-300"
            >
              Sample report
            </a>
            <a
              href="#benefits"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-slate-300"
            >
              Benefits
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {[
              "No contracts",
              "No 12-month lock-ins",
              "Results in 30 seconds",
              "100% free scan",
            ].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #E2E8F0 1px, transparent 1px), linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, #000 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(16,185,129,0.15), transparent)",
        }}
      />
    </>
  );
}

function HeroReportCard() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    const target = 42;
    const t = setTimeout(() => {
      let v = 0;
      const iv = setInterval(() => {
        v += 2;
        setScore(Math.min(v, target));
        if (v >= target) clearInterval(iv);
      }, 24);
    }, 300);
    return () => clearTimeout(t);
  }, []);
  const models = [
    { name: "ChatGPT", value: 55 },
    { name: "Gemini", value: 38 },
    { name: "Perplexity", value: 62 },
    { name: "Claude", value: 24 },
  ];
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.25)] sm:p-7">
      <div className="flex items-center justify-between text-sm font-medium text-slate-500">
        <span>AI Visibility Report</span>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-sm text-brand-ink">
          Sample
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <div className="font-display text-6xl font-extrabold text-ink tabular-nums">{score}</div>
          <div className="mt-1 text-sm font-medium tracking-wide text-slate-500 uppercase">
            Visibility Score · Needs work
          </div>
        </div>
        <ScoreDial value={score} />
      </div>

      <div className="mt-7 space-y-3">
        {models.map((m, i) => (
          <ModelBar key={m.name} name={m.name} value={m.value} delay={i * 120} />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Top fix</div>
        <div className="mt-1 text-sm text-ink">
          Add a services schema on your homepage — recovers ~18 points across 3 engines.
        </div>
      </div>
    </div>
  );
}

function ScoreDial({ value }: { value: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="90" height="90" viewBox="0 0 80 80" className="-mr-1">
      <circle cx="40" cy="40" r={r} stroke="#E2E8F0" strokeWidth="8" fill="none" />
      <circle
        cx="40"
        cy="40"
        r={r}
        stroke="#F59E0B"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: "stroke-dashoffset 60ms linear" }}
      />
    </svg>
  );
}

function ModelBar({ name, value, delay }: { name: string; value: number; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), delay + 400);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{name}</span>
        <span className="tabular-nums text-slate-500">{w}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${w}%`, transition: "width 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  );
}

/* ---------- Trusted by ---------- */
function TrustedBy() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/60 py-10">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-sm font-semibold tracking-widest text-slate-500 uppercase">
          Used by early testers across Chennai, Bengaluru and Pune
        </p>
      </div>
    </section>
  );
}

/* ---------- Why it matters ---------- */
function WhyItMatters() {
  return (
    <Section id="why">
      <SectionHeader
        eyebrow="Why AI visibility matters"
        title="Search is quietly moving to AI answers."
        sub="Your customers are asking ChatGPT, Gemini and Perplexity the same questions they used to type into Google. The answers rarely include a link — so being mentioned by name is the new #1 result."
      />
      <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="font-display text-2xl leading-snug font-bold text-ink sm:text-3xl">
          Most Indian business websites are invisible to AI engines. Yours might be too.
        </p>
      </div>
    </Section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    {
      icon: Globe2,
      title: "Share your website",
      body: "Enter your URL and a few details. No install, no code, no signup wall.",
    },
    {
      icon: Search,
      title: "We scan across AI engines",
      body: "Seenzo asks the questions your customers ask — across ChatGPT, Gemini, Perplexity and Claude — and studies how they answer.",
    },
    {
      icon: FileText,
      title: "You get a plain-English report",
      body: "Your Visibility Score, what's dragging it down, and a prioritised fix list — delivered by email and WhatsApp.",
    },
  ];
  return (
    <Section id="how" className="bg-slate-50/60">
      <SectionHeader eyebrow="How Seenzo works" title="Three steps. Under five minutes." />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-7">
            <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {i + 1}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Score overview ---------- */
function ScoreOverview() {
  const pillars = [
    { name: "Presence", value: 68, desc: "Are you mentioned when it matters?" },
    { name: "Accuracy", value: 74, desc: "Is what AI says about you correct?" },
    { name: "Citations", value: 41, desc: "Do trustworthy sources reference you?" },
    { name: "Sentiment", value: 82, desc: "Is the tone favourable to buyers?" },
  ];
  return (
    <Section id="score">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
            The Seenzo Score
          </div>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            One number. Four honest signals.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            The AI Visibility Score (0–100) tells you at a glance where you stand. The four pillars
            underneath tell you exactly what to fix first.
          </p>
          <a
            href="#scan"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get my score
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-6">
            <BigGauge value={71} />
            <div>
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Overall
              </div>
              <div className="font-display text-2xl font-bold text-ink">Good — with clear wins</div>
              <p className="mt-1 text-sm text-slate-600">
                Fixing your top two citation gaps would move this above 85.
              </p>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="text-sm font-bold tabular-nums text-brand-ink">{p.value}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${p.value}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function BigGauge({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={r}
          stroke="#10B981"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-extrabold text-ink">
        {value}
      </div>
    </div>
  );
}

/* ---------- Sample report ---------- */
function SampleReport() {
  return (
    <Section id="sample" className="bg-slate-50/60">
      <SectionHeader
        eyebrow="Sample report"
        title="What you actually receive."
        sub="No jargon. No 40-page PDF. Just what's working, what's broken, and what to fix this week."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        <SampleCard
          title="Coverage snapshot"
          body={
            <div className="space-y-3">
              {[
                { k: "ChatGPT", v: 62, ok: true },
                { k: "Gemini", v: 44, ok: false },
                { k: "Perplexity", v: 71, ok: true },
                { k: "Claude", v: 33, ok: false },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{r.k}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.ok ? "bg-brand-soft text-brand-ink" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {r.ok ? "Mentioned" : "Missing"} · {r.v}%
                  </span>
                </div>
              ))}
            </div>
          }
        />
        <SampleCard
          title="What AI says about you"
          body={
            <div className="space-y-3 text-sm text-slate-600">
              <p className="rounded-lg bg-slate-50 p-3 leading-relaxed">
                "A Chennai-based textile exporter known for bulk orders and reliable shipping."
              </p>
              <p className="rounded-lg bg-slate-50 p-3 leading-relaxed">
                "Founded 2011. GST-registered. Serves apparel brands across South India."
              </p>
            </div>
          }
        />
        <SampleCard
          title="Your fix list"
          body={
            <ul className="space-y-3 text-sm">
              {[
                "Add FAQ schema to top 5 service pages",
                "Claim IndiaMART & Justdial profiles",
                "Publish a comparison page vs top 3 competitors",
                "Fix NAP mismatch on Google Business",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          }
        />
      </div>
    </Section>
  );
}

function SampleCard({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</div>
      <div className="mt-4">{body}</div>
    </div>
  );
}

/* ---------- Features ---------- */
function Features() {
  const features = [
    {
      icon: Search,
      title: "Multi-engine scanning",
      body: "We query ChatGPT, Gemini, Perplexity, Claude and Google AI Overviews — not just one.",
    },
    {
      icon: Target,
      title: "Industry-specific prompts",
      body: "Real buyer questions for your industry, not generic keyword lookups.",
    },
    {
      icon: ShieldCheck,
      title: "Accuracy checks",
      body: "Detects hallucinations, outdated info and NAP mismatches on your public profiles.",
    },
    {
      icon: BarChart3,
      title: "Citation tracing",
      body: "Shows which sources AI is citing — and which ones your competitors own.",
    },
    {
      icon: Languages,
      title: "India-first check set",
      body: "GST, IndiaMART, Justdial, Sulekha and Google Business — all in one pass.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp delivery",
      body: "Get your report where you actually read messages, not just email.",
    },
  ];
  return (
    <Section id="features">
      <SectionHeader eyebrow="Key features" title="Everything you need to be found." />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Benefits ---------- */
function Benefits() {
  const items = [
    {
      title: "Win the answer, not just the click",
      body: "Get named in the AI response — even when there's no link to click.",
    },
    {
      title: "Fix the right things first",
      body: "A prioritised list that turns effort into score movement.",
    },
    {
      title: "Know when you're winning",
      body: "Re-scan any time and watch your Visibility Score climb.",
    },
    {
      title: "No agency lock-in",
      body: "You keep the report. You keep the wins. No 12-month contract.",
    },
  ];
  return (
    <Section id="benefits" className="bg-slate-50/60">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
            Benefits
          </div>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Real results.
            <br /> Not 12-month promises.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Most agencies sell you a year and hope you don't measure. Seenzo measures first — then
            tells you what's worth doing.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((b) => (
            <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Comparison ---------- */
function Comparison() {
  const rows: Array<[string, boolean, boolean]> = [
    ["Optimises for Google search results", true, true],
    ["Optimises for AI answers (ChatGPT, Gemini, Perplexity)", false, true],
    ["Tracks how AI describes your business", false, true],
    ["Flags AI hallucinations & outdated facts", false, true],
    ["India-specific checks (GST, IndiaMART, Justdial)", false, true],
    ["No 12-month contract", false, true],
    ["Report delivered on WhatsApp", false, true],
  ];
  return (
    <Section id="compare">
      <SectionHeader
        eyebrow="Traditional SEO vs AI Visibility"
        title="Two different games. You need to win both."
      />
      <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-slate-200 bg-slate-50/70 text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <div className="p-5">Capability</div>
          <div className="p-5 text-center">Traditional SEO</div>
          <div className="p-5 text-center text-brand-ink">Seenzo AI Visibility</div>
        </div>
        {rows.map(([label, seo, seenzo], i) => (
          <div
            key={label}
            className={`grid grid-cols-[1.6fr_1fr_1fr] items-center text-sm ${
              i < rows.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <div className="p-5 font-medium text-ink">{label}</div>
            <div className="p-5 text-center">
              {seo ? (
                <Check className="mx-auto h-4 w-4 text-slate-400" />
              ) : (
                <X className="mx-auto h-4 w-4 text-slate-300" />
              )}
            </div>
            <div className="p-5 text-center">
              {seenzo ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <X className="mx-auto h-4 w-4 text-slate-300" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Why India ---------- */
function WhyIndia() {
  const points = [
    {
      title: "Local buyer language",
      body: "Prompts written the way your customers actually ask — mixing English, Hindi, Tamil and business slang.",
    },
    {
      title: "Directory-aware checks",
      body: "IndiaMART, Justdial, Sulekha and Google Business are still where AI cross-references you. We check all of them.",
    },
    {
      title: "WhatsApp-first delivery",
      body: "Because your customers — and your team — live on WhatsApp, not on dashboards.",
    },
    {
      title: "DPDP-aware handling",
      body: "Your data stays in Mumbai. Nothing sold, nothing shared. Delete anytime, no forms.",
    },
  ];
  return (
    <Section id="india" className="bg-ink text-white">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-sm font-semibold tracking-widest text-brand uppercase">
          Built for Indian businesses
        </div>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Global tools ignore the way India buys.
        </h2>
        <p className="mt-4 text-lg text-slate-300">
          The AI visibility category is dominated by tools built for US enterprises. Seenzo is built
          from the ground up for how businesses are actually found — and hired — in India.
        </p>
      </div>
      <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-display text-lg font-bold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  return (
    <Section id="testimonials">
      <SectionHeader eyebrow="Testimonials" title="Early Seenzo users, in their words." />
      <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Quote className="mx-auto h-8 w-8 text-brand" />
        <p className="mt-4 font-display text-xl font-bold text-ink sm:text-2xl">
          Early results coming soon — be one of our first 50 scans.
        </p>
      </div>
    </Section>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  return (
    <Section id="faq" className="bg-slate-50/60">
      <SectionHeader eyebrow="FAQ" title="Questions, answered." />
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {faqs.map((it, i) => (
          <FAQItem key={i} q={it.q} a={it.a} />
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-3xl text-center">
        <a
          href="/faq"
          className="text-sm font-semibold text-brand-ink transition hover:underline"
        >
          View all FAQs →
        </a>
      </div>
    </Section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
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

/* ---------- Contact ---------- */
function Contact() {
  return (
    <Section id="contact">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
          Get in touch
        </div>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Contact us
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Have a question about your AI visibility? Reach out directly.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl bg-brand p-8 text-white shadow-xl sm:p-10">
        <div className="grid gap-5 sm:grid-cols-2">
          <a
            href="mailto:hello@kliviq.com?subject=Seenzo%20inquiry"
            className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-white/20"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Mail className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-xs font-semibold uppercase opacity-80">Email</div>
              <div className="text-sm font-semibold">hello@kliviq.com</div>
            </div>
          </a>

          <a
            href="https://wa.me/919069026969?text=Hi%20Seenzo%20team%2C%20I%20would%20like%20to%20know%20more"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-white/20"
          >
            <Phone className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-xs font-semibold uppercase opacity-80">WhatsApp only</div>
              <div className="text-sm font-semibold">+91 90690 26969</div>
            </div>
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="https://instagram.com/kliviq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KlivIQ on Instagram"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/kliviq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KlivIQ on X"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href="https://kliviq.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KlivIQ website"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <Globe2 className="h-5 w-5" />
          </a>
        </div>

        <p className="mt-6 text-center text-sm font-medium opacity-90">
          KlivIQ Technologies OPC Private Limited · India
        </p>
      </div>
    </Section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const quickLinks: Array<[string, string]> = [
    ["Home", "#top"],
    ["How it works", "#how"],
    ["Benefits", "#benefits"],
    ["Features", "#features"],
    ["FAQ", "#faq"],
    ["All FAQs", "/faq"],
    ["Glossary", "/glossary"],
    ["Blog", "/blog"],
    ["Request scan", "#scan"],
  ];
  const legalLinks: Array<[string, string]> = [
    ["Terms & Conditions", "/terms"],
    ["Privacy Policy", "/privacy"],
    ["Contact", "#contact"],
  ];
  const socials: Array<{ label: string; href: string; Icon: typeof Facebook }> = [
    { label: "Facebook", href: "https://facebook.com/seenzo", Icon: Facebook },
    { label: "Instagram", href: "https://instagram.com/seenzo", Icon: Instagram },
    { label: "X (Twitter)", href: "https://x.com/seenzo", Icon: Twitter },
    { label: "LinkedIn", href: "https://linkedin.com/company/seenzo", Icon: Linkedin },
  ];
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-semibold text-brand-ink">Get seen by AI.</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
              Seenzo shows Indian businesses exactly how ChatGPT, Gemini, Perplexity and Claude
              describe them — and how to get found.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-ink"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product">
            {quickLinks.map(([label, href]) => (
              <FooterLink key={label} href={href}>
                {label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Legal">
            {legalLinks.map(([label, href]) => (
              <FooterLink key={label} href={href}>
                {label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Company">
            <p className="text-sm leading-relaxed text-slate-600">
              KlivIQ Technologies OPC Private Limited
            </p>
            <a
              href="https://www.kliviq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 transition hover:text-ink"
            >
              www.kliviq.com
            </a>
            <p className="mt-2 text-sm text-slate-500">Chennai, India</p>
            <a
              href="tel:+919069026969"
              className="mt-2 text-sm font-medium text-brand-ink transition hover:text-ink"
            >
              +91 90690 26969
            </a>
          </FooterCol>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Disclaimer: Seenzo provides general AI-visibility insights based on public model
            behaviour at the time of scanning. Results are indicative only and do not guarantee
            rankings, citations, traffic, revenue, or any specific business outcomes across ChatGPT,
            Gemini, Perplexity, Claude or any other AI system. AI models change frequently and their
            responses can vary between users, regions and sessions.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            © 2026 KlivIQ Technologies OPC Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold tracking-wide text-ink uppercase">{title}</div>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm text-slate-600 transition hover:text-ink">
      {children}
    </a>
  );
}

/* ---------- Primitives ---------- */
function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-6xl px-5 py-24 sm:py-28">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-sm font-semibold tracking-widest text-brand-ink uppercase">
        {eyebrow}
      </div>
      <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-lg text-slate-600">{sub}</p>}
    </div>
  );
}
