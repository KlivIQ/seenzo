import { getInngest } from "@/lib/inngest/client";
import type { ScanRequestedEventData } from "@/lib/inngest/events";
import { getSupabaseServer } from "@/lib/supabase";
import type { ActivityType, LeadStatus } from "@/lib/types/database";

import { getAdminSession } from "./auth";
import { displayUrl, VERDICT_BY_GRADE } from "./report";

const PAGE_SIZE = 50;
const FREE_EMAIL_DOMAINS = new Set(["gmail.com", "yahoo.com", "hotmail.com"]);

const VERIFIED_STATUSES: LeadStatus[] = ["verified", "scanned", "contacted", "won"];
const SCANNED_STATUSES: LeadStatus[] = ["scanned", "contacted", "consult_booked", "won"];
const CONSULTED_STATUSES: LeadStatus[] = ["consult_booked", "won"];

export interface AdminLead {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  score: number | null;
  heatScore: number;
  status: LeadStatus;
  createdAt: string;
  lastActivityAt: string;
  reportSlug: string;
  verdict: string;
  notes: string;
}

export interface AdminMetrics {
  scansThisWeek: number;
  verificationRate: number;
  avgScore: number;
  consultRate: number;
}

export interface AdminDashboard {
  leads: AdminLead[];
  total: number;
  page: number;
  pageSize: number;
  metrics: AdminMetrics;
  adminEmail: string;
}

export interface AdminActivityEvent {
  at: string;
  label: string;
  detail?: string;
}

async function requireAdmin(): Promise<void> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
}

function computeHeatScore(opts: {
  score: number | null;
  email: string;
  industry: string | null;
  reportViewCount: number;
  hasConsultClick: boolean;
}): number {
  const base = opts.score != null ? 100 - opts.score : 0;
  let bonus = 0;
  const domain = opts.email.split("@")[1]?.toLowerCase();
  if (domain && !FREE_EMAIL_DOMAINS.has(domain)) bonus += 10;
  if (opts.industry && opts.industry.trim() !== "") bonus += 10;
  if (opts.reportViewCount >= 2) bonus += 15;
  if (opts.hasConsultClick) bonus += 25;
  return Math.max(0, Math.min(100, base + bonus));
}

async function computeMetrics(
  supabase: ReturnType<typeof getSupabaseServer>,
): Promise<AdminMetrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [scansThisWeekResult, allStatusesResult, completeScoresResult] = await Promise.all([
    supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase.from("leads").select("status"),
    supabase.from("scans").select("score").eq("status", "complete"),
  ]);

  if (scansThisWeekResult.error) {
    throw new Error(`Failed to count scans: ${scansThisWeekResult.error.message}`);
  }
  if (allStatusesResult.error) {
    throw new Error(`Failed to load lead statuses: ${allStatusesResult.error.message}`);
  }
  if (completeScoresResult.error) {
    throw new Error(`Failed to load scan scores: ${completeScoresResult.error.message}`);
  }

  const statuses = (allStatusesResult.data ?? []).map((l) => l.status);
  const total = statuses.length;
  const verifiedCount = statuses.filter((s) => VERIFIED_STATUSES.includes(s)).length;
  const scannedCount = statuses.filter((s) => SCANNED_STATUSES.includes(s)).length;
  const consultedCount = statuses.filter((s) => CONSULTED_STATUSES.includes(s)).length;

  const scores = (completeScoresResult.data ?? [])
    .map((s) => s.score)
    .filter((s): s is number => s != null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;

  return {
    scansThisWeek: scansThisWeekResult.count ?? 0,
    verificationRate: total ? Math.round((verifiedCount / total) * 100) : 0,
    avgScore,
    consultRate: scannedCount ? Math.round((consultedCount / scannedCount) * 100) : 0,
  };
}

