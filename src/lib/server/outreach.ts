import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDrafts, pickProduct } from "@/lib/outreach-templates";
import { channelRoute, normalizeInstagram } from "@/lib/outreach-dm";
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
import { classifyInbound, emailsIn, snippetOf, type InboundKind } from "@/lib/outreach-replies";

import {
  findSentMessage,
  getMessageText,
  hostingerConfigured,
  HostingerMailError,
  listRecentInbox,
  outreachFromAddress,
  sendMail,
  type MessageRef,
} from "./hostinger-mail";

// outreach_* tables are not part of the generated Database types, so use a loosely typed client.
// All rows are cast to the interfaces in @/lib/types/outreach at the boundary.
function db(): SupabaseClient {
  return getSupabaseServer() as unknown as SupabaseClient;
}

const FOLLOWUP_DAYS: Record<number, number> = { 1: 4, 2: 6 }; // after step 1 -> +4d, after step 2 -> +6d (about day 10)
const MAX_ROWS_PER_IMPORT = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DAILY_CAP = 15;
const STALE_SENDING_MS = 2 * 60 * 1000; // a 'sending' lock older than this is treated as abandoned

function dailyCap(): number {
  const n = Number.parseInt(process.env.OUTREACH_DAILY_CAP ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_CAP;
}

/** Midnight today in India (IST, UTC+5:30), as a UTC Date. The daily cap resets at this time. */
function startOfTodayIST(): Date {
  const offset = 330 * 60 * 1000;
  const ist = new Date(Date.now() + offset);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - offset);
}

