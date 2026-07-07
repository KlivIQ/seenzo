import {
  detectSpa,
  extractCanonical,
  extractHeadingLevels,
  extractJsonLdBlocks,
  extractLinks,
  extractMetaContent,
  extractSitemapLastmods,
  extractTitle,
  jsonLdTypes,
  parseRobotsTxt,
  visibleText,
} from "./html";
import type { CheckDefinition, CheckOutcome, CrawlData, FetchedPage } from "./types";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function allPages(data: CrawlData): FetchedPage[] {
  return [data.homepage, ...data.pages];
}

function allHtml(data: CrawlData): string {
  return allPages(data)
    .map((p) => p.html)
    .join("\n");
}

function allLinks(data: CrawlData): { href: string; text: string }[] {
  return allPages(data).flatMap((p) => extractLinks(p.html, p.url));
}

function outcome(
  result: CheckOutcome["result"],
  evidence: string,
  fix_text: string,
  effort: CheckOutcome["effort"],
): CheckOutcome {
  return { result, evidence, fix_text, effort };
}

const AI_BOT_AGENTS = [
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "google-extended",
  "perplexitybot",
  "anthropic-ai",
  "claudebot",
  "claude-web",
  "ccbot",
  "applebot-extended",
];

const INDIAN_DIRECTORY_HOSTS = [
  "justdial.com",
  "indiamart.com",
  "sulekha.com",
  "tradeindia.com",
  "yellowpages.in",
  "asklaila.com",
];

const BLOG_PATH_RE = /\/(blog|news|articles|insights)(\/|$)/i;
const ABOUT_RE = /\babout\b/i;
const CONTACT_RE = /\bcontact\b/i;
const PRIVACY_RE = /\bprivacy\b/i;
const TERMS_RE = /\b(terms|tos)\b/i;

function phoneMatches(text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g));
}

// ---------------------------------------------------------------------------
// Crawlability — 25%
// ---------------------------------------------------------------------------

const https: CheckDefinition = {
  id: "https",
  category: "crawlability",
  label: "HTTPS",
  run: (data) => {
    const isHttps = data.homepage.url.startsWith("https://");
    return isHttps
      ? outcome("pass", "Site is served over HTTPS.", "", "low")
      : outcome(
          "fail",
          `Site is served over ${new URL(data.homepage.url).protocol.replace(":", "")}, not HTTPS.`,
          "Move the site to HTTPS with a valid TLS certificate — AI crawlers deprioritize insecure sites.",
          "med",
        );
  },
};

const robots_exists: CheckDefinition = {
  id: "robots_exists",
  category: "crawlability",
  label: "robots.txt present",
  run: (data) => {
    if (data.robots && data.robots.status === 200 && data.robots.body.trim().length > 0) {
      return outcome("pass", "robots.txt found and non-empty.", "", "low");
    }
    return outcome(
      "fail",
      "No robots.txt found at /robots.txt.",
      "Add a robots.txt file that explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) and links your sitemap.",
      "low",
    );
  },
};

const robots_ai_bots: CheckDefinition = {
  id: "robots_ai_bots",
  category: "crawlability",
  label: "AI bots allowed in robots.txt",
  run: (data) => {
    if (!data.robots || data.robots.status !== 200) {
      return outcome(
        "pass",
        "No robots.txt present, so no AI crawler is explicitly blocked.",
        "",
        "low",
      );
    }
    const parsed = parseRobotsTxt(data.robots.body);
    const blocked: string[] = [];
    const restricted: string[] = [];

    for (const group of parsed.groups) {
      const targetsAiBot = group.agents.some((a) => a === "*" || AI_BOT_AGENTS.includes(a));
      if (!targetsAiBot) continue;
      const fullyBlocked = group.disallow.some((d) => d === "/");
      if (fullyBlocked) {
        blocked.push(...group.agents.filter((a) => a !== "*"));
        if (group.agents.includes("*")) blocked.push("* (all bots)");
      } else if (group.disallow.length > 0) {
        restricted.push(...group.agents);
      }
    }

    if (blocked.length > 0) {
      return outcome(
        "fail",
        `robots.txt fully blocks: ${Array.from(new Set(blocked)).join(", ")}.`,
        "Remove the Disallow: / rule for AI crawler user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) so your pages can be read and cited.",
        "low",
      );
    }
    if (restricted.length > 0) {
      return outcome(
        "partial",
        `robots.txt partially restricts: ${Array.from(new Set(restricted)).join(", ")}.`,
        "Review the Disallow paths for AI crawler user-agents to make sure your key content pages aren't excluded.",
        "low",
      );
    }
    return outcome("pass", "No AI crawler is blocked in robots.txt.", "", "low");
  },
};

