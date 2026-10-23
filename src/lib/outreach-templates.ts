// Draft generation for the internal outreach tool. Pure functions, safe on client and server.
// Voice rules: simple everyday English (short sentences, common words; many SMB owners are not
// fluent), no em dashes, no hype, no claims we cannot back up. Tamil Nadu prospects also get a
// natural written-Tamil version under the English, in the same email.
// Nothing here sends anything. Drafts are only sent after Sri confirms them in the admin UI.

import type { OutreachChannel, OutreachProduct } from "@/lib/types/outreach";

export interface DraftContext {
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  seenzoScore?: number | null;
}

export interface Draft {
  channel: OutreachChannel;
  subject: string | null;
  body: string;
}

const SIGN_OFF = "Sriram\nKlivIQ, Chennai\nkliviq.com";

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

function cityName(ctx: DraftContext): string | null {
  return (ctx.city ?? "").split(",")[0]?.trim() || null;
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

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "rediffmail.com",
  "icloud.com",
  "protonmail.com",
  "zoho.com",
]);

/**
 * True only when the contact's email domain matches the website host, so we never quote a
 * website that may belong to someone else (directory listings, parent bodies, scraped junk).
 */
export function websiteVerified(email?: string | null, url?: string | null): boolean {
  const domain = (email ?? "").split("@")[1]?.trim().toLowerCase();
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return false;
  const site = host(url);
  if (site === "your website") return false;
  const h = site.toLowerCase();
  return h === domain || h.endsWith(`.${domain}`) || domain.endsWith(`.${h}`);
}

// ---------- Tamil helpers ----------

// Tamil Nadu (and Puducherry) cities in their locative form ("in Chennai" = சென்னையில்).
// A prospect in one of these gets the Tamil version. Anyone else gets English only.
const TN_CITY_LOCATIVE: [RegExp, string][] = [
  [/chennai|madras/i, "சென்னையில்"],
  [/coimbatore|kovai/i, "கோயம்புத்தூரில்"],
  [/madurai/i, "மதுரையில்"],
  [/trichy|tiruchi|tiruchirappalli/i, "திருச்சியில்"],
  [/salem/i, "சேலத்தில்"],
  [/erode/i, "ஈரோட்டில்"],
  [/tiruppur|tirupur/i, "திருப்பூரில்"],
  [/vellore/i, "வேலூரில்"],
  [/tirunelveli/i, "திருநெல்வேலியில்"],
  [/thanjavur|tanjore/i, "தஞ்சாவூரில்"],
  [/puducherry|pondicherry|pondy/i, "புதுச்சேரியில்"],
  [/hosur/i, "ஓசூரில்"],
  [/karur/i, "கரூரில்"],
  [/kanchipuram|kancheepuram/i, "காஞ்சிபுரத்தில்"],
  [/nagercoil/i, "நாகர்கோவிலில்"],
  [/thoothukudi|tuticorin/i, "தூத்துக்குடியில்"],
  [/dindigul/i, "திண்டுக்கல்லில்"],
  [/kumbakonam/i, "கும்பகோணத்தில்"],
  [/namakkal/i, "நாமக்கல்லில்"],
  [/sivakasi/i, "சிவகாசியில்"],
  [/tamil\s*nadu/i, "தமிழ்நாட்டில்"],
];

function tamilCity(ctx: DraftContext): string | null {
  const c = ctx.city ?? "";
  for (const [re, loc] of TN_CITY_LOCATIVE) if (re.test(c)) return loc;
  return null;
}

