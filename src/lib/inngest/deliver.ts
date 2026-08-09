import { renderReportEmail } from "@/lib/email/report-email";
import { computeIssues } from "@/lib/scoring/fixes";
import { getResend } from "@/lib/server/resend";
import { getSupabaseServer } from "@/lib/supabase";

import { getInngest } from "./client";
import type { FollowupStartEventData, ReportReadyEventData } from "./events";

const SENDER_EMAIL = "reports@seenzo.in";
const REPORT_BASE_URL = "https://www.seenzo.in/r";

export const deliverReport = getInngest().createFunction(
  { id: "deliver-report", triggers: [{ event: "report/ready" }] },
  async ({ event, step }) => {
    const { leadId, scanId, reportSlug } = event.data as ReportReadyEventData;

    const { lead, scan, issues } = await step.run("load-data", async () => {
      const supabase = getSupabaseServer();

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("name, email, business_name")
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
        .select("check_id, result, evidence")
        .eq("scan_id", scanId);
      if (checksError) throw new Error(`Failed to load scan checks: ${checksError.message}`);

      return { lead, scan, issues: computeIssues(checks ?? [], 3) };
    });

    const reportUrl = `${REPORT_BASE_URL}/${reportSlug}`;

    await step.run("send-email", async () => {
      const resend = getResend();
      const { error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: lead.email,
        subject: "Your Seenzo AI Visibility Score is ready",
        html: await renderReportEmail({
          name: lead.name,
          businessName: lead.business_name,
          score: scan.score ?? 0,
          grade: scan.grade ?? "F",
          issues,
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