export async function loadAdminDashboard(page = 0): Promise<AdminDashboard> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabaseServer();
  const offset = page * PAGE_SIZE;

  const {
    data: leadRows,
    count,
    error: leadsError,
  } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (leadsError) throw new Error(`Failed to load leads: ${leadsError.message}`);

  const leadIds = (leadRows ?? []).map((l) => l.id);

  const [scansResult, activityResult, metrics] = await Promise.all([
    leadIds.length
      ? supabase
          .from("scans")
          .select("lead_id, score, grade, report_slug, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from("activity_log")
          .select("lead_id, type, at")
          .in("lead_id", leadIds)
          .order("at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    computeMetrics(supabase),
  ]);

  if (scansResult.error) throw new Error(`Failed to load scans: ${scansResult.error.message}`);
  if (activityResult.error)
    throw new Error(`Failed to load activity: ${activityResult.error.message}`);

  const latestScanByLead = new Map<
    string,
    { score: number | null; grade: "A" | "B" | "C" | "D" | "F" | null; report_slug: string }
  >();
  for (const scan of scansResult.data ?? []) {
    if (!latestScanByLead.has(scan.lead_id)) {
      latestScanByLead.set(scan.lead_id, {
        score: scan.score,
        grade: scan.grade,
        report_slug: scan.report_slug,
      });
    }
  }

  const activityByLead = new Map<
    string,
    { latestAt: string | null; reportViewCount: number; hasConsultClick: boolean }
  >();
  for (const entry of activityResult.data ?? []) {
    const agg = activityByLead.get(entry.lead_id) ?? {
      latestAt: null as string | null,
      reportViewCount: 0,
      hasConsultClick: false,
    };
    if (!agg.latestAt) agg.latestAt = entry.at;
    if (entry.type === "report_view") agg.reportViewCount += 1;
    if (entry.type === "cta_consult_clicked") agg.hasConsultClick = true;
    activityByLead.set(entry.lead_id, agg);
  }

  const leads: AdminLead[] = (leadRows ?? []).map((lead) => {
    const scan = latestScanByLead.get(lead.id) ?? null;
    const activity = activityByLead.get(lead.id) ?? {
      latestAt: null as string | null,
      reportViewCount: 0,
      hasConsultClick: false,
    };
    const heatScore = computeHeatScore({
      score: scan?.score ?? null,
      email: lead.email,
      industry: lead.industry,
      reportViewCount: activity.reportViewCount,
      hasConsultClick: activity.hasConsultClick,
    });

    return {
      id: lead.id,
      name: lead.name,
      business: lead.business_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city ?? "",
      website: displayUrl(lead.website_url),
      score: scan?.score ?? null,
      heatScore,
      status: lead.status,
      createdAt: lead.created_at,
      lastActivityAt: activity.latestAt ?? lead.created_at,
      reportSlug: scan?.report_slug ?? "",
      verdict: scan?.grade
        ? VERDICT_BY_GRADE[scan.grade]
        : lead.status === "unverified"
          ? "Awaiting email verification."
          : "Scan pending.",
      notes: lead.notes ?? "",
    };
  });

  return {
    leads,
    total: count ?? leads.length,
    page,
    pageSize: PAGE_SIZE,
    metrics,
    adminEmail: session.email,
  };
}

export async function updateLeadFields(
  leadId: string,
  patch: { status?: LeadStatus; notes?: string },
): Promise<void> {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

/** Hard delete — cascades to scans/scan_checks/activity_log/url_cache via FK. */
export async function deleteLeadHard(leadId: string): Promise<void> {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw new Error(`Failed to delete lead: ${error.message}`);
}

export async function rerunLeadScan(leadId: string): Promise<void> {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("website_url, name, business_name")
    .eq("id", leadId)
    .single();
  if (error || !lead) throw new Error(`Failed to load lead: ${error?.message ?? "not found"}`);

  const eventData: ScanRequestedEventData = {
    leadId,
    websiteUrl: lead.website_url,
    leadName: lead.name,
    businessName: lead.business_name,
  };
  await getInngest().send({ name: "scan/requested", data: eventData });
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  scan_requested: "Scan requested",
  email_verified: "Email verified",
  scan_started: "Scan started",
  scan_completed: "Scan completed",
  scan_failed: "Scan failed",
  report_viewed: "Report viewed",
  report_view: "Report viewed",
  email_sent: "Email sent",
  whatsapp_sent: "WhatsApp sent",
  wa_sent: "WhatsApp sent",
  wa_skipped_no_phone: "WhatsApp skipped (no phone)",
  cta_consult_clicked: 'Clicked "Book consultation"',
  cta_whatsapp_clicked: 'Clicked "WhatsApp us"',
  sequence_complete: "Follow-up sequence complete",
  status_changed: "Status changed",
  note_added: "Note added",
};

function activityDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.stage === "string") return `Stage: ${obj.stage}`;
  if (typeof obj.kind === "string") return `Kind: ${obj.kind}`;
  return undefined;
}

export async function fetchLeadActivity(leadId: string): Promise<AdminActivityEvent[]> {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("activity_log")
    .select("type, at, payload")
    .eq("lead_id", leadId)
    .order("at", { ascending: false });
  if (error) throw new Error(`Failed to load activity: ${error.message}`);

  return (data ?? []).map((entry) => ({
    at: entry.at,
    label: ACTIVITY_LABELS[entry.type] ?? entry.type,
    detail: activityDetail(entry.payload),
  }));
}