/** Tamil word people actually use for the trade, plus "who" (person) or "which" (shop/place). */
const TAMIL_TRADE: [RegExp, string, "யார்" | "எது"][] = [
  [/chartered|accountant|audit|\bca\b|tax/i, "ஆடிட்டர்", "யார்"],
  [/architect/i, "ஆர்க்கிடெக்ட்", "யார்"],
  [/dental|dentist/i, "பல் மருத்துவர்", "யார்"],
  [/lawyer|advocate|legal|law firm/i, "வழக்கறிஞர்", "யார்"],
  [/clinic|hospital|doctor|physio/i, "மருத்துவமனை", "எது"],
  [/salon|beauty|parlour|parlor|spa/i, "அழகு நிலையம்", "எது"],
  [/saree|sari|textile|silk|boutique|fashion|garment|apparel/i, "ஜவுளிக் கடை", "எது"],
  [/coaching|academy|tuition|institute|school/i, "பயிற்சி மையம்", "எது"],
  [/restaurant|cafe|hotel|catering/i, "உணவகம்", "எது"],
  [/gym|fitness/i, "ஜிம்", "எது"],
];

function tamilTrade(ctx: DraftContext): { word: string; q: string } | null {
  const t = ctx.industry ?? "";
  for (const [re, word, q] of TAMIL_TRADE) if (re.test(t)) return { word, q };
  return null;
}

// ---------- Copy (English + Tamil) ----------

interface Pitch {
  hook: string;
  ask: string;
}

interface Copy {
  hi: string;
  pitch: Pitch;
  fix: string | null; // Seenzo only: KlivIQ can fix what the report finds
  remind: string; // step 2
  stop: string; // step 3
  optOut: string;
}

function englishCopy(product: OutreachProduct, ctx: DraftContext): Copy {
  const name = firstName(ctx.contactName);
  const biz = niceName(ctx.businessName);
  const city = cityName(ctx);
  const trade = ctx.industry?.trim().toLowerCase();
  let pitch: Pitch;

  if (product === "seenzo") {
    const site = websiteVerified(ctx.contactEmail, ctx.websiteUrl)
      ? host(ctx.websiteUrl)
      : "your website";
    pitch =
      ctx.seenzoScore != null
        ? {
            hook: `I checked ${site} with our tool, Seenzo. It shows how easily AI search like ChatGPT and Google can find a business. Your website got ${ctx.seenzoScore} out of 100. The report shows what needs to be fixed.`,
            ask: "I can send you the full report on WhatsApp or email. There is no cost.",
          }
        : {
            hook: `Many people now ask ChatGPT or Google AI to suggest a good ${trade || "business"}${city ? ` in ${city}` : " near them"}. Most local businesses do not come up in these answers. Usually it is because of small problems in the website.`,
            ask: "We have a free tool called Seenzo that checks this. If you like, I will check your website and send you a simple report. There is no cost.",
          };
  } else if (product === "tryon") {
    pitch = {
      hook: "We have made a tool called KlivIQ TryOn for saree and dress shops. Your customer uploads a photo. Then she can see the saree on herself before she buys. A saree shop in Chennai is already trying it.",
      ask: "If you sell online or on WhatsApp, I can show you a 2 minute demo with one of your own sarees.",
    };
  } else if (product === "connect") {
    pitch = {
      hook: `Many businesses${city ? ` in ${city}` : ""} miss customer enquiries on WhatsApp. Messages come at night or when you are busy, and no one replies in time. We have made KlivIQ Connect. It replies to common questions, takes bookings and passes the chat to you when needed. It works in English, Tamil and Hindi, on the official WhatsApp Business system.`,
      ask: "Can I show you a short demo on your own number?",
    };
  } else {
    pitch = {
      hook: "KlivIQ is a small team in Chennai. We help Indian businesses use AI in simple, useful ways: websites, WhatsApp automation and getting found on AI search. You do not need a big team or a big budget.",
      ask: "If any of this is useful to you, I can give you honest advice in a 15 minute call.",
    };
  }

  return {
    hi: name ? `Hi ${name},` : "Hi,",
    pitch,
    fix:
      product === "seenzo"
        ? "If there are problems, our team at KlivIQ (kliviq.com) can fix them for you. Then AI search can find your business and suggest it more easily. Just reply to this email."
        : null,
    remind:
      product === "seenzo"
        ? "Just a reminder about my last email. I can still check your website with Seenzo and send you the report. There is no cost. If it finds problems, our team at KlivIQ (kliviq.com) can fix them, so AI search can find your business more easily."
        : `Just a reminder about my last email about ${biz}. ${pitch.ask}`,
    stop: "I will stop writing now, so I do not fill your inbox. If you need help with this later, just reply to this email or message us on WhatsApp.",
    optOut: "If you are not interested, just tell me. I will not write again.",
  };
}

