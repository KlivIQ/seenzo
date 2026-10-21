// Draft generation for the internal outreach tool. Pure functions, safe on client and server.
// Voice rules: Indian English, no em dashes, no hype, no claims we cannot back up.
// Nothing here sends anything. Every draft is reviewed and sent manually.

import type { OutreachChannel, OutreachProduct } from "@/lib/types/outreach";

export interface DraftContext {
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  seenzoScore?: number | null;
}

export interface Draft {
  channel: OutreachChannel;
  subject: string | null;
  body: string;
}

const SIGN_OFF = "Sriram\nKlivIQ, Chennai\nkliviq.com";
const OPT_OUT = "If this is not relevant, just tell me and I will not write again.";

const TRYON_RE = /saree|sari|ethnic|textile|boutique|fashion|apparel|silk|handloom|garment/i;
const CONNECT_RE =
  /clinic|salon|spa|dental|dentist|hospital|gym|fitness|restaurant|cafe|coaching|academy|school/i;

export function pickProduct(
  industry?: string | null,
  businessName?: string | null,
): OutreachProduct {
  const text = `${industry ?? ""} ${businessName ?? ""}`;
  if (TRYON_RE.test(text)) return "tryon";
  if (CONNECT_RE.test(text)) return "connect";
  return "seenzo";
}

function firstName(name?: string | null): string | null {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n ? n : null;
}

function greeting(ctx: DraftContext): string {
  const n = firstName(ctx.contactName);
  return n ? `Hi ${n},` : "Hi,";
}

function where(ctx: DraftContext): string {
  const city = (ctx.city ?? "").split(",")[0]?.trim();
  return city ? ` in ${city}` : "";
}

function host(url?: string | null): string {
  if (!url) return "your website";
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "your website";
  }
}

// ---------- Step 1 openers by product ----------

function seenzoPitch(ctx: DraftContext): { hook: string; ask: string } {
  const site = host(ctx.websiteUrl);
  const hook =
    ctx.seenzoScore != null
      ? `I ran ${site} through Seenzo, a tool we built that checks how visible a business is to AI search like ChatGPT and Google's AI answers. It scored ${ctx.seenzoScore} out of 100, and the report lists exactly what is holding it back.`
      : `When people ask ChatGPT or Google's AI who is a good ${ctx.industry?.toLowerCase() || "firm"}${where(ctx)}, most local businesses do not show up, often because of small technical gaps on their website.`;
  const ask =
    ctx.seenzoScore != null
      ? "Happy to send the full report on WhatsApp or email. It is free."
      : "We built Seenzo (seenzo.in) to check this. The scan is free and takes about a minute, and the report is in plain English.";
  return { hook, ask };
}

function tryonPitch(): { hook: string; ask: string } {
  return {
    hook: "We built KlivIQ TryOn, a virtual try-on widget for saree and ethnic wear stores. A customer uploads a photo and sees the saree on herself before ordering. We are piloting it with a saree store in Chennai.",
    ask: "If you sell online or on WhatsApp, I can show you a 2 minute demo on one of your own sarees.",
  };
}

function connectPitch(ctx: DraftContext): { hook: string; ask: string } {
  return {
    hook: `Most ${ctx.industry?.toLowerCase() || "small business"} owners${where(ctx)} lose enquiries because WhatsApp messages come in at night or during work and nobody replies quickly. We built KlivIQ Connect, which answers common questions, takes bookings and hands over to you, in English, Tamil or Hindi, on the official WhatsApp Business API.`,
    ask: "Would a short demo on your own number be useful?",
  };
}

function consultingPitch(): { hook: string; ask: string } {
  return {
    hook: "KlivIQ is a small Chennai studio that helps Indian businesses use AI in practical ways: websites, WhatsApp automation and AI visibility, without a big team or big budget.",
    ask: "If any of that is on your list this year, I can give you an honest opinion in a 15 minute call.",
  };
}

function pitchFor(product: OutreachProduct, ctx: DraftContext): { hook: string; ask: string } {
  switch (product) {
    case "tryon":
      return tryonPitch();
    case "connect":
      return connectPitch(ctx);
    case "consulting":
      return consultingPitch();
    default:
      return seenzoPitch(ctx);
  }
}

const SUBJECTS: Record<OutreachProduct, (ctx: DraftContext) => string> = {
  seenzo: (c) =>
    c.seenzoScore != null
      ? `${c.businessName}: AI visibility score ${c.seenzoScore}/100`
      : `Does AI search recommend ${c.businessName}?`,
  tryon: (c) => `Virtual try-on for ${c.businessName}`,
  connect: (c) => `Faster WhatsApp replies for ${c.businessName}`,
  consulting: (c) => `A quick idea for ${c.businessName}`,
};

// ---------- Public API ----------

/** step 1 = first touch, 2 = short nudge (about day 4), 3 = last note (about day 10). */
export function buildDrafts(
  product: OutreachProduct,
  ctx: DraftContext,
  step: 1 | 2 | 3 = 1,
  channels: OutreachChannel[] = ["email", "linkedin", "whatsapp"],
): Draft[] {
  const { hook, ask } = pitchFor(product, ctx);
  const hi = greeting(ctx);
  const subject = SUBJECTS[product](ctx);
  const out: Draft[] = [];

  for (const channel of channels) {
    if (step === 1) {
      if (channel === "email") {
        out.push({
          channel,
          subject,
          body: `${hi}\n\n${hook}\n\n${ask}\n\n${OPT_OUT}\n\n${SIGN_OFF}`,
        });
      } else if (channel === "linkedin") {
        out.push({
          channel,
          subject: null,
          body: `${hi} ${hook} ${ask}`.slice(0, 700),
        });
      } else {
        out.push({
          channel,
          subject: null,
          body: `${hi} this is Sriram from KlivIQ, Chennai. ${hook}\n\n${ask}\n\nIf not relevant, reply STOP and I will not message again.`,
        });
      }
    } else if (step === 2) {
      const line = `Just following up on my earlier note about ${ctx.businessName}. ${ask}`;
      out.push({
        channel,
        subject: channel === "email" ? `Re: ${subject}` : null,
        body:
          channel === "email" ? `${hi}\n\n${line}\n\n${OPT_OUT}\n\n${SIGN_OFF}` : `${hi} ${line}`,
      });
    } else {
      const line = `I will stop here so I do not clutter your inbox. If ${product === "seenzo" ? "AI visibility" : "this"} becomes a priority later, you can reach me at hello@kliviq.com or on WhatsApp.`;
      out.push({
        channel,
        subject: channel === "email" ? `Re: ${subject}` : null,
        body: channel === "email" ? `${hi}\n\n${line}\n\n${SIGN_OFF}` : `${hi} ${line}`,
      });
    }
  }
  return out;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
