import { useEffect, useState } from "react";
import { ArrowRight, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

import { Logo } from "./Logo";

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-slate-200 bg-white/85 backdrop-blur" : "border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="/" className="flex items-center" aria-label="Seenzo home">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            ["Home", "/#top"],
            ["How it works", "/#how"],
            ["Score", "/#score"],
            ["Sample report", "/#sample"],
            ["Benefits", "/#benefits"],
            ["Features", "/#features"],
            ["FAQ", "/#faq"],
            ["Contact", "/#contact"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[15px] font-medium text-slate-600 transition hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href="/#scan"
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Free Scan
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}

function Footer() {
  const quickLinks: Array<[string, string]> = [
    ["Home", "/#top"],
    ["How it works", "/#how"],
    ["Benefits", "/#benefits"],
    ["Features", "/#features"],
    ["FAQ", "/#faq"],
    ["All FAQs", "/faq"],
    ["Glossary", "/glossary"],
    ["Request scan", "/#scan"],
  ];
  const legalLinks: Array<[string, string]> = [
    ["Terms & Conditions", "/terms"],
    ["Privacy Policy", "/privacy"],
    ["Contact", "/#contact"],
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
            <p className="mt-2 text-sm text-slate-500">India</p>
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

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-ink antialiased">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