function tamilCopy(product: OutreachProduct, ctx: DraftContext): Copy | null {
  const where = tamilCity(ctx);
  if (!where) return null; // English only outside Tamil Nadu
  const name = firstName(ctx.contactName);
  const biz = niceName(ctx.businessName);
  let pitch: Pitch;

  if (product === "seenzo") {
    const site = websiteVerified(ctx.contactEmail, ctx.websiteUrl)
      ? `உங்கள் இணையதளத்தை (${host(ctx.websiteUrl)})`
      : "உங்கள் இணையதளத்தை";
    const trade = tamilTrade(ctx);
    const question = trade
      ? `"${where} நல்ல ${trade.word} ${trade.q}?"`
      : `"${where} இந்தத் துறையில் நல்ல நிறுவனம் எது?"`;
    pitch =
      ctx.seenzoScore != null
        ? {
            hook: `எங்கள் Seenzo கருவி மூலம் ${site} சரிபார்த்தேன். ChatGPT, Google போன்ற AI தேடல்கள் ஒரு நிறுவனத்தை எவ்வளவு எளிதாகக் கண்டுபிடிக்கும் என்பதை இது காட்டும். உங்கள் இணையதளம் 100-க்கு ${ctx.seenzoScore} மதிப்பெண் பெற்றுள்ளது. எதைச் சரி செய்ய வேண்டும் என்பதை அறிக்கை காட்டுகிறது.`,
            ask: "முழு அறிக்கையை WhatsApp அல்லது மின்னஞ்சல் மூலம் அனுப்புகிறேன். இதற்குக் கட்டணம் இல்லை.",
          }
        : {
            hook: `இப்போது பலர், ${question} என்று ChatGPT, Google AI போன்றவற்றில் கேட்கிறார்கள். ஆனால் பெரும்பாலான உள்ளூர் நிறுவனங்கள் அந்தப் பதில்களில் வருவதில்லை. பொதுவாக இதற்குக் காரணம் இணையதளத்தில் உள்ள சில சிறிய குறைகள்தான்.`,
            ask: "இதைச் சரிபார்க்க எங்களிடம் Seenzo என்ற இலவசக் கருவி உள்ளது. நீங்கள் விரும்பினால், உங்கள் இணையதளத்தைச் சரிபார்த்து, எளிமையான அறிக்கை ஒன்றை அனுப்புகிறேன். இதற்குக் கட்டணம் இல்லை.",
          };
  } else if (product === "tryon") {
    pitch = {
      hook: "புடவை மற்றும் ஆடைக் கடைகளுக்காக KlivIQ TryOn என்ற கருவியை உருவாக்கியுள்ளோம். வாடிக்கையாளர் தன் புகைப்படத்தைப் பதிவேற்றினால், வாங்குவதற்கு முன்பே அந்தப் புடவை தனக்கு எப்படி இருக்கும் என்று பார்க்கலாம். சென்னையில் ஒரு புடவைக் கடை ஏற்கனவே இதைப் பயன்படுத்திப் பார்க்கிறது.",
      ask: "நீங்கள் ஆன்லைனிலோ WhatsApp மூலமாகவோ விற்பனை செய்தால், உங்கள் புடவை ஒன்றை வைத்தே 2 நிமிட டெமோ காட்டுகிறேன்.",
    };
  } else if (product === "connect") {
    pitch = {
      hook: `${where} பல நிறுவனங்களுக்கு WhatsApp வழியாக வரும் வாடிக்கையாளர் விசாரணைகள் தவறிப் போகின்றன. இரவிலோ நீங்கள் வேலையாக இருக்கும் நேரத்திலோ செய்திகள் வரும்போது, உடனே யாரும் பதில் அனுப்புவதில்லை. இதற்காக KlivIQ Connect என்ற சேவையை உருவாக்கியுள்ளோம். இது பொதுவான கேள்விகளுக்குப் பதில் சொல்லும், முன்பதிவுகளை எடுக்கும், தேவைப்படும்போது உரையாடலை உங்களிடம் ஒப்படைக்கும். தமிழ், ஆங்கிலம், இந்தி ஆகிய மொழிகளில், அதிகாரப்பூர்வ WhatsApp Business முறையில் இது இயங்குகிறது.`,
      ask: "உங்கள் சொந்த எண்ணிலேயே ஒரு சிறிய டெமோ காட்டட்டுமா?",
    };
  } else {
    pitch = {
      hook: "KlivIQ சென்னையில் உள்ள ஒரு சிறிய குழு. இணையதளம், WhatsApp தானியங்கி சேவை, AI தேடல்களில் கண்டுபிடிக்கப்படுவது போன்றவற்றில், இந்திய நிறுவனங்கள் AI தொழில்நுட்பத்தை எளிமையாகவும் பயனுள்ள வகையிலும் பயன்படுத்த உதவுகிறோம். பெரிய குழுவோ பெரிய பட்ஜெட்டோ தேவையில்லை.",
      ask: "இவற்றில் ஏதாவது உங்களுக்குப் பயன்படும் என்றால், 15 நிமிட அழைப்பில் நேர்மையான ஆலோசனை தருகிறேன்.",
    };
  }

  return {
    hi: name ? `வணக்கம் ${name},` : "வணக்கம்,",
    pitch,
    fix:
      product === "seenzo"
        ? "ஏதேனும் குறைகள் இருந்தால், எங்கள் KlivIQ (kliviq.com) குழு அவற்றைச் சரி செய்து தரும். அதன் பிறகு AI தேடல்கள் உங்கள் நிறுவனத்தை எளிதாகக் கண்டுபிடித்துப் பரிந்துரைக்கும். இந்த மின்னஞ்சலுக்குப் பதில் அனுப்பினால் போதும்."
        : null,
    remind:
      product === "seenzo"
        ? "முன்பு அனுப்பிய மின்னஞ்சல் பற்றி நினைவூட்ட எழுதுகிறேன். உங்கள் இணையதளத்தை Seenzo மூலம் சரிபார்த்து அறிக்கை அனுப்ப இப்போதும் தயாராக இருக்கிறேன். இதற்குக் கட்டணம் இல்லை. குறைகள் இருந்தால், எங்கள் KlivIQ (kliviq.com) குழு அவற்றைச் சரி செய்து தரும். அதன் பிறகு AI தேடல்கள் உங்கள் நிறுவனத்தை எளிதாகக் கண்டுபிடிக்கும்."
        : `${biz} பற்றி முன்பு அனுப்பிய மின்னஞ்சல் பற்றி நினைவூட்ட எழுதுகிறேன். ${pitch.ask}`,
    stop: "உங்கள் இன்பாக்ஸை நிரப்ப வேண்டாம் என்பதால் இத்துடன் நிறுத்திக்கொள்கிறேன். பின்னர் இதில் உதவி தேவைப்பட்டால், இந்த மின்னஞ்சலுக்குப் பதில் அனுப்புங்கள் அல்லது WhatsApp மூலம் தொடர்பு கொள்ளுங்கள்.",
    optOut: "உங்களுக்கு இதில் விருப்பம் இல்லையென்றால், சொல்லுங்கள். மீண்டும் எழுத மாட்டேன்.",
  };
}

