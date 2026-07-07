import type { ScanCheckEffort, ScanCheckResult } from "@/lib/types/database";

export interface FetchedPage {
  url: string;
  status: number;
  html: string;
  headers: Record<string, string>;
  fetchMs: number;
}

export interface RawResource {
  status: number;
  body: string;
}

/** Everything the check registry needs to evaluate a single scanned site. */
export interface CrawlData {
  requestedUrl: string;
  homepage: FetchedPage;
  /** Up to 5 additional internal pages, excludes the homepage. */
  pages: FetchedPage[];
  robots: RawResource | null;
  sitemap: RawResource | null;
}

export interface CheckOutcome {
  result: ScanCheckResult;
  evidence: string;
  fix_text: string;
  effort: ScanCheckEffort;
}

export interface CheckDefinition {
  id: string;
  category: string;
  label: string;
  run: (data: CrawlData) => CheckOutcome;
}

export interface CheckRunResult extends CheckOutcome {
  id: string;
  category: string;
}
