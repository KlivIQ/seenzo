import disposableDomains from "disposable-email-domains/index.json";
import disposableWildcards from "disposable-email-domains/wildcard.json";

const DISPOSABLE_SET = new Set(disposableDomains.map((d) => d.toLowerCase()));
const DISPOSABLE_WILDCARDS = disposableWildcards.map((d) => d.toLowerCase());

function domainOf(email: string): string {
  return email.trim().toLowerCase().split("@").pop() ?? "";
}

export function isDisposableEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  if (DISPOSABLE_SET.has(domain)) return true;
  return DISPOSABLE_WILDCARDS.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

interface DnsAnswer {
  type: number;
  data: string;
}

interface DnsResponse {
  Status: number;
  Answer?: DnsAnswer[];
}

const MX_RECORD_TYPE = 15;

/** DNS-over-HTTPS MX lookup — edge-compatible, no Node `dns` module. */
export async function hasMxRecords(domain: string): Promise<boolean> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
  const response = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!response.ok) throw new Error(`DNS-over-HTTPS lookup failed: ${response.status}`);

  const result = (await response.json()) as DnsResponse;
  return (result.Answer ?? []).some((answer) => answer.type === MX_RECORD_TYPE);
}