const sitemap_exists: CheckDefinition = {
  id: "sitemap_exists",
  category: "crawlability",
  label: "XML sitemap present",
  run: (data) => {
    if (
      data.sitemap &&
      data.sitemap.status === 200 &&
      /<urlset|<sitemapindex/i.test(data.sitemap.body)
    ) {
      return outcome("pass", "sitemap.xml found and valid.", "", "low");
    }
    return outcome(
      "fail",
      "No sitemap.xml found at /sitemap.xml.",
      "Publish an XML sitemap listing your key pages and reference it from robots.txt.",
      "low",
    );
  },
};

const sitemap_fresh: CheckDefinition = {
  id: "sitemap_fresh",
  category: "crawlability",
  label: "Sitemap freshness",
  run: (data) => {
    if (!data.sitemap || data.sitemap.status !== 200) {
      return outcome(
        "fail",
        "No sitemap available to check freshness.",
        "Publish an XML sitemap with <lastmod> dates so crawlers know what changed recently.",
        "low",
      );
    }
    const lastmods = extractSitemapLastmods(data.sitemap.body);
    if (lastmods.length === 0) {
      return outcome(
        "partial",
        "Sitemap exists but has no <lastmod> dates.",
        "Add <lastmod> timestamps to sitemap entries so AI crawlers can prioritize fresh content.",
        "low",
      );
    }
    const freshest = new Date(Math.max(...lastmods.map((d) => d.getTime())));
    const isFresh = Date.now() - freshest.getTime() <= NINETY_DAYS_MS;
    return isFresh
      ? outcome("pass", `Most recent sitemap entry updated ${freshest.toDateString()}.`, "", "low")
      : outcome(
          "fail",
          `Most recent sitemap entry is from ${freshest.toDateString()}, over 90 days old.`,
          "Update your sitemap lastmod dates by re-publishing or touching pages regularly.",
          "med",
        );
  },
};

