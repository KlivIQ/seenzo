import { computePriorityFixes, type PriorityFix } from "@/lib/scoring/fixes";
import { requireEnv } from "@/lib/server/env";
import { escapeHtml } from "@/lib/server/html-escape";
import { getResend } from "@/lib/server/resend";
import { getSupabaseServer } from "@/lib/supabase";
import type { ActivityType, Json, LeadStatus } from "@/lib/types/database";

import { getInngest } from "./client";
import type { FollowupStartEventData } from "./events";

const SENDER_EMAIL = "reports@seenzo.in";
const REPORT_BASE_URL = "https://www.seenzo.in/r";
const WHATSAPP_API_VERSION = "v21.0";
const CONVERTED_STATUSES: LeadStatus[] = ["consult_booked", "won", "opted_out"];

async function getLeadStatus(leadId: string): Promise<LeadStatus | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from("leads").select("status").eq("id", leadId).maybeSingle();
  return data?.status ?? null;
}

function hasConverted(status: LeadStatus | null): boolean {
  return status !== null && CONVERTED_STATUSES.includes(status);
}

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const token = requireEnv("META_WHATSAPP_TOKEN");
  const phoneNumberId = requireEnv("META_WHATSAPP_PHONE_NUMBER_ID");

  const res = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppNumber(phone),
        type: "text",
        text: { body: message },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${body}`);
  }
}

async function logActivity(
  leadId: string,
  type: ActivityType,
  payload: Record<string, Json>,
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("activity_log").insert({ lead_id: leadId, type, payload });
  if (error) throw new Error(`Failed to log ${type}: ${error.message}`);
}

function renderCaseStudyEmailHtml(opts: {
  name: string;
  fix: PriorityFix | null;
  reportUrl: string;
}): string {
  const { name, fix, reportUrl } = opts;
  const fixParagraph = fix
    ? `<p>Your #1 opportunity right now is <strong>${escapeHtml(fix.title)}</strong> — ${escapeHtml(fix.desc)}</p>`
    : `<p>Your report has a handful of high-impact fixes waiting.</p>`;

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Businesses that fix their top AI-visibility issue within a week typically see a big jump in how often ChatGPT, Gemini and Perplexity recommend them.</p>
      ${fixParagraph}
      <p style="margin: 24px 0;">
        <a href="${reportUrl}" style="background:#10B981;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          View my report
        </a>
      </p>
    </div>
  `;
}

export const followupSequence = getInngest().createFunction(
  { id: "followup-sequence", triggers: [{ event: "followup/start" }] },
  async ({ event, step }) => {
    const { leadId, slug } = event.data as FollowupStartEventData;
    const reportUrl = `${REPORT_BASE_URL}/${slug}`;

    // --- Day 2: WhatsApp nudge ---
    await step.sleep("wait-2-days", "2d");

    const statusDay2 = await step.run("check-status-day2", () => getLeadStatus(leadId));
    if (hasConverted(statusDay2)) return { stopped: "day2", status: statusDay2 };

    const leadDay2 = await step.run("load-lead-day2", async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from("leads")
        .select("name, phone")
        .eq("id", leadId)
        .single();
      if (error || !data) throw new Error(`Failed to load lead: ${error?.message ?? "not found"}`);
      return data;
    });

    await step.run("send-whatsapp-day2", () =>
      sendWhatsApp(
        leadDay2.phone,
        `Hi ${leadDay2.name}, did you see your Seenzo Score? Your #1 fix takes about 2 days to implement. Book a free call: ${reportUrl}`,
      ),
    );
    await step.run("log-wa-sent-day2", () =>
      logActivity(leadId, "wa_sent", { slug, stage: "day2" }),
    );

    // --- Day 5: case-study email ---
    await step.sleep("wait-3-more-days", "3d");

    const statusDay5 = await step.run("check-status-day5", () => getLeadStatus(leadId));
    if (hasConverted(statusDay5)) return { stopped: "day5", status: statusDay5 };

    const { lead: leadDay5, fix } = await step.run("load-lead-and-fix-day5", async () => {
      const supabase = getSupabaseServer();

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("name, email")
        .eq("id", leadId)
        .single();
      if (leadError || !lead)
        throw new Error(`Failed to load lead: ${leadError?.message ?? "not found"}`);

      const { data: scan } = await supabase
        .from("scans")
        .select("id")
        .eq("report_slug", slug)
        .maybeSingle();

      let fix: PriorityFix | null = null;
      if (scan) {
        const { data: checks } = await supabase
          .from("scan_checks")
          .select("check_id, result, fix_text, effort")
          .eq("scan_id", scan.id);
        fix = computePriorityFixes(checks ?? [], 1)[0] ?? null;
      }

      return { lead, fix };
    });

    await step.run("send-email-day5", async () => {
      const resend = getResend();
      const { error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: leadDay5.email,
        subject: "One fix that could change your AI visibility",
        html: renderCaseStudyEmailHtml({ name: leadDay5.name, fix, reportUrl }),
      });
      if (error) throw new Error(`Resend error: ${error.message}`);
    });
    await step.run("log-email-sent-day5", () =>
      logActivity(leadId, "email_sent", { slug, stage: "day5" }),
    );

    // --- Day 10: final WhatsApp nudge ---
    await step.sleep("wait-5-more-days", "5d");

    const statusDay10 = await step.run("check-status-day10", () => getLeadStatus(leadId));
    if (hasConverted(statusDay10)) return { stopped: "day10", status: statusDay10 };

    const leadDay10 = await step.run("load-lead-day10", async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from("leads")
        .select("phone")
        .eq("id", leadId)
        .single();
      if (error || !data) throw new Error(`Failed to load lead: ${error?.message ?? "not found"}`);
      return data;
    });

    await step.run("send-whatsapp-day10", () =>
      sendWhatsApp(
        leadDay10.phone,
        "Last nudge — your Seenzo report expires soon. 15 mins with our team could fix your top issue this week.",
      ),
    );
    await step.run("log-wa-sent-day10", () =>
      logActivity(leadId, "wa_sent", { slug, stage: "day10" }),
    );

    await step.run("log-sequence-complete", () =>
      logActivity(leadId, "sequence_complete", { slug }),
    );

    return { completed: true };
  },
);
