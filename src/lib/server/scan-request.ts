import { nanoid } from "nanoid";

import { scanSchema } from "@/lib/scan-schema";
import { getSupabaseServer } from "@/lib/supabase";

import { requireEnv } from "./env";
import { escapeHtml } from "./html-escape";
import { getEmailRateLimiter, getIpRateLimiter } from "./rate-limit";
import { getResend } from "./resend";

const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
const SENDER_EMAIL = "reports@seenzo.in";

export type ScanRequestInput = {
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
};

export type ScanRequestErrorCode = "validation" | "rate_limited" | "server_error";

export type ScanRequestResult =
  | { success: true; message: string; reportSlug?: string }
  | { success: false; error: string; code: ScanRequestErrorCode };

// SHA-256 via Web Crypto (globalThis.crypto.subtle) — edge-compatible, no Node `crypto` import.
async function hashWebsiteUrl(url: string): Promise<string> {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function findCachedReportSlug(websiteUrl: string): Promise<string | null> {
  const supabase = getSupabaseServer();
  const urlHash = await hashWebsiteUrl(websiteUrl);

  const { data: cached } = await supabase
    .from("url_cache")
    .select("scan_id, expires_at")
    .eq("url_hash", urlHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!cached) return null;

  const { data: scan } = await supabase
    .from("scans")
    .select("report_slug")
    .eq("id", cached.scan_id)
    .maybeSingle();

  return scan?.report_slug ?? null;
}

// A lead stuck as 'unverified' with an expired token is dead weight — the
// original verify link can never succeed. Clear it so the email can submit
// fresh rather than being blocked by the 1-scan-per-30-days email limiter.
async function clearStaleUnverifiedLead(email: string): Promise<boolean> {
  const supabase = getSupabaseServer();
  const { data: stale } = await supabase
    .from("leads")
    .select("id")
    .ilike("email", email)
    .eq("status", "unverified")
    .lt("verify_expires", new Date().toISOString())
    .maybeSingle();

  if (!stale) return false;

  const { error } = await supabase.from("leads").delete().eq("id", stale.id);
  if (error) throw new Error(`Failed to clear stale lead: ${error.message}`);
  return true;
}

async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const resend = getResend();
  const verifyUrl = `https://www.seenzo.in/verify?token=${token}`;

  const { error } = await resend.emails.send({
    from: SENDER_EMAIL,
    to,
    subject: "Confirm your Seenzo scan",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for requesting a free Seenzo AI Visibility scan. Please confirm your email to start the scan:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#10B981;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Confirm my scan
          </a>
        </p>
        <p>Or paste this link into your browser:<br />${verifyUrl}</p>
        <p>This link expires in 48 hours.</p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function handleScanRequest(
  input: ScanRequestInput,
  clientIp: string,
): Promise<ScanRequestResult> {
  try {
    // Fail fast on missing config rather than partially processing the request.
    requireEnv("SUPABASE_URL");

    const parsed = scanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please check your details and try again.",
        code: "validation",
      };
    }
    const { name, business, email, phone, website } = parsed.data;

    // A stale unverified lead means the email limiter's prior "success" is
    // meaningless (that request can never complete) — bypass it for this
    // submission only. The IP limiter still applies.
    const staleLeadCleared = await clearStaleUnverifiedLead(email);

    const [emailLimit, ipLimit] = await Promise.all([
      staleLeadCleared
        ? Promise.resolve({ success: true } as const)
        : getEmailRateLimiter().limit(email.toLowerCase()),
      getIpRateLimiter().limit(clientIp),
    ]);

    if (!emailLimit.success) {
      return {
        success: false,
        error: "A scan for this email was already requested recently. Check your inbox.",
        code: "rate_limited",
      };
    }
    if (!ipLimit.success) {
      return {
        success: false,
        error: "Too many scan requests from this network today. Please try again tomorrow.",
        code: "rate_limited",
      };
    }

    const cachedSlug = await findCachedReportSlug(website);

    const supabase = getSupabaseServer();
    const token = nanoid();
    const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();

    const { error: insertError } = await supabase.from("leads").insert({
      name,
      business_name: business,
      email,
      phone,
      website_url: website,
      status: "unverified",
      heat_score: 0,
      verify_token: token,
      verify_expires: verifyExpires,
    });

    if (insertError) throw new Error(`Failed to save lead: ${insertError.message}`);

    if (cachedSlug) {
      return {
        success: true,
        message: "We already have a recent scan for this website.",
        reportSlug: cachedSlug,
      };
    }

    await sendVerificationEmail(email, name, token);

    return { success: true, message: "Check your email to confirm your scan" };
  } catch (error) {
    console.error("scan-request failed", error);
    return { success: false, error: "Something went wrong", code: "server_error" };
  }
}
