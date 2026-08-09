import { nanoid } from "nanoid";

import { CHECKS } from "@/lib/scoring/checks";
import { detectSpa } from "@/lib/scoring/html";
import { computeScore } from "@/lib/scoring/score";
import type { CheckRunResult } from "@/lib/scoring/types";
import { getSupabaseServer } from "@/lib/supabase";

import { getInngest } from "./client";
import { fetchPages } from "./crawl";
import type { ReportReadyEventData, ScanRequestedEventData } from "./events";

const URL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Inngest persists every step.run() return value as step history and
// rejects outputs over 128KB ("step output size is greater than the
// limit"). Evidence strings are the only place check output can balloon
// (they're built from page content), so cap them well under that ceiling.
const MAX_EVIDENCE_LENGTH = 500;

// SHA-256 via Web Crypto — mirrors src/lib/server/scan-request.ts so cache lookups agree.
async function hashWebsiteUrl(url: string): Promise<string> {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function truncateEvidence(evidence: string): string {
  return evidence.length > MAX_EVIDENCE_LENGTH ? evidence.slice(0, MAX_EVIDENCE_LENGTH) : evidence;
}

export const scanRun = getInngest().createFunction(
  { id: "scan-run", triggers: [{ event: "scan/requested" }] },
  async ({ event, step }) => {
    const { leadId, websiteUrl, reportSlug: eventSlug } = event.data as ScanRequestedEventData;

    // Crawl and run checks inside one step scope — raw HTML must never be
    // returned from a step.run() closure, only the small computed results.
    // fetchPages() pulls full page bodies (homepage + up to 5 internal
    // pages + robots/sitemap), which is what blew past the 128KB step
    // output limit when it used to be returned directly as "fetch-pages".
    const {
      checkResults,
      isSpa,
      pagesCrawled,
    }: { checkResults: CheckRunResult[]; isSpa: boolean; pagesCrawled: number } = await step.run(
      "crawl-and-check",
      async () => {
        const crawlData = await fetchPages(websiteUrl);
        const results: CheckRunResult[] = CHECKS.map((check) => {
          const outcome = check.run(crawlData);
          return {
            id: check.id,
            category: check.category,
            ...outcome,
            evidence: truncateEvidence(outcome.evidence),
          };
        });
        return {
          checkResults: results,
          isSpa: detectSpa(crawlData.homepage.html),
          pagesCrawled: 1 + crawlData.pages.length,
        };
      },
    );

    const scoreResult = await step.run("compute-score", () => computeScore(checkResults));

    const stored = await step.run("store-results", async () => {
      const supabase = getSupabaseServer();
      // Slug now comes from the lead record (generated at scan-request time
      // so the client can start polling immediately). Falls back to a fresh
      // one only for the admin rerun path, which doesn't pass reportSlug.
      const reportSlug = eventSlug ?? nanoid(10);
      const nowIso = new Date().toISOString();

      const { data: scan, error: scanError } = await supabase
        .from("scans")
        .insert({
          lead_id: leadId,
          url: websiteUrl,
          status: "complete",
          completed_at: nowIso,
          score: scoreResult.score,
          grade: scoreResult.grade,
          scoring_version: "v1",
          category_scores: scoreResult.category_scores,
          is_spa: isSpa,
          pages_crawled: pagesCrawled,
          report_slug: reportSlug,
        })
        .select("id")
        .single();

      if (scanError || !scan) {
        throw new Error(`Failed to store scan: ${scanError?.message ?? "unknown error"}`);
      }

      const { error: checksError } = await supabase.from("scan_checks").insert(
        checkResults.map((r) => ({
          scan_id: scan.id,
          check_id: r.id,
          category: r.category,
          result: r.result,
          evidence: r.evidence,
          fix_text: r.fix_text || null,
          effort: r.effort,
        })),
      );
      if (checksError) throw new Error(`Failed to store scan checks: ${checksError.message}`);

      const { error: leadError } = await supabase
        .from("leads")
        .update({ status: "scanned" })
        .eq("id", leadId);
      if (leadError) throw new Error(`Failed to update lead status: ${leadError.message}`);

      const urlHash = await hashWebsiteUrl(websiteUrl);
      const { error: cacheError } = await supabase.from("url_cache").upsert({
        url_hash: urlHash,
        scan_id: scan.id,
        expires_at: new Date(Date.now() + URL_CACHE_TTL_MS).toISOString(),
      });
      if (cacheError) throw new Error(`Failed to cache scan result: ${cacheError.message}`);

      return { scanId: scan.id as string, reportSlug };
    });

    const reportReadyData: ReportReadyEventData = {
      leadId,
      scanId: stored.scanId,
      reportSlug: stored.reportSlug,
    };
    await step.sendEvent("report-ready", { name: "report/ready", data: reportReadyData });

    return { reportSlug: stored.reportSlug };
  },
);
