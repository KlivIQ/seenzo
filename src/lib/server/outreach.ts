import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDrafts, pickProduct } from "@/lib/outreach-templates";
import { getSupabaseServer } from "@/lib/supabase";
import type {
  ImportResult,
  OutreachChannel,
  OutreachDashboard,
  OutreachMessage,
  OutreachProduct,
  OutreachProspect,
  OutreachStatus,
  ProspectImportRow,
} from "@/lib/types/outreach";
import { OUTREACH_PRODUCTS, OUTREACH_STATUSES } from "@/lib/types/outreach";

import { getAdminSession } from "./auth";

// outreach_* tables are not part of the generated Database types, so use a loosely typed client.
// All rows are cast to the interfaces in @/lib/types/outreach at the boundary.
function db(): SupabaseClient {
  return getSupabaseServer() as unknown as SupabaseClient;
}

const FOLLOWUP_DAYS: Record<number, number> = { 1: 4, 2: 6 }; // after step 1 -> +4d, after step 2 -> +6d (about day 10)
const MAX_ROWS_PER_IMPORT = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(): Promise<{ email: string }> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return { email: session.email };
}

function hostOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

function clean(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

// ---------- Load ----------

export async function loadOutreach(): Promise<OutreachDashboard> {
  const { email } = await requireAdmin();
  const supabase = db();

  const [prospectsRes, messagesRes] = await Promise.all([
    supabase
      .from("outreach_prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("outreach_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(5000),
  ]);
  if (prospectsRes.error)
    throw new Error(`Failed to load prospects: ${prospectsRes.error.message}`);
  if (messagesRes.error) throw new Error(`Failed to load messages: ${messagesRes.error.message}`);

  const prospects = (prospectsRes.data ?? []) as OutreachProspect[];
  const messages = (messagesRes.data ?? []) as OutreachMessage[];
  const now = Date.now();

  return {
    prospects,
    messages,
    adminEmail: email,
    metrics: {
      total: prospects.length,
      toSend: prospects.filter((p) => p.status === "new" || p.status === "drafted").length,
      sent: prospects.filter((p) => p.status === "sent").length,
      replied: prospects.filter((p) => ["replied", "booked", "won"].includes(p.status)).length,
      followupsDue: prospects.filter(
        (p) =>
          p.status === "sent" &&
          p.next_followup_at != null &&
          new Date(p.next_followup_at).getTime() <= now,
      ).length,
    },
  };
}

// ---------- Draft generation ----------

async function writeDrafts(
  prospect: OutreachProspect,
  step: 1 | 2 | 3,
  channels?: OutreachChannel[],
): Promise<void> {
  const supabase = db();
  const drafts = buildDrafts(
    prospect.product,
    {
      businessName: prospect.business_name,
      contactName: prospect.contact_name,
      city: prospect.city,
      industry: prospect.industry,
      websiteUrl: prospect.website_url,
      seenzoScore: prospect.seenzo_score,
    },
    step,
    channels,
  );

  // Replace any unsent drafts for this step so regenerating never duplicates.
  const { error: delError } = await supabase
    .from("outreach_messages")
    .delete()
    .eq("prospect_id", prospect.id)
    .eq("step", step)
    .eq("status", "draft");
  if (delError) throw new Error(`Failed to clear old drafts: ${delError.message}`);

  const rows = drafts.map((d) => ({
    prospect_id: prospect.id,
    channel: d.channel,
    step,
    product: prospect.product,
    subject: d.subject,
    body: d.body,
    status: "draft",
  }));
  const { error } = await supabase.from("outreach_messages").insert(rows);
  if (error) throw new Error(`Failed to save drafts: ${error.message}`);
}

async function getProspect(id: string): Promise<OutreachProspect> {
  const { data, error } = await db().from("outreach_prospects").select("*").eq("id", id).single();
  if (error || !data) throw new Error(`Prospect not found: ${error?.message ?? id}`);
  return data as OutreachProspect;
}

export async function regenerateDrafts(
  prospectId: string,
  opts: { product?: OutreachProduct; step?: 1 | 2 | 3 } = {},
): Promise<void> {
  await requireAdmin();
  let prospect = await getProspect(prospectId);
  if (prospect.status === "do_not_contact") throw new Error("Prospect is marked do not contact");

  if (opts.product && opts.product !== prospect.product) {
    if (!OUTREACH_PRODUCTS.includes(opts.product)) throw new Error("Invalid product");
    const { error } = await db()
      .from("outreach_prospects")
      .update({ product: opts.product })
      .eq("id", prospectId);
    if (error) throw new Error(`Failed to update product: ${error.message}`);
    prospect = { ...prospect, product: opts.product };
  }

  const step = opts.step ?? ((Math.min(prospect.followup_step + 1, 3) as 1 | 2 | 3) || 1);
  await writeDrafts(prospect, step);

  if (prospect.status === "new") {
    await db().from("outreach_prospects").update({ status: "drafted" }).eq("id", prospectId);
  }
}

// ---------- Import ----------

export async function importProspects(rows: ProspectImportRow[]): Promise<ImportResult> {
  await requireAdmin();
  if (rows.length > MAX_ROWS_PER_IMPORT) {
    throw new Error(`Import at most ${MAX_ROWS_PER_IMPORT} rows at a time`);
  }
  const supabase = db();
  const result: ImportResult = {
    added: 0,
    skippedDuplicate: 0,
    skippedOptedOut: 0,
    skippedInvalid: 0,
  };

  // Existing keys, for dedupe.
  const [existing, optedOut] = await Promise.all([
    supabase.from("outreach_prospects").select("contact_email, website_host"),
    supabase.from("leads").select("email").eq("status", "opted_out"),
  ]);
  if (existing.error) throw new Error(`Failed to check duplicates: ${existing.error.message}`);

  const seenEmails = new Set<string>();
  const seenHosts = new Set<string>();
  for (const r of (existing.data ?? []) as {
    contact_email: string | null;
    website_host: string | null;
  }[]) {
    if (r.contact_email) seenEmails.add(r.contact_email.toLowerCase());
    if (r.website_host) seenHosts.add(r.website_host);
  }
  const optedOutEmails = new Set(
    ((optedOut.data ?? []) as { email: string }[]).map((l) => l.email.toLowerCase()),
  );

  const toInsert: Record<string, unknown>[] = [];
  for (const row of rows) {
    const business = clean(row.business_name);
    const email = clean(row.contact_email)?.toLowerCase() ?? null;
    const host = hostOf(row.website_url);
    const phone = clean(row.contact_phone);
    const linkedin = clean(row.linkedin_url);

    if (!business || (!email && !phone && !linkedin) || (email && !EMAIL_RE.test(email))) {
      result.skippedInvalid += 1;
      continue;
    }
    if (email && optedOutEmails.has(email)) {
      result.skippedOptedOut += 1;
      continue;
    }
    if ((email && seenEmails.has(email)) || (host && seenHosts.has(host))) {
      result.skippedDuplicate += 1;
      continue;
    }
    if (email) seenEmails.add(email);
    if (host) seenHosts.add(host);

    const score = Number.parseInt(row.score ?? "", 10);
    toInsert.push({
      business_name: business,
      website_url: clean(row.website_url),
      website_host: host,
      city: clean(row.city),
      industry: clean(row.industry),
      contact_name: clean(row.contact_name),
      contact_email: email,
      contact_phone: phone,
      linkedin_url: linkedin,
      source: clean(row.source_type) ?? "csv_import",
      product: pickProduct(row.industry, business),
      seenzo_score: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
      status: "new",
    });
  }

  if (toInsert.length === 0) return result;

  const { data, error } = await supabase.from("outreach_prospects").insert(toInsert).select("*");
  if (error) throw new Error(`Failed to import prospects: ${error.message}`);

  const inserted = (data ?? []) as OutreachProspect[];
  result.added = inserted.length;

  // Draft first-touch messages for every new prospect, then flip them to "drafted".
  for (const p of inserted) {
    await writeDrafts(p, 1);
  }
  if (inserted.length) {
    await supabase
      .from("outreach_prospects")
      .update({ status: "drafted" })
      .in(
        "id",
        inserted.map((p) => p.id),
      );
  }
  return result;
}

// ---------- Updates ----------

export interface ProspectPatch {
  status?: OutreachStatus;
  notes?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  linkedin_url?: string;
  seenzo_score?: number | null;
}

export async function updateProspect(prospectId: string, patch: ProspectPatch): Promise<void> {
  await requireAdmin();
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!OUTREACH_STATUSES.includes(patch.status)) throw new Error("Invalid status");
    update.status = patch.status;
    // Replies, bookings, losses and do-not-contact all end the follow-up cycle.
    if (patch.status !== "sent") update.next_followup_at = null;
  }
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.contact_name !== undefined) update.contact_name = clean(patch.contact_name);
  if (patch.contact_phone !== undefined) update.contact_phone = clean(patch.contact_phone);
  if (patch.linkedin_url !== undefined) update.linkedin_url = clean(patch.linkedin_url);
  if (patch.contact_email !== undefined) {
    const email = clean(patch.contact_email)?.toLowerCase() ?? null;
    if (email && !EMAIL_RE.test(email)) throw new Error("Invalid email");
    update.contact_email = email;
  }
  if (patch.seenzo_score !== undefined) {
    const s = patch.seenzo_score;
    if (s !== null && (!Number.isInteger(s) || s < 0 || s > 100)) throw new Error("Invalid score");
    update.seenzo_score = s;
  }
  if (Object.keys(update).length === 0) return;

  const { error } = await db().from("outreach_prospects").update(update).eq("id", prospectId);
  if (error) throw new Error(`Failed to update prospect: ${error.message}`);
}

