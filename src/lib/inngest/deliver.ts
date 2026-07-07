import { computePriorityFixes, type PriorityFix } from "@/lib/scoring/fixes";
import { escapeHtml } from "@/lib/server/html-escape";
import { getResend } from "@/lib/server/resend";
import { getSupabaseServer } from "@/lib/supabase";
import type { ScanGrade } from "@/lib/types/database";

import { getInngest } from "./client";
import type { FollowupStartEventData, ReportReadyEventData } from "./events";

const SENDER_EMAIL = "reports@seenzo.in";
const REPORT_BASE_URL = "https://www.seenzo.in/r";

function renderReportEmailHtml(opts: {
  name: string;
  score: number;
  grade: ScanGrade;
  fixes: PriorityFix[];
  reportUrl: string;
}): string {
  const { name, score, grade, fixes, reportUrl } = opts;
  const fixItems = fixes
    .map(
      (f) => `<li style="margin-bottom:8px;">${escapeHtml(f.title)} — ${escapeHtml(f.desc)}</li>`,
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your Seenzo AI Visibility scan is complete. Here's how AI engines like ChatGPT, Gemini and Perplexity currently see your business:</p>
      <p style="margin:24px 0; text-align:center;">
        <span style="display:inline-block; font-size:40px; font-weight:800; color:#111;">${score}</span>
        <span style="display:inline-block; margin-left:8px; padding:4px 10px; border-radius:6px; background:#F59E0B; color:#111; font-weight:700;">Grade ${escapeHtml(grade)}</span>
      </p>
      <p><strong>Your top ${fixes.length} fixes:</strong></p>
      <ol>${fixItems}</ol>
      <p style="margin: 24px 0;">
        <a href="${reportUrl}" style="background:#10B981;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Book free consultation
        </a>
      </p>
      <p>Or view your full report:<br />${reportUrl}</p>
    </div>
  `;
}

export const deliverReport = getInngest().createFunction(
  { id: "deliver-report", triggers: [{ event: "report/ready" }] },
  async ({ event, step }) => {
    const { leadId, scanId, reportSlug } = event.data as ReportReadyEventData;

    const { lead, scan, fixes } = await step.run("load-data", async () => {
      const supabase = getSupabaseServer();

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("name, email")
        .eq("id", leadId)
        .single();
      if (leadError || !lead)
        throw new Error(`Failed to load lead: ${leadError?.message ?? "not found"}`);

      const { data: scan, error: scanError } = await supabase
        .from("scans")
        .select("score, grade")
        .eq("id", scanId)
        .single();
      if (scanError || !scan)
        throw new Error(`Failed to load scan: ${scanError?.message ?? "not found"}`);

      const { data: checks, error: checksError } = await supabase
        .from("scan_checks")
        .select("check_id, result, fix_text, effort")
        .eq("scan_id", scanId);
      if (checksError) throw new Error(`Failed to load scan checks: ${checksError.message}`);

      return { lead, scan, fixes: computePriorityFixes(checks ?? [], 3) };
    });

    const reportUrl = `${REPORT_BASE_URL}/${reportSlug}`;

    await step.run("send-email", async () => {
      const resend = getResend();
      const { error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: lead.email,
        subject: "Your Seenzo AI Visibility Score is ready",
        html: renderReportEmailHtml({
          name: lead.name,
          score: scan.score ?? 0,
          grade: scan.grade ?? "F",
          fixes,
          reportUrl,
        }),
      });
      if (error) throw new Error(`Resend error: ${error.message}`);
    });

    await step.run("update-lead-status", async () => {
      const supabase = getSupabaseServer();
      const { error } = await supabase
        .from("leads")
        .update({ status: "contacted" })
        .eq("id", leadId);
      if (error) throw new Error(`Failed to update lead status: ${error.message}`);
    });

    await step.run("log-email-sent", async () => {
      const supabase = getSupabaseServer();
      const { error } = await supabase.from("activity_log").insert({
        lead_id: leadId,
        type: "email_sent",
        payload: { slug: reportSlug, kind: "report_ready" },
      });
      if (error) throw new Error(`Failed to log email_sent: ${error.message}`);
    });

    const followupData: FollowupStartEventData = { leadId, slug: reportSlug };
    await step.sendEvent("followup-start", { name: "followup/start", data: followupData });

    return { sent: true };
  },
);
