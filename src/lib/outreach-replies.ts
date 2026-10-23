// Classifies inbound mail for the outreach tool. Pure functions, no I/O, easy to test.

export type InboundKind = "reply" | "opt_out" | "bounce" | "auto_reply";

const BOUNCE_FROM = /mailer-daemon|postmaster|mail delivery (subsystem|system)/i;
const BOUNCE_SUBJECT =
  /undeliver|delivery status notification|failure notice|returned mail|delivery (has )?failed|mail delivery failed|could not be delivered|address not found/i;
const AUTO_SUBJECT =
  /out of (the )?office|auto(matic)?[- ]?reply|autoreply|on leave|vacation|away from/i;
// Clear opt-out phrases, checked only in the person's own text (quoted mail removed first).
const OPT_OUT =
  /\b(stop|unsubscribe|remove me|take me off|not interested|no thanks|no thank you|don'?t (email|contact|message|write)|do not (email|contact|message|write))\b|வேண்டாம்|விருப்பம் இல்லை|அனுப்ப வேண்டாம்/i;

/**
 * Keeps only what the sender wrote, dropping the quoted copy of our email. Our own opt-out line
 * ("If you are not interested...") appears in the quote, so this matters for opt-out detection.
 */
export function ownText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith(">")) break;
    if (/^on .{3,200}wrote:?$/i.test(l)) break; // Gmail / Apple Mail
    if (/^-{2,}\s*original message\s*-{2,}$/i.test(l)) break; // Outlook
    if (/^from:\s.+@/i.test(l)) break; // Outlook header block
    if (/^sent from my /i.test(l)) break;
    if (/^(hi|hello),?$/i.test(l) && out.length === 0) continue;
    if (/^sriram$|^klivIQ, chennai$|^kliviq\.com$/i.test(l)) break; // our signature quoted inline
    out.push(line);
  }
  return out.join("\n").trim();
}

export function classifyInbound(input: {
  fromEmail: string;
  fromName?: string | null;
  subject?: string | null;
  text?: string | null;
}): InboundKind {
  const subject = input.subject ?? "";
  if (BOUNCE_FROM.test(input.fromEmail) || BOUNCE_FROM.test(input.fromName ?? "")) return "bounce";
  if (BOUNCE_SUBJECT.test(subject)) return "bounce";
  if (AUTO_SUBJECT.test(subject)) return "auto_reply";
  const own = ownText(input.text ?? "");
  if (own && OPT_OUT.test(own.slice(0, 500))) return "opt_out";
  return "reply";
}

export function snippetOf(text: string | null | undefined, max = 280): string {
  const own = ownText(text ?? "");
  const flat = (own || (text ?? "")).replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Email addresses mentioned in a bounce message (the original recipient is among them). */
export function emailsIn(text: string | null | undefined): string[] {
  const found = (text ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))];
}
