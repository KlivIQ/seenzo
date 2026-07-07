import { format } from "date-fns";

import { CATEGORY_ORDER, CATEGORY_LABELS, categoryStatus } from "@/lib/scoring/categories";
import { CHECK_LABELS, computePriorityFixes, type PriorityFix } from "@/lib/scoring/fixes";
import { getSupabasePublic, getSupabaseServer } from "@/lib/supabase";
import type { ScanCheckResult, ScanGrade } from "@/lib/types/database";

export const VERDICT_BY_GRADE: Record<ScanGrade, string> = {
  A: "Excellent AI visibility — engines can find, understand and confidently cite your business.",
  B: "Strong AI visibility with a few gaps left to close for top-tier standing.",
  C: "Partially visible to AI engines — a few high-impact fixes will lift you into the top tier.",
  D: "Limited AI visibility — most engines struggle to understand or trust your business today.",
  F: "AI engines can barely see your business. Foundational fixes are needed before anything else.",
};

export interface ReportCategory {
  key: string;
  score: number;
  status: ScanCheckResult;
}

export interface ReportCheck {
  cat: string;
  name: string;
  status: ScanCheckResult;
  evidence: string;
}

export interface ReportViewData {
  slug: string;
  business: string;
  url: string;
  scannedAt: string;
  score: number;
  projected: number;
  grade: ScanGrade;
  verdict: string;
  categories: ReportCategory[];
  fixes: PriorityFix[];
  checks: ReportCheck[];
}

export interface LoadedReport {
  leadId: string;
  data: ReportViewData;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/** Reads a completed scan's report by slug via the RLS-gated anon client. */
export async function loadReportBySlug(slug: string): Promise<LoadedReport | null> {
  const supabase = getSupabasePublic();

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, lead_id, url, status, score, grade, category_scores, completed_at, created_at, report_slug",
    )
    .eq("report_slug", slug)
    .maybeSingle();

  if (!scan || scan.status !== "complete" || scan.score == null || scan.grade == null) {
    return null;
  }

  const [{ data: checks }, { data: lead }] = await Promise.all([
    supabase
      .from("scan_checks")
      .select("check_id, category, result, evidence, fix_text, effort")
      .eq("scan_id", scan.id),
    supabase.from("leads").select("business_name").eq("id", scan.lead_id).maybeSingle(),
  ]);

  if (!lead) return null;

  const categoryScores = (scan.category_scores as Record<string, number> | null) ?? {};
  const categories: ReportCategory[] = CATEGORY_ORDER.map((id) => {
    const score = categoryScores[id] ?? 0;
    return { key: CATEGORY_LABELS[id] ?? id, score, status: categoryStatus(score) };
  });

  const fixes = computePriorityFixes(checks ?? [], 5);
  const projected = Math.min(100, scan.score + fixes.reduce((sum, f) => sum + f.impact, 0));

  const checksOut: ReportCheck[] = (checks ?? []).map((c) => ({
    cat: CATEGORY_LABELS[c.category] ?? c.category,
    name: CHECK_LABELS.get(c.check_id) ?? c.check_id,
    status: c.result,
    evidence: c.evidence ?? "",
  }));

  return {
    leadId: scan.lead_id,
    data: {
      slug,
      business: lead.business_name,
      url: displayUrl(scan.url),
      scannedAt: format(new Date(scan.completed_at ?? scan.created_at), "d MMMM yyyy"),
      score: scan.score,
      projected,
      grade: scan.grade,
      verdict: VERDICT_BY_GRADE[scan.grade],
      categories,
      fixes,
      checks: checksOut,
    },
  };
}

/** Logs a report page view. Best-effort — never blocks rendering the report. */
export async function trackReportView(leadId: string, slug: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("activity_log")
    .insert({ lead_id: leadId, type: "report_view", payload: { slug } });
  if (error) console.error("Failed to log report_view", error);
}