export async function updateMessageBody(
  messageId: string,
  body: string,
  subject?: string | null,
): Promise<void> {
  await requireAdmin();
  const update: Record<string, unknown> = { body };
  if (subject !== undefined) update.subject = subject;
  const { error } = await db()
    .from("outreach_messages")
    .update(update)
    .eq("id", messageId)
    .eq("status", "draft");
  if (error) throw new Error(`Failed to save draft: ${error.message}`);
}

/** Call after the person has actually sent the message by hand (email client, LinkedIn or WhatsApp). */
export async function markMessageSent(messageId: string): Promise<void> {
  await requireAdmin();
  const supabase = db();
  const { data, error } = await supabase
    .from("outreach_messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (error || !data) throw new Error(`Message not found: ${error?.message ?? messageId}`);
  const msg = data as OutreachMessage;
  if (msg.status === "sent") return;

  const prospect = await getProspect(msg.prospect_id);
  if (prospect.status === "do_not_contact") throw new Error("Prospect is marked do not contact");

  const now = new Date();
  const { error: msgError } = await supabase
    .from("outreach_messages")
    .update({ status: "sent", sent_at: now.toISOString() })
    .eq("id", messageId);
  if (msgError) throw new Error(`Failed to mark sent: ${msgError.message}`);

  const days = FOLLOWUP_DAYS[msg.step];
  const nextFollowup = days ? new Date(now.getTime() + days * 86400000).toISOString() : null;
  const { error: pError } = await supabase
    .from("outreach_prospects")
    .update({
      status: ["replied", "booked", "won"].includes(prospect.status) ? prospect.status : "sent",
      followup_step: Math.max(prospect.followup_step, msg.step),
      last_contacted_at: now.toISOString(),
      next_followup_at: nextFollowup,
    })
    .eq("id", prospect.id);
  if (pError) throw new Error(`Failed to update prospect: ${pError.message}`);
}

export async function deleteProspect(prospectId: string): Promise<void> {
  await requireAdmin();
  const { error } = await db().from("outreach_prospects").delete().eq("id", prospectId);
  if (error) throw new Error(`Failed to delete prospect: ${error.message}`);
}
