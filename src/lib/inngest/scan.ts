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

// SHA-256 via Web Crypto — mirrors src/lib/server/scan-request.ts so cache lookups agree.
async function hashWebsiteUrl(url: string): Promise<string> {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const scanRun = getInngest().createFunction(
  { id: "scan-run", triggers: [{ event: "scan/requested" }] },
  async ({ event, step }) => {
    const { leadId, websiteUrl } = event.data as ScanRequestedEventData;

    const crawlData = await step.run("fetch-pages", () => fetchPages(websiteUrl));

    const checkResults: CheckRunResult[] = await step.run("run-checks", () =>
      CHECKS.map((check) => {
        const result = check.run(crawlData);
        return { id: check.id, category: check.category, ...result };
      }),
    );

    const scoreResult = await step.run("compute-score", () => {
      const { score, grade, category_scores } = computeScore(checkResults);
      const is_spa = detectSpa(crawlData.homepage.html);
      return { score, grade, category_scores, is_spa };
    });

    const stored = await step.run("store-results", async () => {
      const supabase = getSupabaseServer();
      const reportSlug = nanoid(10);
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
          is_spa: scoreResult.is_spa,
          pages_crawled: 1 + crawlData.pages.length,
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