async function countSentToday(): Promise<number> {
  const supabase = db();
  const since = startOfTodayIST().toISOString();
  const [sent, sending] = await Promise.all([
    supabase
      .from("outreach_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .eq("sent_via", "hostinger")
      .gte("sent_at", since),
    supabase
      .from("outreach_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "sending"),
  ]);
  if (sent.error) throw new Error(`Failed to count sends: ${sent.error.message}`);
  return (sent.count ?? 0) + (sending.count ?? 0);
}

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
  const enabled = hostingerConfigured();

  return {
    prospects,
    messages,
    adminEmail: email,
    sending: {
      enabled,
      from: outreachFromAddress(),
      dailyCap: dailyCap(),
      sentToday: enabled ? await countSentToday() : 0,
    },
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
  // Instagram drafts only exist for prospects that have a handle.
  const wanted: OutreachChannel[] = channels ?? [
    "email",
    "linkedin",
    "whatsapp",
    ...(prospect.instagram_handle ? (["instagram"] as const) : []),
  ];
  const drafts = buildDrafts(
    prospect.product,
    {
      businessName: prospect.business_name,
      contactName: prospect.contact_name,
      city: prospect.city,
      industry: prospect.industry,
      websiteUrl: prospect.website_url,
      contactEmail: prospect.contact_email,
      seenzoScore: prospect.seenzo_score,
    },
    step,
    wanted,
  );

  // Replace any unsent drafts for this step (on these channels) so regenerating never duplicates.
  const { error: delError } = await supabase
    .from("outreach_messages")
    .delete()
    .eq("prospect_id", prospect.id)
    .eq("step", step)
    .eq("status", "draft")
    .in("channel", wanted);
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

/**
 * Rewrites every unsent draft with the current templates (after copy changes).
 * Sent messages are never touched. Do-not-contact prospects are skipped.
 */
export async function regenerateAllDrafts(): Promise<{ prospects: number }> {
  await requireAdmin();
  const supabase = db();
  const [prospectsRes, draftsRes] = await Promise.all([
    supabase.from("outreach_prospects").select("*").neq("status", "do_not_contact"),
    supabase.from("outreach_messages").select("prospect_id, step").eq("status", "draft"),
  ]);
  if (prospectsRes.error)
    throw new Error(`Failed to load prospects: ${prospectsRes.error.message}`);
  if (draftsRes.error) throw new Error(`Failed to load drafts: ${draftsRes.error.message}`);

  const stepsByProspect = new Map<string, Set<number>>();
  for (const d of (draftsRes.data ?? []) as { prospect_id: string; step: number }[]) {
    const set = stepsByProspect.get(d.prospect_id) ?? new Set<number>();
    set.add(d.step);
    stepsByProspect.set(d.prospect_id, set);
  }

  const jobs: { prospect: OutreachProspect; step: 1 | 2 | 3 }[] = [];
  for (const p of (prospectsRes.data ?? []) as OutreachProspect[]) {
    const steps = stepsByProspect.get(p.id);
    if (steps) {
      for (const st of steps) jobs.push({ prospect: p, step: st as 1 | 2 | 3 });
    }
  }

  // A few at a time so a big list stays well inside the request time limit.
  const touched = new Set<string>();
  for (let i = 0; i < jobs.length; i += 5) {
    await Promise.all(
      jobs.slice(i, i + 5).map(async (j) => {
        await writeDrafts(j.prospect, j.step);
        touched.add(j.prospect.id);
      }),
    );
  }
  return { prospects: touched.size };
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
    supabase.from("outreach_prospects").select("contact_email, website_host, instagram_handle"),
    supabase.from("leads").select("email").eq("status", "opted_out"),
  ]);
  if (existing.error) throw new Error(`Failed to check duplicates: ${existing.error.message}`);

  const seenEmails = new Set<string>();
  const seenHosts = new Set<string>();
  const seenHandles = new Set<string>();
  for (const r of (existing.data ?? []) as {
    contact_email: string | null;
    website_host: string | null;
    instagram_handle: string | null;
  }[]) {
    if (r.contact_email) seenEmails.add(r.contact_email.toLowerCase());
    if (r.website_host) seenHosts.add(r.website_host);
    if (r.instagram_handle) seenHandles.add(r.instagram_handle.toLowerCase());
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
    const instagram = normalizeInstagram(row.instagram_handle);

    if (
      !business ||
      (!email && !phone && !linkedin && !instagram) ||
      (email && !EMAIL_RE.test(email))
    ) {
      result.skippedInvalid += 1;
      continue;
    }
    if (email && optedOutEmails.has(email)) {
      result.skippedOptedOut += 1;
      continue;
    }
    if (
      (email && seenEmails.has(email)) ||
      (host && seenHosts.has(host)) ||
      (instagram && seenHandles.has(instagram))
    ) {
      result.skippedDuplicate += 1;
      continue;
    }
    if (email) seenEmails.add(email);
    if (host) seenHosts.add(host);
    if (instagram) seenHandles.add(instagram);

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
      instagram_handle: instagram,
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
  instagram_handle?: string;
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
  let newHandle: string | null = null;
  if (patch.instagram_handle !== undefined) {
    const raw = clean(patch.instagram_handle);
    newHandle = normalizeInstagram(raw);
    if (raw && !newHandle) throw new Error("That does not look like an Instagram handle");
    update.instagram_handle = newHandle;
  }
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
  if (error) {
    if (error.code === "23505") throw new Error("Another prospect already uses that value");
    throw new Error(`Failed to update prospect: ${error.message}`);
  }

  // A handle added later gets its first Instagram draft right away.
  if (newHandle) {
    const prospect = await getProspect(prospectId);
    const { count } = await db()
      .from("outreach_messages")
      .select("id", { count: "exact", head: true })
      .eq("prospect_id", prospectId)
      .eq("channel", "instagram");
    if (!count && prospect.status !== "do_not_contact") {
      await writeDrafts(prospect, (Math.min(prospect.followup_step + 1, 3) as 1 | 2 | 3) || 1, [
        "instagram",
      ]);
    }
  }
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

/** Shared bookkeeping once a message has gone out: message row, follow-up schedule, prospect status. */
async function applySent(
  msg: OutreachMessage,
  prospect: OutreachProspect,
  now: Date,
  extra: Record<string, unknown>,
): Promise<void> {
  const supabase = db();
  const { error: msgError } = await supabase
    .from("outreach_messages")
    .update({ status: "sent", sent_at: now.toISOString(), error: null, ...extra })
    .eq("id", msg.id);
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

async function getMessage(id: string): Promise<OutreachMessage> {
  const { data, error } = await db().from("outreach_messages").select("*").eq("id", id).single();
  if (error || !data) throw new Error(`Message not found: ${error?.message ?? id}`);
  return data as OutreachMessage;
}

/** Call after the person has actually sent the message by hand (email client, LinkedIn or WhatsApp). */
export async function markMessageSent(messageId: string): Promise<void> {
  await requireAdmin();
  const msg = await getMessage(messageId);
  if (msg.status === "sent") return;
  if (msg.status === "sending") throw new Error("This message is being sent right now");

  const prospect = await getProspect(msg.prospect_id);
  if (prospect.status === "do_not_contact") throw new Error("Prospect is marked do not contact");
  await applySent(msg, prospect, new Date(), { sent_via: "manual" });
}

/**
 * Records a DM (Instagram, WhatsApp or LinkedIn) that Sri has just sent by hand. Nothing is sent
 * from here. Follow-up timing for DMs is worked out from these rows, so the email follow-up
 * schedule on the prospect is left alone.
 */
export async function recordDmSent(input: {
  prospectId: string;
  channel: OutreachChannel;
  step: number;
  body: string;
}): Promise<void> {
  await requireAdmin();
  if (input.channel === "email") throw new Error("Emails are sent from the email list");
  if (![1, 2, 3].includes(input.step)) throw new Error("Invalid step");
  const body = input.body.trim();
  if (!body) throw new Error("The message is empty");

  const supabase = db();
  const prospect = await getProspect(input.prospectId);
  if (["do_not_contact", "replied", "booked", "won", "lost"].includes(prospect.status)) {
    throw new Error("This prospect is closed or has replied");
  }
  if (!channelRoute(prospect, input.channel)) {
    throw new Error("This prospect has no contact for that channel");
  }

  const { data: existing, error: findError } = await supabase
    .from("outreach_messages")
    .select("*")
    .eq("prospect_id", prospect.id)
    .eq("channel", input.channel)
    .eq("step", input.step);
  if (findError) throw new Error(`Failed to check messages: ${findError.message}`);
  const rows = (existing ?? []) as OutreachMessage[];
  if (rows.some((m) => m.status === "sent")) throw new Error("Already marked as sent");

  const now = new Date().toISOString();
  const draft = rows.find((m) => m.status === "draft");
  if (draft) {
    const { error } = await supabase
      .from("outreach_messages")
      .update({ body, status: "sent", sent_at: now, sent_via: "manual", error: null })
      .eq("id", draft.id);
    if (error) throw new Error(`Failed to save: ${error.message}`);
  } else {
    const { error } = await supabase.from("outreach_messages").insert({
      prospect_id: prospect.id,
      channel: input.channel,
      step: input.step,
      product: prospect.product,
      subject: null,
      body,
      status: "sent",
      sent_at: now,
      sent_via: "manual",
    });
    if (error) throw new Error(`Failed to save: ${error.message}`);
  }

  // DM-only prospects move to "sent". Ones with an unsent email stay in the email list.
  const patch: Record<string, unknown> = { last_contacted_at: now };
  if (!prospect.contact_email && (prospect.status === "new" || prospect.status === "drafted")) {
    patch.status = "sent";
  }
  const { error: pError } = await supabase
    .from("outreach_prospects")
    .update(patch)
    .eq("id", prospect.id);
  if (pError) throw new Error(`Failed to update prospect: ${pError.message}`);
}

// ---------- Direct send (Hostinger) ----------

export interface SendResult {
  sentToday: number;
  dailyCap: number;
  threaded: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Looks up the Sent copy a few times (the API queues the send and returns no ID). Never throws. */
async function lookupSentUid(
  to: string,
  subject: string,
  since: Date,
  attempts = 3,
): Promise<MessageRef | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const ref = await findSentMessage({ to, subject, since });
      if (ref) return ref;
    } catch {
      // ignore; threading falls back to a fresh email
    }
    if (i < attempts - 1) await sleep(1500);
  }
  return null;
}

/** Thread target for a follow-up: the most recent earlier email to this prospect that we can reference. */
async function findThreadParent(msg: OutreachMessage, to: string): Promise<MessageRef | null> {
  const { data } = await db()
    .from("outreach_messages")
    .select("*")
    .eq("prospect_id", msg.prospect_id)
    .eq("channel", "email")
    .eq("status", "sent")
    .lt("step", msg.step)
    .order("step", { ascending: false })
    .limit(1);
  const parent = ((data ?? []) as OutreachMessage[])[0];
  if (!parent) return null;
  if (parent.sent_uid && parent.sent_folder) {
    return { uid: parent.sent_uid, folder: parent.sent_folder };
  }
  if (parent.sent_via !== "hostinger" || !parent.sent_at || !parent.subject) return null;
  // UID lookup failed at send time; try once more now and remember it.
  const ref = await lookupSentUid(to, parent.subject, new Date(parent.sent_at), 1);
  if (ref) {
    await db()
      .from("outreach_messages")
      .update({ sent_uid: ref.uid, sent_folder: ref.folder })
      .eq("id", parent.id);
  }
  return ref;
}

/**
 * Sends one email draft from the outreach mailbox after Sri confirms it in the UI.
 * Guards: email channel only, do-not-contact/opted-out, daily cap, single-send lock.
 */
export async function sendOutreachEmail(
  messageId: string,
  edits: { subject: string; body: string },
): Promise<SendResult> {
  await requireAdmin();
  if (!hostingerConfigured()) {
    throw new Error("Sending is not set up. Add HOSTINGER_MAIL_API_TOKEN and OUTREACH_FROM.");
  }
  const subject = edits.subject.trim();
  const body = edits.body.trim();
  if (!subject || !body) throw new Error("Subject and body are required");

  const supabase = db();
  const msg = await getMessage(messageId);
  if (msg.channel !== "email") throw new Error("Only email drafts can be sent from here");
  if (msg.status === "sent") throw new Error("This email was already sent");

  const prospect = await getProspect(msg.prospect_id);
  if (prospect.status === "do_not_contact") throw new Error("Prospect is marked do not contact");
  const to = prospect.contact_email?.trim().toLowerCase();
  if (!to || !EMAIL_RE.test(to)) throw new Error("This prospect has no valid email address");

  const { data: optedOut } = await supabase
    .from("leads")
    .select("id")
    .eq("status", "opted_out")
    .ilike("email", to)
    .limit(1);
  if (optedOut && optedOut.length > 0) throw new Error("This email has opted out of Seenzo");

  // Release an abandoned lock (e.g. the function timed out mid-send).
  if (msg.status === "sending") {
    const started = msg.sending_started_at ? new Date(msg.sending_started_at).getTime() : 0;
    if (Date.now() - started < STALE_SENDING_MS) {
      throw new Error("This email is being sent right now");
    }
    await supabase
      .from("outreach_messages")
      .update({ status: "draft" })
      .eq("id", msg.id)
      .eq("status", "sending");
  }

  const cap = dailyCap();
  const sentToday = await countSentToday();
  if (sentToday >= cap) {
    throw new Error(`Daily limit reached (${cap} emails). Sending resets at midnight IST.`);
  }

  // Lock: only one request can move this draft to 'sending'.
  const { data: locked, error: lockError } = await supabase
    .from("outreach_messages")
    .update({
      status: "sending",
      sending_started_at: new Date().toISOString(),
      subject,
      body,
      error: null,
    })
    .eq("id", msg.id)
    .eq("status", "draft")
    .select("id");
  if (lockError) throw new Error(`Failed to lock draft: ${lockError.message}`);
  if (!locked || locked.length === 0) throw new Error("This email is already being sent");

  const parent = msg.step > 1 ? await findThreadParent(msg, to) : null;
  const finalSubject = parent && !/^re:/i.test(subject) ? `Re: ${subject}` : subject;
  const startedAt = new Date();

  try {
    await sendMail({ to, subject: finalSubject, text: body, inReplyTo: parent });
  } catch (err) {
    const message =
      err instanceof HostingerMailError || err instanceof Error ? err.message : "Send failed";
    await supabase
      .from("outreach_messages")
      .update({ status: "draft", error: message })
      .eq("id", msg.id);
    throw new Error(message);
  }

  try {
    await applySent({ ...msg, subject: finalSubject }, prospect, startedAt, {
      sent_via: "hostinger",
      subject: finalSubject,
    });
  } catch (err) {
    // The email is out. Make sure the row can never be released back to 'draft' and re-sent.
    await supabase
      .from("outreach_messages")
      .update({ status: "sent", sent_at: startedAt.toISOString(), sent_via: "hostinger" })
      .eq("id", msg.id);
    throw new Error(
      `Email was sent, but updating the tracker failed: ${err instanceof Error ? err.message : "unknown error"}. Refresh before doing anything else.`,
    );
  }

  // Best effort: remember the Sent copy so follow-ups can thread under it.
  const ref = await lookupSentUid(to, finalSubject, startedAt);
  if (ref) {
    await supabase
      .from("outreach_messages")
      .update({ sent_uid: ref.uid, sent_folder: ref.folder })
      .eq("id", msg.id);
  }

  return { sentToday: sentToday + 1, dailyCap: cap, threaded: Boolean(parent) };
}

// ---------- Reply detection ----------

export interface ReplyScanResult {
  checked: number;
  replies: number;
  optOuts: number;
  bounces: number;
  autoReplies: number;
}

const REPLY_NOTE: Record<InboundKind, string> = {
  reply: "Replied",
  opt_out: "Asked not to be contacted",
  bounce: "Email bounced (address not valid)",
  auto_reply: "Auto-reply (out of office)",
};

/**
 * Reads recent Inbox mail and records anything from a known prospect: a reply stops follow-ups,
 * an opt-out or bounce marks them do-not-contact, an auto-reply is logged only. Idempotent per
 * mailbox UID, so webhook retries and manual checks never double-process. Mail from anyone who
 * is not a prospect is ignored and never stored.
 */
export async function scanInboxForReplies(days = 3): Promise<ReplyScanResult> {
  if (!hostingerConfigured()) throw new Error("Sending is not set up, so replies cannot be read");
  const supabase = db();
  const result: ReplyScanResult = {
    checked: 0,
    replies: 0,
    optOuts: 0,
    bounces: 0,
    autoReplies: 0,
  };

  const since = new Date(Date.now() - days * 86400000);
  const messages = await listRecentInbox(since);
  result.checked = messages.length;
  if (messages.length === 0) return result;

  const { data: seenRows } = await supabase
    .from("outreach_inbound")
    .select("uid")
    .in(
      "uid",
      messages.map((m) => m.uid),
    );
  const seen = new Set(((seenRows ?? []) as { uid: number }[]).map((r) => r.uid));

  const { data: prospectRows, error } = await supabase
    .from("outreach_prospects")
    .select("*")
    .not("contact_email", "is", null);
  if (error) throw new Error(`Failed to load prospects: ${error.message}`);
  const byEmail = new Map<string, OutreachProspect>();
  for (const p of (prospectRows ?? []) as OutreachProspect[]) {
    if (p.contact_email) byEmail.set(p.contact_email.toLowerCase(), p);
  }

  // Oldest first, so the latest reply ends up as the prospect's last_reply_*.
  for (const m of [...messages].reverse()) {
    if (seen.has(m.uid) || !m.from?.address) continue;
    const fromEmail = m.from.address.toLowerCase();
    const direct = byEmail.get(fromEmail);
    const looksLikeBounce =
      classifyInbound({
        fromEmail,
        fromName: m.from.name,
        subject: m.subject,
      }) === "bounce";
    if (!direct && !looksLikeBounce) continue; // not a prospect: ignore entirely

    let text = "";
    try {
      text = await getMessageText(m.uid);
    } catch {
      // classify on subject alone
    }
    const kind = classifyInbound({ fromEmail, fromName: m.from.name, subject: m.subject, text });

    let prospect = direct;
    if (kind === "bounce") {
      prospect = emailsIn(text)
        .map((e) => byEmail.get(e))
        .find((p): p is OutreachProspect => !!p && p.last_contacted_at != null);
    }
    if (!prospect) continue;

    const receivedAt = m.date || new Date().toISOString();
    const snippet = kind === "bounce" ? REPLY_NOTE.bounce : snippetOf(text) || m.subject || "";
    const { error: insError } = await supabase.from("outreach_inbound").upsert(
      {
        uid: m.uid,
        prospect_id: prospect.id,
        received_at: receivedAt,
        from_email: fromEmail,
        subject: m.subject,
        snippet,
        kind,
      },
      { onConflict: "uid", ignoreDuplicates: true },
    );
    if (insError) throw new Error(`Failed to record reply: ${insError.message}`);

    const update: Record<string, unknown> = {
      last_reply_at: receivedAt,
      last_reply_snippet: snippet,
      last_reply_kind: kind,
    };
    const dateLabel = new Date(receivedAt).toLocaleDateString("en-IN");
    if (kind === "reply") {
      result.replies += 1;
      update.next_followup_at = null;
      if (!["booked", "won", "lost", "do_not_contact"].includes(prospect.status)) {
        update.status = "replied";
      }
    } else if (kind === "opt_out" || kind === "bounce") {
      if (kind === "opt_out") result.optOuts += 1;
      else result.bounces += 1;
      update.status = "do_not_contact";
      update.next_followup_at = null;
    } else {
      result.autoReplies += 1; // follow-ups continue
    }
    if (kind !== "auto_reply") {
      update.notes = [prospect.notes, `${dateLabel}: ${REPLY_NOTE[kind]} (auto-detected)`]
        .filter(Boolean)
        .join("\n");
    }
    const { error: upError } = await supabase
      .from("outreach_prospects")
      .update(update)
      .eq("id", prospect.id);
    if (upError) throw new Error(`Failed to update prospect: ${upError.message}`);
    prospect.notes = (update.notes as string | undefined) ?? prospect.notes;
    if (typeof update.status === "string") prospect.status = update.status as OutreachStatus;
  }
  return result;
}

/** Admin-triggered version of the scan (the "Check replies" button). */
export async function checkRepliesNow(): Promise<ReplyScanResult> {
  await requireAdmin();
  return scanInboxForReplies(7);
}

export async function deleteProspect(prospectId: string): Promise<void> {
  await requireAdmin();
  const { error } = await db().from("outreach_prospects").delete().eq("id", prospectId);
  if (error) throw new Error(`Failed to delete prospect: ${error.message}`);
}