const spa_detection: CheckDefinition = {
  id: "spa_detection",
  category: "crawlability",
  label: "Server-rendered content (not a bare SPA)",
  run: (data) => {
    const isSpa = detectSpa(data.homepage.html);
    if (!isSpa) {
      return outcome(
        "pass",
        "Homepage HTML contains real, readable content before JavaScript runs.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your website is invisible to AI engines. Every other finding below is secondary until this is fixed.",
      "Add server-side rendering or static pre-rendering (Next.js SSR/SSG, Astro, prerender.io) so AI crawlers see real content instead of an empty JS shell.",
      "high",
    );
  },
};

const pagespeed_mobile: CheckDefinition = {
  id: "pagespeed_mobile",
  category: "crawlability",
  label: "Mobile response speed",
  run: (data) => {
    const ms = data.homepage.fetchMs;
    const kb = Math.round(new TextEncoder().encode(data.homepage.html).length / 1024);
    if (ms <= 1500 && kb <= 500) {
      return outcome("pass", `Homepage fetched in ${ms}ms (${kb}KB).`, "", "low");
    }
    if (ms <= 3500 && kb <= 1500) {
      return outcome(
        "partial",
        `Homepage fetched in ${ms}ms (${kb}KB) — borderline for mobile.`,
        "Compress images, defer non-critical scripts, and trim page weight to speed up mobile loads.",
        "med",
      );
    }
    return outcome(
      "fail",
      `Homepage fetched in ${ms}ms (${kb}KB) — slow for mobile users and crawlers.`,
      "Run a Lighthouse/PageSpeed audit and address render-blocking resources and oversized assets.",
      "high",
    );
  },
};

// ---------------------------------------------------------------------------
// Structured Data — 20%
// ---------------------------------------------------------------------------

const jsonld_present: CheckDefinition = {
  id: "jsonld_present",
  category: "structured_data",
  label: "JSON-LD present",
  run: (data) => {
    const blocks = extractJsonLdBlocks(data.homepage.html);
    if (blocks.length > 0) {
      return outcome(
        "pass",
        `${blocks.length} valid JSON-LD block(s) found on homepage.`,
        "",
        "low",
      );
    }
    const hasTag = /<script[^>]+application\/ld\+json/i.test(data.homepage.html);
    if (hasTag) {
      return outcome(
        "partial",
        "A JSON-LD script tag exists but its contents don't parse as valid JSON.",
        "Fix the JSON syntax in your structured data block — validate with Google's Rich Results Test.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No JSON-LD structured data found on the homepage.",
      "Add JSON-LD structured data (Organization at minimum) so AI engines can extract facts about your business reliably.",
      "med",
    );
  },
};

const org_schema: CheckDefinition = {
  id: "org_schema",
  category: "structured_data",
  label: "Organization schema",
  run: (data) => {
    const types = jsonLdTypes(extractJsonLdBlocks(allHtml(data)));
    if (types.some((t) => /^organization$/i.test(t))) {
      return outcome("pass", "Organization schema found in JSON-LD.", "", "low");
    }
    return outcome(
      "fail",
      "No Organization schema found in any fetched page.",
      "Add an Organization JSON-LD block with your legal name, logo, URL and contact points.",
      "low",
    );
  },
};

const faq_schema: CheckDefinition = {
  id: "faq_schema",
  category: "structured_data",
  label: "FAQ schema",
  run: (data) => {
    const types = jsonLdTypes(extractJsonLdBlocks(allHtml(data)));
    if (types.some((t) => /^faqpage$/i.test(t))) {
      return outcome("pass", "FAQPage schema found.", "", "low");
    }
    return outcome(
      "fail",
      "No FAQPage schema found on any fetched page.",
      "Add FAQ schema to your most-visited pages — it's one of the highest-leverage ways to get quoted directly by ChatGPT and Perplexity.",
      "med",
    );
  },
};

const localbusiness_or_product: CheckDefinition = {
  id: "localbusiness_or_product",
  category: "structured_data",
  label: "LocalBusiness or Product schema",
  run: (data) => {
    const types = jsonLdTypes(extractJsonLdBlocks(allHtml(data)));
    const found = types.find((t) => /localbusiness|^product$|^store$|^restaurant$/i.test(t));
    if (found) {
      return outcome("pass", `${found} schema found.`, "", "low");
    }
    return outcome(
      "fail",
      "No LocalBusiness or Product schema found.",
      "Add LocalBusiness schema (with address + phone) or Product schema for your key offerings.",
      "med",
    );
  },
};

const breadcrumb: CheckDefinition = {
  id: "breadcrumb",
  category: "structured_data",
  label: "Breadcrumb markup",
  run: (data) => {
    const types = jsonLdTypes(extractJsonLdBlocks(allHtml(data)));
    if (types.some((t) => /^breadcrumblist$/i.test(t))) {
      return outcome("pass", "BreadcrumbList schema found.", "", "low");
    }
    const hasBreadcrumbNav = /aria-label\s*=\s*["']breadcrumb["']/i.test(allHtml(data));
    if (hasBreadcrumbNav) {
      return outcome(
        "partial",
        "Breadcrumb navigation markup found, but no BreadcrumbList schema.",
        "Add BreadcrumbList JSON-LD alongside your visual breadcrumbs.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No breadcrumb markup found.",
      "Add breadcrumb navigation with BreadcrumbList schema to reinforce your site hierarchy.",
      "low",
    );
  },
};

// ---------------------------------------------------------------------------
// Metadata — 15%
// ---------------------------------------------------------------------------

const title_unique: CheckDefinition = {
  id: "title_unique",
  category: "metadata",
  label: "Unique page titles",
  run: (data) => {
    const pages = allPages(data);
    const titles = pages.map((p) => extractTitle(p.html));
    const missing = titles.filter((t) => !t).length;
    if (missing > 0) {
      return outcome(
        "fail",
        `${missing} of ${pages.length} fetched pages have no <title> tag.`,
        "Give every page a unique, descriptive <title> tag.",
        "low",
      );
    }
    const unique = new Set(titles);
    if (unique.size === titles.length) {
      return outcome("pass", `All ${pages.length} fetched pages have unique titles.`, "", "low");
    }
    return outcome(
      "partial",
      "Some fetched pages share the same <title>.",
      "Make each page's title unique and specific to its content.",
      "low",
    );
  },
};

const title_length: CheckDefinition = {
  id: "title_length",
  category: "metadata",
  label: "Title length",
  run: (data) => {
    const title = extractTitle(data.homepage.html);
    if (!title) {
      return outcome(
        "fail",
        "Homepage has no <title> tag.",
        "Add a descriptive title tag, 10-60 characters.",
        "low",
      );
    }
    if (title.length >= 10 && title.length <= 60) {
      return outcome("pass", `Title is ${title.length} characters.`, "", "low");
    }
    return outcome(
      "partial",
      `Title is ${title.length} characters — ${title.length < 10 ? "too short" : "may get truncated in search/AI results"}.`,
      "Aim for a 10-60 character title that clearly states who you are and what you offer.",
      "low",
    );
  },
};

const meta_desc: CheckDefinition = {
  id: "meta_desc",
  category: "metadata",
  label: "Meta description",
  run: (data) => {
    const pages = allPages(data);
    const descriptions = pages.map((p) => extractMetaContent(p.html, "description"));
    const present = descriptions.filter((d) => d && d.length > 0);
    if (present.length === 0) {
      return outcome(
        "fail",
        "No meta description found on any fetched page.",
        "Write a unique 50-160 character meta description for every key page.",
        "low",
      );
    }
    const wellSized = present.filter((d) => d!.length >= 50 && d!.length <= 160);
    if (wellSized.length === present.length && present.length === pages.length) {
      return outcome(
        "pass",
        `All ${pages.length} pages have well-sized meta descriptions.`,
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      `${present.length} of ${pages.length} fetched pages have a meta description.`,
      "Add meta descriptions (50-160 characters) to every page missing one.",
      "low",
    );
  },
};

const canonical: CheckDefinition = {
  id: "canonical",
  category: "metadata",
  label: "Canonical tags",
  run: (data) => {
    const pages = allPages(data);
    const withCanonical = pages.filter((p) => extractCanonical(p.html));
    if (withCanonical.length === pages.length) {
      return outcome("pass", `All ${pages.length} fetched pages set a canonical URL.`, "", "low");
    }
    if (withCanonical.length > 0) {
      return outcome(
        "partial",
        `${withCanonical.length} of ${pages.length} fetched pages set a canonical URL.`,
        "Add a self-referencing canonical <link> tag to every page.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No canonical tags found on any fetched page.",
      "Add canonical <link> tags to avoid duplicate-content ambiguity for crawlers.",
      "low",
    );
  },
};

const og_tags: CheckDefinition = {
  id: "og_tags",
  category: "metadata",
  label: "Open Graph tags",
  run: (data) => {
    const html = data.homepage.html;
    const tags = ["og:title", "og:description", "og:image"];
    const present = tags.filter((t) => extractMetaContent(html, t));
    if (present.length === tags.length) {
      return outcome("pass", "og:title, og:description and og:image all present.", "", "low");
    }
    if (present.length > 0) {
      return outcome(
        "partial",
        `Only ${present.join(", ")} present.`,
        "Add the missing Open Graph tags so links preview correctly when shared or cited.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No Open Graph tags found on the homepage.",
      "Add og:title, og:description and og:image meta tags.",
      "low",
    );
  },
};

// ---------------------------------------------------------------------------
// Content — 15%
// ---------------------------------------------------------------------------

const informational_pages: CheckDefinition = {
  id: "informational_pages",
  category: "content",
  label: "Informational pages beyond the homepage",
  run: (data) => {
    const substantial = data.pages.filter((p) => visibleText(p.html).length > 300);
    if (substantial.length >= 2) {
      return outcome(
        "pass",
        `${substantial.length} additional pages have substantial content.`,
        "",
        "low",
      );
    }
    if (substantial.length === 1) {
      return outcome(
        "partial",
        "Only one additional page has substantial content.",
        "Publish more informational pages (services, about, FAQs) with real content, not just the homepage.",
        "med",
      );
    }
    return outcome(
      "fail",
      "No additional pages with substantial content were found.",
      "Build out informational pages beyond the homepage so AI engines have more to cite.",
      "high",
    );
  },
};

const blog_exists: CheckDefinition = {
  id: "blog_exists",
  category: "content",
  label: "Blog / news section",
  run: (data) => {
    const links = allLinks(data);
    const sitemapUrls = data.sitemap
      ? Array.from(data.sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi), (m) => m[1])
      : [];
    const hasBlog =
      links.some((l) => BLOG_PATH_RE.test(l.href)) || sitemapUrls.some((u) => BLOG_PATH_RE.test(u));
    return hasBlog
      ? outcome("pass", "A blog/news section is linked from the site.", "", "low")
      : outcome(
          "fail",
          "No blog or news section detected.",
          "Publish a blog or news section — fresh, citable content is a strong AI-visibility signal.",
          "high",
        );
  },
};

const blog_fresh_90d: CheckDefinition = {
  id: "blog_fresh_90d",
  category: "content",
  label: "Blog freshness (90 days)",
  run: (data) => {
    const sitemapUrls = data.sitemap
      ? Array.from(data.sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi), (m) => m[1])
      : [];
    const hasBlog =
      allLinks(data).some((l) => BLOG_PATH_RE.test(l.href)) ||
      sitemapUrls.some((u) => BLOG_PATH_RE.test(u));
    if (!hasBlog) {
      return outcome(
        "fail",
        "No blog section exists to check for freshness.",
        "Publish a blog and update it regularly — content updated within the last 90 days signals ongoing relevance.",
        "high",
      );
    }
    if (!data.sitemap) {
      return outcome(
        "partial",
        "Blog section exists, but no sitemap is available to verify freshness.",
        "Add sitemap <lastmod> entries for blog posts so freshness can be verified.",
        "low",
      );
    }
    const lastmods = extractSitemapLastmods(data.sitemap.body);
    if (lastmods.length === 0) {
      return outcome(
        "partial",
        "Blog section exists, but sitemap has no <lastmod> dates.",
        "Add <lastmod> dates to sitemap entries for blog posts.",
        "low",
      );
    }
    const freshest = new Date(Math.max(...lastmods.map((d) => d.getTime())));
    const isFresh = Date.now() - freshest.getTime() <= NINETY_DAYS_MS;
    return isFresh
      ? outcome("pass", `Most recent content update: ${freshest.toDateString()}.`, "", "low")
      : outcome(
          "fail",
          `Most recent content update was ${freshest.toDateString()}, over 90 days ago.`,
          "Publish new blog content at least quarterly to stay fresh in AI training and retrieval.",
          "med",
        );
  },
};

const heading_hierarchy: CheckDefinition = {
  id: "heading_hierarchy",
  category: "content",
  label: "Heading hierarchy",
  run: (data) => {
    const levels = extractHeadingLevels(data.homepage.html);
    const h1Count = levels.filter((l) => l === 1).length;
    if (h1Count === 0) {
      return outcome(
        "fail",
        "Homepage has no H1 heading.",
        "Add exactly one H1 that clearly states the page's main topic.",
        "low",
      );
    }
    if (h1Count === 1) {
      return outcome(
        "pass",
        "Homepage has exactly one H1, with supporting subheadings.",
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      `Homepage has ${h1Count} H1 headings.`,
      "Use a single H1 per page and demote the rest to H2/H3.",
      "low",
    );
  },
};

const author_attribution: CheckDefinition = {
  id: "author_attribution",
  category: "content",
  label: "Author attribution",
  run: (data) => {
    const html = allHtml(data);
    const hasRelAuthor = /rel\s*=\s*["']author["']/i.test(html);
    const hasBylineText = /\b(by|written by|author)\s*[:-]?\s*[A-Z][a-z]+/.test(visibleText(html));
    const hasAuthorSchema = jsonLdTypes(extractJsonLdBlocks(html)).some((t) => /^person$/i.test(t));
    if (hasRelAuthor || hasAuthorSchema) {
      return outcome("pass", "Author attribution found via markup or schema.", "", "low");
    }
    if (hasBylineText) {
      return outcome(
        "partial",
        "Byline-like text found, but no rel=author or Person schema.",
        'Mark up author bylines with rel="author" or Person schema for stronger attribution signals.',
        "low",
      );
    }
    return outcome(
      "fail",
      "No author attribution found on fetched pages.",
      "Add author bylines to content pages — E-E-A-T signals matter for AI trust in cited sources.",
      "med",
    );
  },
};

// ---------------------------------------------------------------------------
// Trust — 10%
// ---------------------------------------------------------------------------

const about_page: CheckDefinition = {
  id: "about_page",
  category: "trust",
  label: "About page",
  run: (data) => {
    const found = allLinks(data).find((l) => ABOUT_RE.test(l.href) || ABOUT_RE.test(l.text));
    return found
      ? outcome("pass", `About page linked (${found.href}).`, "", "low")
      : outcome(
          "fail",
          "No About page found.",
          "Publish an About page covering who runs the business, its history and mission.",
          "low",
        );
  },
};

const contact_visible: CheckDefinition = {
  id: "contact_visible",
  category: "trust",
  label: "Contact page visible",
  run: (data) => {
    const found = allLinks(data).find((l) => CONTACT_RE.test(l.href) || CONTACT_RE.test(l.text));
    return found
      ? outcome("pass", `Contact page linked (${found.href}).`, "", "low")
      : outcome(
          "fail",
          "No Contact page found.",
          "Add a clearly linked Contact page with your business address and details.",
          "low",
        );
  },
};

const phone_email_visible: CheckDefinition = {
  id: "phone_email_visible",
  category: "trust",
  label: "Phone / email visible",
  run: (data) => {
    const html = allHtml(data);
    const hasMailto = /href\s*=\s*["']mailto:/i.test(html);
    const hasTel = /href\s*=\s*["']tel:/i.test(html) || phoneMatches(visibleText(html)).length > 0;
    if (hasMailto && hasTel) {
      return outcome("pass", "Both phone and email contact details are visible.", "", "low");
    }
    if (hasMailto || hasTel) {
      return outcome(
        "partial",
        `Only ${hasMailto ? "email" : "phone"} contact details found.`,
        "Show both a phone number and email address so AI engines can surface direct contact info.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No visible phone number or email address found.",
      "Add a visible phone number and email address, ideally in the header or footer of every page.",
      "low",
    );
  },
};

const policies_present: CheckDefinition = {
  id: "policies_present",
  category: "trust",
  label: "Policy pages present",
  run: (data) => {
    const links = allLinks(data);
    const hasPrivacy = links.some((l) => PRIVACY_RE.test(l.href) || PRIVACY_RE.test(l.text));
    const hasTerms = links.some((l) => TERMS_RE.test(l.href) || TERMS_RE.test(l.text));
    if (hasPrivacy && hasTerms) {
      return outcome("pass", "Both privacy policy and terms are linked.", "", "low");
    }
    if (hasPrivacy || hasTerms) {
      return outcome(
        "partial",
        `Only ${hasPrivacy ? "a privacy policy" : "terms"} found.`,
        "Publish and link both a Privacy Policy and Terms of Service.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No privacy policy or terms page found.",
      "Publish a Privacy Policy and Terms of Service — their absence is a trust red flag for AI evaluators.",
      "low",
    );
  },
};

// ---------------------------------------------------------------------------
// India Presence — 15%
// ---------------------------------------------------------------------------

const google_business: CheckDefinition = {
  id: "google_business",
  category: "india_presence",
  label: "Google Business Profile linked",
  run: (data) => {
    const html = allHtml(data);
    const found =
      /maps\.google\.[a-z.]+|goo\.gl\/maps|g\.page\//i.test(html) ||
      /<iframe[^>]+google\.com\/maps/i.test(html);
    return found
      ? outcome("pass", "A Google Maps / Business Profile link or embed was found.", "", "low")
      : outcome(
          "fail",
          "No Google Business Profile link or map embed found.",
          "Claim your Google Business Profile and embed your Maps location or link to it from the site.",
          "low",
        );
  },
};

const directory_presence: CheckDefinition = {
  id: "directory_presence",
  category: "india_presence",
  label: "Indian directory listings",
  run: (data) => {
    const links = allLinks(data);
    const found = links.filter((l) => INDIAN_DIRECTORY_HOSTS.some((host) => l.href.includes(host)));
    if (found.length > 0) {
      return outcome(
        "pass",
        `Linked to: ${Array.from(new Set(found.map((f) => new URL(f.href).hostname))).join(", ")}.`,
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "No links to Indian business directories (Justdial, IndiaMART, Sulekha, TradeIndia) found.",
      "List your business on major Indian directories and link to those listings from your site.",
      "med",
    );
  },
};

const linkedin_page: CheckDefinition = {
  id: "linkedin_page",
  category: "india_presence",
  label: "LinkedIn company page",
  run: (data) => {
    const found = allLinks(data).find((l) => /linkedin\.com\/company\//i.test(l.href));
    return found
      ? outcome("pass", `LinkedIn company page linked (${found.href}).`, "", "low")
      : outcome(
          "fail",
          "No LinkedIn company page linked.",
          "Create a LinkedIn company page and link to it from your site footer.",
          "low",
        );
  },
};

const nap_consistency: CheckDefinition = {
  id: "nap_consistency",
  category: "india_presence",
  label: "NAP (Name/Address/Phone) consistency",
  run: (data) => {
    const pages = allPages(data);
    const phoneCounts = new Map<string, number>();
    for (const page of pages) {
      const matches = new Set(
        phoneMatches(visibleText(page.html)).map((m) => m[0].replace(/\D/g, "")),
      );
      for (const phone of matches) {
        phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
      }
    }
    const repeated = Array.from(phoneCounts.entries()).filter(([, count]) => count >= 2);
    if (repeated.length > 0) {
      return outcome(
        "pass",
        "The same phone number appears consistently across multiple pages.",
        "",
        "low",
      );
    }
    if (phoneCounts.size > 0) {
      return outcome(
        "partial",
        "A phone number was found, but it doesn't repeat consistently across pages.",
        "Display the same business phone number and address consistently across every page.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No consistent phone number found across fetched pages.",
      "Add a consistent Name/Address/Phone block, ideally in the site footer, on every page.",
      "low",
    );
  },
};

const gst_or_legal_identity: CheckDefinition = {
  id: "gst_or_legal_identity",
  category: "india_presence",
  label: "GST / legal identity disclosed",
  run: (data) => {
    const text = visibleText(allHtml(data));
    const hasGst = /\bGSTIN\b|\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]\b/i.test(text);
    const hasLegalEntity = /\b(private limited|pvt\.?\s*ltd|llp|opc)\b/i.test(text);
    if (hasGst) {
      return outcome("pass", "A GSTIN was found on the site.", "", "low");
    }
    if (hasLegalEntity) {
      return outcome(
        "partial",
        "A legal entity name (Pvt Ltd/LLP/OPC) is disclosed, but no GSTIN was found.",
        "Publish your GSTIN, typically in the footer or a legal/about page, to reinforce legitimacy.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No GSTIN or registered legal entity name found.",
      "Disclose your registered legal entity name and GSTIN — this is a strong trust signal for Indian businesses.",
      "low",
    );
  },
};

export const CHECKS: CheckDefinition[] = [
  https,
  robots_exists,
  robots_ai_bots,
  sitemap_exists,
  sitemap_fresh,
  spa_detection,
  pagespeed_mobile,
  jsonld_present,
  org_schema,
  faq_schema,
  localbusiness_or_product,
  breadcrumb,
  title_unique,
  title_length,
  meta_desc,
  canonical,
  og_tags,
  informational_pages,
  blog_exists,
  blog_fresh_90d,
  heading_hierarchy,
  author_attribution,
  about_page,
  contact_visible,
  phone_email_visible,
  policies_present,
  google_business,
  directory_presence,
  linkedin_page,
  nap_consistency,
  gst_or_legal_identity,
];

export function runChecks(data: CrawlData) {
  return CHECKS.map((check) => {
    const result = check.run(data);
    return { id: check.id, category: check.category, ...result };
  });
}
