// Audits a prospect's website: Seenzo SEO / AI-search checks + design-age and conversion signals.
// Runs inside one request (one site per call), edge-safe: fetch only.

import { fetchPages, type CrawlOptions } from "@/lib/inngest/crawl";
import { analyseDesign, redoScore, verdictFor, type Signal } from "@/lib/design-signals";
import { runChecks } from "@/lib/scoring/checks";
import { detectSpa } from "@/lib/scoring/html";
import { computeScore } from "@/lib/scoring/score";
import type { AuditFindings, AuditVerdict } from "@/lib/types/outreach";

export interface AuditOutcome {
  verdict: AuditVerdict;
  redo: number;
  seenzoScore: number | null;
  findings: AuditFindings;
}

// Quotable one-liners for the SEO / AI-search checks that matter most when they fail.
const SEO_PHRASES: Record<string, string> = {
  spa_detection: "AI search tools cannot read the site (it loads blank without JavaScript)",
  robots_ai_bots: "The site blocks AI crawlers like ChatGPT and Google's AI",
  jsonld_present: "No structured data, so Google and AI cannot tell what the business is",
  localbusiness_or_product: "No local business details (address, hours) in a form search can read",
  meta_desc: "Pages have no search description",
  sitemap_exists: "No sitemap for search engines",
  title_unique: "Many pages share the same title",
  org_schema: "No organisation details for AI search",
  faq_schema: "No FAQ markup for AI answers",
  blog_exists: "No articles or updates section",
};
// Findings that are also covered by a design signal are only reported once.
const SEO_IDS_ORDER = Object.keys(SEO_PHRASES);

/** Blocks private and local addresses so an admin-entered URL cannot reach internal services. */
export function isSafePublicUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const h = url.hostname.toLowerCase();
  if (!h.includes(".") || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  if (h.includes(":") || h.startsWith("[")) return false; // IPv6 literals
  return true;
}

export function normaliseSiteUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return isSafePublicUrl(u) ? u : null;
  } catch {
    return null;
  }
}

function topProblems(design: Signal[], conversion: Signal[], seo: string[]): string[] {
  const ranked = [
    ...design.map((s) => ({ label: s.label, weight: s.points })),
    ...seo.map((label, i) => ({ label, weight: 9 - i * 0.5 })),
    ...conversion.map((s) => ({ label: s.label, weight: s.points * 0.9 })),
  ].sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, 4).map((r) => r.label);
}

export async function auditSite(
  input: string,
  opts: CrawlOptions = { timeoutMs: 5000, maxPages: 3 },
): Promise<AuditOutcome> {
  const url = normaliseSiteUrl(input);
  if (!url) {
    return failed(input, "That does not look like a public website address");
  }

  // Try https first; fall back to http (an http-only site is itself a finding).
  let usesHttps = url.protocol === "https:";
  let crawl;
  try {
    crawl = await fetchPages(url.toString(), opts);
  } catch {
    if (usesHttps) {
      const plain = new URL(url.toString());
      plain.protocol = "http:";
      try {
        crawl = await fetchPages(plain.toString(), opts);
        usesHttps = false;
      } catch {
        return failed(url.toString(), "The website did not load");
      }
    } else {
      return failed(url.toString(), "The website did not load");
    }
  }

  const results = runChecks(crawl).map((r) => ({
    ...r,
    evidence: r.evidence.slice(0, 300),
  }));
  const scored = computeScore(results);
  const design = analyseDesign({
    html: crawl.homepage.html,
    fetchMs: crawl.homepage.fetchMs,
    usesHttps,
  });
  const redo = redoScore(scored.score, design);
  const seoLabels = SEO_IDS_ORDER.filter((id) =>
    results.some((r) => r.id === id && r.result === "fail"),
  ).map((id) => SEO_PHRASES[id]);

  const findings: AuditFindings = {
    checkedUrl: crawl.requestedUrl,
    seenzo: { score: scored.score, grade: scored.grade, categories: scored.category_scores },
    design: design.design,
    conversion: design.conversion,
    seo: SEO_IDS_ORDER.filter((id) => results.some((r) => r.id === id && r.result === "fail")).map(
      (id) => ({ id, label: SEO_PHRASES[id] }),
    ),
    platform: design.platform,
    copyrightYear: design.copyrightYear,
    fetchMs: crawl.homepage.fetchMs,
    isSpa: detectSpa(crawl.homepage.html),
    topProblems: topProblems(design.design, design.conversion, seoLabels),
    parts: {
      seoGap: Math.max(0, 100 - scored.score),
      design: design.oldScore,
      conversion: design.conversionGap,
    },
  };
  return { verdict: verdictFor(redo), redo, seenzoScore: scored.score, findings };
}

function failed(url: string, error: string): AuditOutcome {
  // A site that will not load is a prospect in itself, but it could be a temporary outage,
  // so it is marked "maybe" and the reason is shown rather than skipped.
  return {
    verdict: "maybe",
    redo: 0,
    seenzoScore: null,
    findings: {
      checkedUrl: url,
      error,
      design: [],
      conversion: [],
      seo: [],
      platform: null,
      copyrightYear: null,
      fetchMs: null,
      isSpa: false,
      topProblems: [error],
    },
  };
}
