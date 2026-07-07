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

async function fetchText(url: string): Promise<RawFetch | null> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
export async function fetchPages(requestedUrl: string): Promise<CrawlData> {
  const origin = new URL(requestedUrl).origin;

  const [homepageResult, robotsResult, sitemapResult] = await Promise.all([
    fetchText(requestedUrl),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
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
      if (candidateUrls.length >= MAX_INTERNAL_PAGES) break;
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
  if (candidateUrls.length < MAX_INTERNAL_PAGES) {
    for (const url of sameOriginInternalLinks(homepage.html, requestedUrl, origin, requestedUrl)) {
      if (candidateUrls.length >= MAX_INTERNAL_PAGES) break;
      if (!candidateUrls.includes(url)) candidateUrls.push(url);
    }
  }

  const fetchedPages = await Promise.all(
    candidateUrls.slice(0, MAX_INTERNAL_PAGES).map(async (url): Promise<FetchedPage | null> => {
      const result = await fetchText(url);
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
