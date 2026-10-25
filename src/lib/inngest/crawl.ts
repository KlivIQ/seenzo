import { extractLinks, extractSitemapUrls } from "@/lib/scoring/html";
import type { CrawlData, FetchedPage, RawResource } from "@/lib/scoring/types";

const FETCH_TIMEOUT_MS = 8000;
const MAX_INTERNAL_PAGES = 5;
const USER_AGENT = "SeenzoBot/1.0 (+https://seenzo.in)";
const SKIP_EXTENSION_RE = /\.(pdf|jpe?g|png|gif|svg|webp|zip|css|js|mp4|ico)$/i;

interface RawFetch {
  status: number;
  body: string;
  headers: Record<string, string>;
  ms: number;
}

export interface CrawlOptions {
  /** Per-request timeout. Default 8000. */
  timeoutMs?: number;
  /** Internal pages to crawl besides the homepage. Default 5. */
  maxPages?: number;
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<RawFetch | null> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT },
    });
    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { status: res.status, body, headers, ms: Date.now() - start };
  } catch {
    return null;
  }
}

function sameOriginInternalLinks(
  html: string,
  baseUrl: string,
  origin: string,
  exclude: string,
): string[] {
  const urls = new Set<string>();
  for (const link of extractLinks(html, baseUrl)) {
    try {
      const resolved = new URL(link.href);
      if (
        resolved.origin === origin &&
        resolved.toString() !== exclude &&
        !SKIP_EXTENSION_RE.test(resolved.pathname)
      ) {
        urls.add(resolved.toString());
      }
    } catch {
      // Malformed href — skip.
    }
  }
  return Array.from(urls);
}

/**
 * Fetches robots.txt, sitemap.xml and the homepage, then crawls up to 5
 * additional internal pages (preferring sitemap URLs, falling back to
 * homepage links). Native `fetch` only — edge-safe, no Node APIs.
 */
export async function fetchPages(
  requestedUrl: string,
  opts: CrawlOptions = {},
): Promise<CrawlData> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxPages = opts.maxPages ?? MAX_INTERNAL_PAGES;
  const origin = new URL(requestedUrl).origin;

  const [homepageResult, robotsResult, sitemapResult] = await Promise.all([
    fetchText(requestedUrl, timeoutMs),
    fetchText(`${origin}/robots.txt`, timeoutMs),
    fetchText(`${origin}/sitemap.xml`, timeoutMs),
  ]);

  if (!homepageResult) {
    throw new Error(`Failed to fetch homepage: ${requestedUrl}`);
  }

  const homepage: FetchedPage = {
    url: requestedUrl,
    status: homepageResult.status,
    html: homepageResult.body,
    headers: homepageResult.headers,
    fetchMs: homepageResult.ms,
  };

  const robots: RawResource | null = robotsResult
    ? { status: robotsResult.status, body: robotsResult.body }
    : null;
  const sitemap: RawResource | null = sitemapResult
    ? { status: sitemapResult.status, body: sitemapResult.body }
    : null;

  const candidateUrls: string[] = [];
  if (sitemap && sitemap.status === 200) {
    for (const loc of extractSitemapUrls(sitemap.body)) {
      if (candidateUrls.length >= maxPages) break;
      try {
        const resolved = new URL(loc, origin);
        if (resolved.origin === origin && resolved.toString() !== requestedUrl) {
          candidateUrls.push(resolved.toString());
        }
      } catch {
        // Malformed sitemap entry — skip.
      }
    }
  }
  if (candidateUrls.length < maxPages) {
    for (const url of sameOriginInternalLinks(homepage.html, requestedUrl, origin, requestedUrl)) {
      if (candidateUrls.length >= maxPages) break;
      if (!candidateUrls.includes(url)) candidateUrls.push(url);
    }
  }

  const fetchedPages = await Promise.all(
    candidateUrls.slice(0, maxPages).map(async (url): Promise<FetchedPage | null> => {
      const result = await fetchText(url, timeoutMs);
      if (!result) return null;
      return {
        url,
        status: result.status,
        html: result.body,
        headers: result.headers,
        fetchMs: result.ms,
      };
    }),
  );

  const pages = fetchedPages.filter((p): p is FetchedPage => p !== null && p.status < 400);

  return { requestedUrl, homepage, pages, robots, sitemap };
}
