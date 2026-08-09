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

// Plain-English names for the crawler evidence strings — customers know
// "ChatGPT" and "Claude", not "GPTBot" or "ClaudeBot".
const AI_BOT_FRIENDLY_NAMES: Record<string, string> = {
  gptbot: "ChatGPT",
  "chatgpt-user": "ChatGPT",
  "oai-searchbot": "ChatGPT search",
  "google-extended": "Google AI",
  perplexitybot: "Perplexity",
  "anthropic-ai": "Claude",
  claudebot: "Claude",
  "claude-web": "Claude",
  ccbot: "the AI models trained on Common Crawl",
  "applebot-extended": "Apple Intelligence",
};

function friendlyBotNames(agents: string[]): string[] {
  return Array.from(new Set(agents.map((a) => AI_BOT_FRIENDLY_NAMES[a] ?? a)));
}

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
      ? outcome(
          "pass",
          "Your site loads securely — AI crawlers won't flag it as unsafe.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "Your site isn't secured — AI engines deprioritize or skip unsecured sites entirely.",
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
      return outcome(
        "pass",
        "Your site tells AI crawlers exactly which pages they're allowed to read.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your site gives AI crawlers no instructions at all, so some skip it entirely to be safe.",
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
        "Nothing on your site is blocking AI crawlers from reading it.",
        "",
        "low",
      );
    }
    const parsed = parseRobotsTxt(data.robots.body);
    const blocked: string[] = [];
    const restricted: string[] = [];
    let blocksAll = false;

    for (const group of parsed.groups) {
      const targetsAiBot = group.agents.some((a) => a === "*" || AI_BOT_AGENTS.includes(a));
      if (!targetsAiBot) continue;
      const fullyBlocked = group.disallow.some((d) => d === "/");
      if (fullyBlocked) {
        if (group.agents.includes("*")) {
          blocksAll = true;
        } else {
          blocked.push(...group.agents.filter((a) => AI_BOT_AGENTS.includes(a)));
        }
      } else if (group.disallow.length > 0) {
        restricted.push(...group.agents.filter((a) => AI_BOT_AGENTS.includes(a)));
      }
    }

    if (blocksAll) {
      return outcome(
        "fail",
        "AI crawlers are blocked from your site — ChatGPT, Claude and Perplexity cannot read a single page.",
        "Remove the Disallow: / rule for AI crawler user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) so your pages can be read and cited.",
        "low",
      );
    }
    if (blocked.length > 0) {
      const names = friendlyBotNames(blocked).join(", ");
      return outcome(
        "fail",
        `AI crawlers are blocked from your site — ${names} cannot read a single page.`,
        "Remove the Disallow: / rule for AI crawler user-agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) so your pages can be read and cited.",
        "low",
      );
    }
    if (restricted.length > 0) {
      const names = friendlyBotNames(restricted).join(", ");
      return outcome(
        "partial",
        `${names} can reach parts of your site, but some pages are off-limits — they may miss content that would help them recommend you.`,
        "Review the Disallow paths for AI crawler user-agents to make sure your key content pages aren't excluded.",
        "low",
      );
    }
    return outcome(
      "pass",
      "Every major AI crawler — ChatGPT, Claude, Perplexity — is free to read your site.",
      "",
      "low",
    );
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
      return outcome(
        "pass",
        "AI crawlers have a map of every page on your site, so nothing gets missed.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "There's no map of your site for AI crawlers to follow, so they may miss pages that could get you recommended.",
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
        "There's no map of your site, so AI crawlers have no way to tell how fresh your content is.",
        "Publish an XML sitemap with <lastmod> dates so crawlers know what changed recently.",
        "low",
      );
    }
    const lastmods = extractSitemapLastmods(data.sitemap.body);
    if (lastmods.length === 0) {
      return outcome(
        "partial",
        "Your site map exists, but doesn't show when pages were last updated — AI crawlers can't tell if your content is current.",
        "Add <lastmod> timestamps to sitemap entries so AI crawlers can prioritize fresh content.",
        "low",
      );
    }
    const freshest = new Date(Math.max(...lastmods.map((d) => d.getTime())));
    const isFresh = Date.now() - freshest.getTime() <= NINETY_DAYS_MS;
    return isFresh
      ? outcome(
          "pass",
          `Your site map shows recent activity (updated ${freshest.toDateString()}), telling AI crawlers your content is current.`,
          "",
          "low",
        )
      : outcome(
          "fail",
          `Your site hasn't shown any updates since ${freshest.toDateString()} — over 90 days — so AI engines treat it as lower priority to cite.`,
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
        "AI crawlers can read your homepage content right away, before any scripts even run.",
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
      return outcome(
        "pass",
        "Your site loads quickly on mobile, which AI crawlers and customers both notice.",
        "",
        "low",
      );
    }
    if (ms <= 3500 && kb <= 1500) {
      return outcome(
        "partial",
        "Your site loads a bit slowly on mobile — this can cause AI crawlers to give up before reading everything.",
        "Compress images, defer non-critical scripts, and trim page weight to speed up mobile loads.",
        "med",
      );
    }
    return outcome(
      "fail",
      "Your site is slow to load on mobile — AI crawlers and customers may give up before your page finishes loading.",
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
        "Your site gives AI engines clear, structured facts about your business — not just paragraphs to guess from.",
        "",
        "low",
      );
    }
    const hasTag = /<script[^>]+application\/ld\+json/i.test(data.homepage.html);
    if (hasTag) {
      return outcome(
        "partial",
        "Your site attempts to give AI engines structured facts about your business, but the format is broken and unreadable.",
        "Fix the JSON syntax in your structured data block — validate with Google's Rich Results Test.",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your site gives AI engines nothing but plain text to interpret — they have to guess who you are and what you do.",
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
      return outcome(
        "pass",
        "AI engines can confirm your business's official name and details directly.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "AI engines have no confirmed source for your business's official name, logo, or contact details.",
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
      return outcome(
        "pass",
        "Your site is set up to have your answers quoted directly inside AI chat responses.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "Nothing on your site is set up to get quoted directly inside ChatGPT or Perplexity answers.",
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
      return outcome(
        "pass",
        "AI engines can confirm what your business does and where it operates.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "AI engines can't confirm what your business does or where it operates.",
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
      return outcome(
        "pass",
        "AI engines can see exactly where each page sits within your site.",
        "",
        "low",
      );
    }
    const hasBreadcrumbNav = /aria-label\s*=\s*["']breadcrumb["']/i.test(allHtml(data));
    if (hasBreadcrumbNav) {
      return outcome(
        "partial",
        "Your site shows visitors where they are, but AI engines can't read that structure the same way.",
        "Add BreadcrumbList JSON-LD alongside your visual breadcrumbs.",
        "low",
      );
    }
    return outcome(
      "fail",
      "AI engines can't tell how your pages relate to each other or where anything sits on your site.",
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
        `${missing} of ${pages.length} pages on your site have no title at all — AI engines don't know what those pages are about.`,
        "Give every page a unique, descriptive <title> tag.",
        "low",
      );
    }
    const unique = new Set(titles);
    if (unique.size === titles.length) {
      return outcome(
        "pass",
        "Every page on your site has its own clear title, so AI engines know exactly what each one covers.",
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      "AI can't tell your pages apart, so it cites none of them.",
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
        "Your homepage has no title — AI engines and search results don't know what to call your business.",
        "Add a descriptive title tag, 10-60 characters.",
        "low",
      );
    }
    if (title.length >= 10 && title.length <= 60) {
      return outcome(
        "pass",
        "Your homepage title clearly and concisely says what your business does.",
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      title.length < 10
        ? "Your homepage title is too short to say much about your business."
        : "Your homepage title is long enough that AI engines and search results may cut it off.",
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
        "None of your pages describe themselves to AI engines — they have to guess what each page is about.",
        "Write a unique 50-160 character meta description for every key page.",
        "low",
      );
    }
    const wellSized = present.filter((d) => d!.length >= 50 && d!.length <= 160);
    if (wellSized.length === present.length && present.length === pages.length) {
      return outcome(
        "pass",
        "Every page describes itself clearly, so AI engines know what each one is about before they even open it.",
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      "Only some of your pages describe themselves to AI engines — the rest are guesswork.",
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
      return outcome(
        "pass",
        "Every page clearly tells AI engines which version is the real one, avoiding duplicate confusion.",
        "",
        "low",
      );
    }
    if (withCanonical.length > 0) {
      return outcome(
        "partial",
        "Some of your pages don't say which version is the real one, so AI engines may get confused about duplicates.",
        "Add a self-referencing canonical <link> tag to every page.",
        "low",
      );
    }
    return outcome(
      "fail",
      "AI engines can't tell which version of your pages is the real one, so they may ignore or mix up your content.",
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
      return outcome(
        "pass",
        "Your pages show a proper preview with title, description and image whenever they're shared or referenced.",
        "",
        "low",
      );
    }
    if (present.length > 0) {
      return outcome(
        "partial",
        "Some of your pages show a broken or incomplete preview when shared or referenced.",
        "Add the missing Open Graph tags so links preview correctly when shared or cited.",
        "low",
      );
    }
    return outcome(
      "fail",
      "When your pages are shared or referenced, they show up blank or broken instead of a proper preview.",
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
        "Your site gives AI engines real, substantial content beyond just the homepage to learn from.",
        "",
        "low",
      );
    }
    if (substantial.length === 1) {
      return outcome(
        "partial",
        "Your site has barely anything beyond the homepage — AI engines have very little to learn from or cite.",
        "Publish more informational pages (services, about, FAQs) with real content, not just the homepage.",
        "med",
      );
    }
    return outcome(
      "fail",
      "Your site has almost nothing beyond the homepage for AI engines to learn from or cite.",
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
      ? outcome(
          "pass",
          "Your site regularly publishes content that answers the questions customers actually ask AI.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "Nothing on your site answers the questions customers actually ask AI.",
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
        "Nothing on your site answers the questions customers actually ask AI.",
        "Publish a blog and update it regularly — content updated within the last 90 days signals ongoing relevance.",
        "high",
      );
    }
    if (!data.sitemap) {
      return outcome(
        "partial",
        "Your site publishes content, but there's no way to tell AI engines how recently it was updated.",
        "Add sitemap <lastmod> entries for blog posts so freshness can be verified.",
        "low",
      );
    }
    const lastmods = extractSitemapLastmods(data.sitemap.body);
    if (lastmods.length === 0) {
      return outcome(
        "partial",
        "Your site publishes content, but there's no way to tell AI engines how recently it was updated.",
        "Add <lastmod> dates to sitemap entries for blog posts.",
        "low",
      );
    }
    const freshest = new Date(Math.max(...lastmods.map((d) => d.getTime())));
    const isFresh = Date.now() - freshest.getTime() <= NINETY_DAYS_MS;
    return isFresh
      ? outcome(
          "pass",
          `Your content is updated regularly (most recently ${freshest.toDateString()}), signalling to AI engines that your business is active.`,
          "",
          "low",
        )
      : outcome(
          "fail",
          `Your content hasn't been updated since ${freshest.toDateString()} — over 90 days — which AI engines can read as a sign your business may be inactive.`,
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
        "Your homepage doesn't clearly state what it's about at a glance — AI engines have to work harder to figure it out.",
        "Add exactly one H1 that clearly states the page's main topic.",
        "low",
      );
    }
    if (h1Count === 1) {
      return outcome(
        "pass",
        "Your homepage clearly states its main topic, with everything else organized underneath it.",
        "",
        "low",
      );
    }
    return outcome(
      "partial",
      "Your homepage states several competing topics at once, so AI engines can't tell which one matters most.",
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
      return outcome(
        "pass",
        "Your content is clearly credited to a real person, which AI engines weigh when judging trustworthiness.",
        "",
        "low",
      );
    }
    if (hasBylineText) {
      return outcome(
        "partial",
        "Your content mentions an author by name, but nothing formally confirms who wrote it.",
        'Mark up author bylines with rel="author" or Person schema for stronger attribution signals.',
        "low",
      );
    }
    return outcome(
      "fail",
      "None of your content is credited to a real person — AI engines have less reason to trust it as an authoritative source.",
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
      ? outcome(
          "pass",
          "Visitors and AI engines can find a clear page explaining who runs your business and its story.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "No credible source on your site says who runs this business.",
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
      ? outcome(
          "pass",
          "Anyone — customer or AI engine — can easily find how to get in touch with your business.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "There's no clear way for customers or AI engines to find out how to reach your business.",
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
      return outcome(
        "pass",
        "Both a phone number and email are visible, so AI engines can confidently point customers to reach you.",
        "",
        "low",
      );
    }
    if (hasMailto || hasTel) {
      return outcome(
        "partial",
        `Only ${hasMailto ? "an email address" : "a phone number"} is visible on your site, so AI engines have limited contact info to surface.`,
        "Show both a phone number and email address so AI engines can surface direct contact info.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No phone number or email is visible anywhere on your site, so AI engines can't surface a way to reach you.",
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
      return outcome(
        "pass",
        "Your site publishes both a privacy policy and terms of service, reinforcing that this is a legitimate business.",
        "",
        "low",
      );
    }
    if (hasPrivacy || hasTerms) {
      return outcome(
        "partial",
        `Your site only publishes ${hasPrivacy ? "a privacy policy" : "terms of service"} — the missing one is a trust gap for AI engines.`,
        "Publish and link both a Privacy Policy and Terms of Service.",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your site has no privacy policy or terms — their absence is a red flag for AI engines evaluating trustworthiness.",
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
      ? outcome(
          "pass",
          "AI engines can cross-check that your business is real and locally verified through your Google listing.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "AI can't cross-check that your business is real and locally verified.",
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
        "Your business is listed on major Indian directories, giving AI engines more places to confirm you're real.",
        "",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your business isn't listed on any major Indian business directories, so AI engines have fewer places to confirm you're real.",
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
      ? outcome(
          "pass",
          "Your business has a LinkedIn presence AI engines can use to confirm it's a real company.",
          "",
          "low",
        )
      : outcome(
          "fail",
          "Your business has no LinkedIn presence, so AI engines have one less place to confirm it's a real company.",
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
        "The same contact number appears consistently across your site, giving AI engines a reliable detail to trust.",
        "",
        "low",
      );
    }
    if (phoneCounts.size > 0) {
      return outcome(
        "partial",
        "A contact number appears on your site, but not consistently — AI engines may not trust which one is current.",
        "Display the same business phone number and address consistently across every page.",
        "low",
      );
    }
    return outcome(
      "fail",
      "No consistent contact number appears across your site, so AI engines can't confirm a single reliable way to reach you.",
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
      return outcome(
        "pass",
        "Your business's tax registration is disclosed, a strong trust signal for AI engines evaluating Indian businesses.",
        "",
        "low",
      );
    }
    if (hasLegalEntity) {
      return outcome(
        "partial",
        "Your business names its legal entity, but doesn't disclose its tax registration — a trust signal AI engines look for.",
        "Publish your GSTIN, typically in the footer or a legal/about page, to reinforce legitimacy.",
        "low",
      );
    }
    return outcome(
      "fail",
      "Your business's legal registration isn't disclosed anywhere, which weakens trust signals for AI engines evaluating Indian businesses.",
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