// ---------- Names and subjects ----------

/** Trims listing-style names ("KS Academy - Best #1 CA Coaching in Coimbatore") to the real name. */
export function shortName(name: string): string {
  const cut = name.split(/\s[-–|:]\s|,|\(/)[0]?.trim() || name.trim();
  return cut.length > 32 ? `${cut.slice(0, 32).replace(/\s+\S*$/, "")}` : cut;
}

const KEEP_UPPER = new Set([
  "CA",
  "CS",
  "CMA",
  "ACCA",
  "ICAI",
  "LLP",
  "GST",
  "TDS",
  "MSME",
  "HR",
  "IT",
  "AI",
  "UAE",
  "USA",
  "UK",
]);

const SMALL_WORDS = new Set(["and", "of", "the", "for", "in", "at", "on"]);

/** Title-cases SHOUTY or all-lowercase names (all-caps subjects look like spam), keeping initials and acronyms. */
export function niceName(name: string): string {
  const short = shortName(name);
  const letters = short.replace(/[^A-Za-z]/g, "");
  const upper = letters.replace(/[^A-Z]/g, "").length;
  const shouty = upper / Math.max(letters.length, 1) >= 0.8;
  const allLower = upper === 0;
  if (letters.length < 4 || (!shouty && !allLower)) return short;
  return short
    .split(/(\s+)/)
    .map((w, i) => {
      const bare = w.replace(/[^A-Za-z]/g, "");
      if (!bare) return w;
      if (i > 0 && SMALL_WORDS.has(bare.toLowerCase())) return w.toLowerCase();
      if (KEEP_UPPER.has(bare.toUpperCase()) || (shouty && !/[AEIOU]/i.test(bare)))
        return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join("");
}

// Subjects read like a normal work email: short, lowercase, the business name only (never a
// website we have not verified), no hype words, no "AI", no question-mark hooks, no scores.
const SUBJECTS: Record<OutreachProduct, (ctx: DraftContext) => string> = {
  seenzo: (c) => `quick question for ${niceName(c.businessName)}`,
  tryon: (c) => `idea for ${niceName(c.businessName)}`,
  connect: (c) => `whatsapp enquiries at ${niceName(c.businessName)}`,
  consulting: (c) => `idea for ${niceName(c.businessName)}`,
};

// ---------- Public API ----------

function emailBlock(c: Copy, step: 1 | 2 | 3): string {
  if (step === 1) {
    return [c.hi, c.pitch.hook, c.pitch.ask, c.fix, c.optOut].filter(Boolean).join("\n\n");
  }
  if (step === 2) return [c.hi, c.remind, c.optOut].join("\n\n");
  return [c.hi, c.stop].join("\n\n");
}

/** step 1 = first touch, 2 = short reminder (about day 4), 3 = last note (about day 10). */
export function buildDrafts(
  product: OutreachProduct,
  ctx: DraftContext,
  step: 1 | 2 | 3 = 1,
  channels: OutreachChannel[] = ["email", "linkedin", "whatsapp"],
): Draft[] {
  const en = englishCopy(product, ctx);
  const ta = tamilCopy(product, ctx);
  const subject = SUBJECTS[product](ctx);
  const out: Draft[] = [];

  for (const channel of channels) {
    if (channel === "email") {
      const tamil = ta ? `\n\nதமிழில்:\n\n${emailBlock(ta, step)}` : "";
      out.push({
        channel,
        subject, // follow-ups go as replies in the same thread
        body: `${emailBlock(en, step)}${tamil}\n\n${SIGN_OFF}`,
      });
      continue;
    }

    // LinkedIn and WhatsApp stay short and English only.
    let body: string;
    if (step === 1) {
      body =
        channel === "linkedin"
          ? `${en.hi} ${en.pitch.hook} ${en.pitch.ask}`.slice(0, 700)
          : `${en.hi} this is Sriram from KlivIQ, Chennai. ${en.pitch.hook}\n\n${en.pitch.ask}\n\nIf you are not interested, reply STOP. I will not message again.`;
    } else if (step === 2) {
      body = `${en.hi} ${en.remind}`;
    } else {
      body = `${en.hi} ${en.stop}`;
    }
    out.push({ channel, subject: null, body });
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
