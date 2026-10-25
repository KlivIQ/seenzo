// DM queue logic for the outreach tool (Instagram, WhatsApp, LinkedIn). Pure functions, no I/O.
// These channels are sent by hand: the queue only decides who is next and what to say.

import type { DmChannel } from "@/lib/outreach-templates";
import type { OutreachMessage, OutreachProspect } from "@/lib/types/outreach";

export const DM_CHANNELS: DmChannel[] = ["whatsapp", "instagram", "linkedin"];

/** Advisory daily limits per channel. Going over risks the account being limited. */
export const DM_DAILY_LIMIT: Record<DmChannel, number> = {
  whatsapp: 20,
  instagram: 15,
  linkedin: 15,
};

/** Days to wait after step n before step n+1, same rhythm as email. */
export const DM_FOLLOWUP_DAYS: Record<number, number> = { 1: 4, 2: 6 };

const HANDLE_RE = /^[a-z0-9._]{1,30}$/i;
const IG_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "tv"]);

/** "@sthree.creations", "instagram.com/sthree.creations/?hl=en" -> "sthree.creations". null if invalid. */
export function normalizeInstagram(input: string | null | undefined): string | null {
  let v = (input ?? "").trim();
  if (!v) return null;
  v = v.replace(/^https?:\/\//i, "").replace(/^(www\.)?(instagram\.com|instagr\.am)\//i, "");
  v = v.split(/[/?#]/)[0].replace(/^@/, "").trim().toLowerCase();
  if (!HANDLE_RE.test(v) || IG_RESERVED.has(v)) return null;
  return v;
}

export function channelRoute(p: OutreachProspect, channel: DmChannel): boolean {
  if (channel === "whatsapp") return (p.contact_phone ?? "").replace(/\D/g, "").length >= 10;
  if (channel === "instagram") return Boolean(p.instagram_handle);
  return Boolean(p.linkedin_url);
}

const ENDED = new Set(["replied", "booked", "won", "lost", "do_not_contact"]);

export interface QueueItem {
  prospect: OutreachProspect;
  channel: DmChannel;
  step: 1 | 2 | 3;
  /** Draft already saved for this step, if any. */
  draft: OutreachMessage | null;
  /** Days overdue for follow-ups (0 for first touches). */
  overdueDays: number;
}

/** Start of the current day in India (IST, UTC+5:30) as a timestamp. */
export function istDayStart(now: number): number {
  const OFFSET = 5.5 * 3600000;
  return Math.floor((now + OFFSET) / 86400000) * 86400000 - OFFSET;
}

/** DMs sent by hand today, per channel (for the advisory daily counters). */
export function sentToday(
  messages: OutreachMessage[],
  now = Date.now(),
): Record<DmChannel, number> {
  const start = istDayStart(now);
  const out: Record<DmChannel, number> = { whatsapp: 0, instagram: 0, linkedin: 0 };
  for (const m of messages) {
    if (m.status !== "sent" || !m.sent_at || m.channel === "email") continue;
    if (new Date(m.sent_at).getTime() >= start) out[m.channel] += 1;
  }
  return out;
}

/**
 * Who to message next. One channel per prospect: the channel already in use if any, otherwise the
 * first route they have (WhatsApp, then Instagram, then LinkedIn). First touches come after
 * follow-ups that are due, and follow-ups are ordered by how overdue they are.
 */
export function buildDmQueue(
  prospects: OutreachProspect[],
  messages: OutreachMessage[],
  now = Date.now(),
): QueueItem[] {
  const byProspect = new Map<string, OutreachMessage[]>();
  for (const m of messages) {
    if (m.channel === "email") continue;
    const list = byProspect.get(m.prospect_id) ?? [];
    list.push(m);
    byProspect.set(m.prospect_id, list);
  }

  const followups: QueueItem[] = [];
  const firsts: QueueItem[] = [];

  for (const p of prospects) {
    if (ENDED.has(p.status) || p.audit_verdict === "skip") continue;
    const dms = byProspect.get(p.id) ?? [];
    const sent = dms.filter((m) => m.status === "sent");

    const used = DM_CHANNELS.find((c) => sent.some((m) => m.channel === c && channelRoute(p, c)));
    const channel = used ?? DM_CHANNELS.find((c) => channelRoute(p, c));
    if (!channel) continue;

    const mine = sent.filter((m) => m.channel === channel);
    const lastStep = mine.reduce((a, m) => Math.max(a, m.step), 0);
    const draftFor = (step: number) =>
      dms.find((m) => m.channel === channel && m.step === step && m.status === "draft") ?? null;

    if (lastStep === 0) {
      // Emailed in the last 3 days? Give that a chance before also messaging them on a DM channel.
      if (p.last_contacted_at && now - new Date(p.last_contacted_at).getTime() < 3 * 86400000) {
        continue;
      }
      firsts.push({ prospect: p, channel, step: 1, draft: draftFor(1), overdueDays: 0 });
      continue;
    }
    if (lastStep >= 3) continue;

    const last = mine.filter((m) => m.step === lastStep).at(-1);
    const wait = DM_FOLLOWUP_DAYS[lastStep];
    if (!last?.sent_at || !wait) continue;
    const dueAt = new Date(last.sent_at).getTime() + wait * 86400000;
    if (dueAt <= now) {
      followups.push({
        prospect: p,
        channel,
        step: (lastStep + 1) as 2 | 3,
        draft: draftFor(lastStep + 1),
        overdueDays: Math.floor((now - dueAt) / 86400000),
      });
    }
  }

  followups.sort((a, b) => b.overdueDays - a.overdueDays);
  return [...followups, ...firsts];
}
