// Lightweight regex-based HTML parsing — no DOMParser/cheerio/jsdom, so this
// stays edge-safe (Cloudflare Workers has no DOM implementation available).

export interface ParsedLink {
  href: string;
  text: string;
}

function stripScriptsAndStyles(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
}

/** Visible text only — tags, scripts and styles removed, whitespace collapsed. */
export function visibleText(html: string): string {
  return stripScriptsAndStyles(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  const title = visibleText(match[1]).trim();
  return title.length > 0 ? title : null;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = re.exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function findTags(html: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return html.match(re) ?? [];
}

/** Reads a <meta> tag's content by name= or property= (case-insensitive, either order). */
export function extractMetaContent(html: string, key: string): string | null {
  for (const tag of findTags(html, "meta")) {
    const name = attr(tag, "name") ?? attr(tag, "property");
    if (name?.toLowerCase() === key.toLowerCase()) {
      const content = attr(tag, "content");
      if (content) return content.trim();
    }
  }
  return null;
}

export function extractCanonical(html: string): string | null {
  for (const tag of findTags(html, "link")) {
    const rel = attr(tag, "rel");
    if (rel?.toLowerCase() === "canonical") {
      return attr(tag, "href");
    }
  }
  return null;
}

export function extractHeadingLevels(html: string): number[] {
  const matches = stripScriptsAndStyles(html).matchAll(/<h([1-6])\b[^>]*>/gi);
  return Array.from(matches, (m) => Number(m[1]));
}

/** Parses every <script type="application/ld+json"> block, silently skipping invalid JSON. */
export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      blocks.push(parsed);
    } catch {
      // Invalid JSON-LD — ignore this block, don't fail the whole scan over it.
    }
  }
  return blocks;
}

/** Collects every "@type" value referenced anywhere in a set of parsed JSON-LD blocks. */
export function jsonLdTypes(blocks: unknown[]): string[] {
  const types: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const t = obj["@type"];
      if (typeof t === "string") types.push(t);
      else if (Array.isArray(t)) types.push(...t.filter((v): v is string => typeof v === "string"));
      if (Array.isArray(obj["@graph"])) visit(obj["@graph"]);
      for (const value of Object.values(obj)) {
        if (value && typeof value === "object") visit(value);
      }
    }
  };
  blocks.forEach(visit);
  return types;
}

export function extractLinks(html: string, baseUrl: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const re = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const rawHref = match[1] ?? match[2] ?? "";
    if (!rawHref || rawHref.startsWith("#")) continue;
    try {
      const resolved = new URL(rawHref, baseUrl).toString();
      links.push({ href: resolved, text: visibleText(match[3]) });
    } catch {
      // Malformed href (e.g. javascript:) — skip.
    }
  }
  return links;
}

/**
 * Heuristic SPA detector: a client-rendered app's raw HTML response (before
 * JS execution) is a near-empty shell — little visible text, no headings.
 * A server-rendered/static site has real content in the initial HTML.
 */
export function detectSpa(html: string): boolean {
  const text = visibleText(html);
  const headings = extractHeadingLevels(html);
  return text.length < 250 && headings.length === 0;
}

export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export function parseRobotsTxt(body: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value);
    } else if (key === "sitemap" && value) {
      sitemaps.push(value);
    }
  }

  return { groups, sitemaps };
}

export function extractSitemapUrls(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi), (m) => m[1]);
}

export function extractSitemapLastmods(xml: string): Date[] {
  const dates: Date[] = [];
  for (const match of xml.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)) {
    const date = new Date(match[1]);
    if (!Number.isNaN(date.getTime())) dates.push(date);
  }
  return dates;
}
