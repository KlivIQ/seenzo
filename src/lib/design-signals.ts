// "Does this website look dated?" signals, plus the combined redo score used to rank prospects.
// Pure functions over the homepage HTML: regex only, no DOM, so it stays edge-safe.

export interface Signal {
  id: string;
  /** Plain-English finding, safe to quote in an outreach message. */
  label: string;
  points: number;
}

export interface DesignInput {
  html: string;
  fetchMs: number;
  usesHttps: boolean;
  /** Current year, injectable for tests. */
  year?: number;
}

export interface DesignResult {
  /** 0-100, higher = older / clunkier. */
  oldScore: number;
  /** 0-100, higher = more missed enquiries. */
  conversionGap: number;
  design: Signal[];
  conversion: Signal[];
  platform: string | null;
  copyrightYear: number | null;
}

const MAX_DESIGN_POINTS = 100;
const MAX_CONVERSION_POINTS = 22;

function has(html: string, re: RegExp): boolean {
  return re.test(html);
}

/** Latest year mentioned next to a copyright mark, e.g. "© 2019" or "Copyright 2015-2018". */
export function copyrightYear(html: string): number | null {
  const re =
    /(?:©|&copy;|&#169;|copyright)[^0-9<]{0,40}((?:19|20)\d{2})(?:\s*(?:-|–|—|to)\s*((?:19|20)\d{2}))?/gi;
  let latest: number | null = null;
  for (const m of html.matchAll(re)) {
    const y = Number(m[2] ?? m[1]);
    if (y >= 1995 && y <= 2100 && (latest === null || y > latest)) latest = y;
  }
  return latest;
}

export function detectPlatform(html: string): string | null {
  const gen = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  const checks: [RegExp, string][] = [
    [/wp-content|wp-includes|wordpress/i, "WordPress"],
    [/joomla/i, "Joomla"],
    [/drupal/i, "Drupal"],
    [/wixsite\.com|wix\.com|X-Wix|wixstatic/i, "Wix"],
    [/squarespace/i, "Squarespace"],
    [/weebly/i, "Weebly"],
    [/blogspot\.com|blogger\.com/i, "Blogger"],
    [/cdn\.shopify\.com|shopify/i, "Shopify"],
    [/webflow/i, "Webflow"],
    [/_next\/static|__next/i, "Next.js"],
    [/frontpage|dreamweaver/i, "FrontPage/Dreamweaver"],
  ];
  const hay = `${gen ?? ""}\n${html.slice(0, 60000)}`;
  for (const [re, name] of checks) if (re.test(hay)) return name;
  return gen ? gen.split(/\s+/)[0] : null;
}

const DATED_PLATFORMS = new Set(["Joomla", "Blogger", "Weebly", "FrontPage/Dreamweaver"]);

export function analyseDesign(input: DesignInput): DesignResult {
  const { html, fetchMs, usesHttps } = input;
  const year = input.year ?? new Date().getFullYear();
  const design: Signal[] = [];
  const add = (id: string, label: string, points: number) => design.push({ id, label, points });

  if (!usesHttps) add("no_https", "Browsers show it as 'Not secure' (no HTTPS)", 15);

  if (!has(html, /<meta[^>]+name=["']viewport["']/i)) {
    add("no_viewport", "Not built for mobile phones (it shows the desktop layout)", 20);
  }

  const cy = copyrightYear(html);
  if (cy !== null && cy <= year - 3) add("old_copyright", `The footer still says © ${cy}`, 12);

  const legacy: string[] = [];
  if (has(html, /<font\b/i)) legacy.push("font tags");
  if (has(html, /<marquee\b|<blink\b/i)) legacy.push("scrolling text");
  if (has(html, /<center\b/i)) legacy.push("centre tags");
  if (has(html, /<frameset\b|<frame\b/i)) legacy.push("frames");
  if (has(html, /\.swf\b|shockwave|<embed[^>]+flash/i)) legacy.push("Flash");
  const tables = (html.match(/<table\b/gi) ?? []).length;
  if (tables >= 6) legacy.push("table-based layout");
  if (legacy.length > 0) {
    add("legacy_markup", `Built with old web code (${legacy.slice(0, 3).join(", ")})`, 15);
  }

  const oldLibs: string[] = [];
  if (has(html, /jquery[-./]?(?:1|2)\.\d+(?:\.\d+)?(?:\.min)?\.js|jquery\/(?:1|2)\.\d/i)) {
    oldLibs.push("jQuery 1/2");
  }
  if (has(html, /bootstrap[/@-]?3\.\d|bootstrap\/3\./i)) oldLibs.push("Bootstrap 3");
  if (oldLibs.length > 0) add("old_libs", `Uses outdated scripts (${oldLibs.join(", ")})`, 8);

  const platform = detectPlatform(html);
  if (platform && DATED_PLATFORMS.has(platform)) {
    add("dated_platform", `Built on ${platform}, a dated or hard-to-update platform`, 10);
  }
  if (has(html, /\.wixsite\.com|\.blogspot\.com|\.weebly\.com|\.business\.site/i)) {
    add("free_subdomain", "Runs on a free website address, not its own domain", 8);
  }

  const imgs = (html.match(/<img\b/gi) ?? []).length;
  if (imgs >= 5) {
    const modern =
      has(html, /loading=["']lazy["']/i) ||
      has(html, /\bsrcset=/i) ||
      has(html, /<picture\b/i) ||
      has(html, /\.(?:webp|avif)\b/i);
    if (!modern) add("old_images", "Photos are not optimised, so pages load slowly on phones", 6);
  }

  const kb = Math.round(new TextEncoder().encode(html).length / 1024);
  if (fetchMs > 3500 || kb > 1500) add("slow", "Slow to load", 10);
  else if (fetchMs > 1800 || kb > 800) add("slowish", "Slower than it should be", 4);

  if (!has(html, /<link[^>]+rel=["'][^"']*icon[^"']*["']/i)) {
    add("no_favicon", "No site icon in the browser tab", 3);
  }

  // Conversion: can a visitor reach the business in one tap?
  const conversion: Signal[] = [];
  const addC = (id: string, label: string, points: number) =>
    conversion.push({ id, label, points });

  const whatsapp = has(html, /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|web\.whatsapp\.com/i);
  const tel = has(html, /href=["']tel:/i);
  const form = has(html, /<form\b/i);
  const chat = has(
    html,
    /tawk\.to|tidio|crisp\.chat|intercom|drift\.com|zendesk|zopim|wati\.io|interakt|botpress|chatbot|livechat|freshchat|hubspot.*conversations/i,
  );
  if (!whatsapp) addC("no_whatsapp", "No WhatsApp button on the site", 8);
  if (!tel) addC("no_tel", "Phone number is not tap-to-call on mobile", 4);
  if (!form && !whatsapp) addC("no_enquiry", "No way to send an enquiry from the site", 5);
  if (!chat) addC("no_chat", "No chat or booking assistant", 5);

  const designPoints = Math.min(
    MAX_DESIGN_POINTS,
    design.reduce((a, s) => a + s.points, 0),
  );
  const convPoints = conversion.reduce((a, s) => a + s.points, 0);

  return {
    oldScore: designPoints,
    conversionGap: Math.round(
      (Math.min(convPoints, MAX_CONVERSION_POINTS) / MAX_CONVERSION_POINTS) * 100,
    ),
    design,
    conversion,
    platform,
    copyrightYear: cy,
  };
}

export type Verdict = "target" | "maybe" | "skip";

export const VERDICT_THRESHOLDS = { target: 50, maybe: 30 } as const;

/**
 * How much the site needs a redo, 0-100. Weights: SEO / AI-search gap 40%, dated design 45%,
 * missed enquiries 15%. `seenzoScore` is the Seenzo score (high = healthy).
 */
export function redoScore(
  seenzoScore: number,
  d: Pick<DesignResult, "oldScore" | "conversionGap">,
) {
  const seoGap = Math.max(0, Math.min(100, 100 - seenzoScore));
  return Math.round(0.4 * seoGap + 0.45 * d.oldScore + 0.15 * d.conversionGap);
}

export function verdictFor(redo: number): Verdict {
  if (redo >= VERDICT_THRESHOLDS.target) return "target";
  if (redo >= VERDICT_THRESHOLDS.maybe) return "maybe";
  return "skip";
}
