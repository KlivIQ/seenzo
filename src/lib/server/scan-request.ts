import { nanoid } from "nanoid";

import { scanSchema } from "@/lib/scan-schema";
import { getSupabaseServer } from "@/lib/supabase";
import type { LeadInsert } from "@/lib/types/database";

import { hasMxRecords, isDisposableEmail } from "./email-validation";
import { requireEnv } from "./env";
import { sendScanRequested } from "./inngest-send";
import { getEmailRateLimiter, getIpRateLimiter } from "./rate-limit";

const REPORT_SLUG_LENGTH = 14;
const INVALID_EMAIL_MESSAGE = "That email doesn't look right — please check and try again.";

export type ScanRequestInput = {
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
};

export type ScanRequestErrorCode = "validation" | "rate_limited" | "server_error";

export type ScanRequestResult =
  | { success: true; slug: string; reportSlug?: string }
  | { success: false; error: string; code: ScanRequestErrorCode };

async function hasValidEmailDomain(email: string): Promise<boolean> {
  if (isDisposableEmail(email)) return false;

  const domain = email.split("@").pop() ?? "";
  try {
    return await hasMxRecords(domain);
  } catch (error) {
    // A DNS-over-HTTPS hiccup shouldn't block a legitimate signup — treat a
    // failed lookup as inconclusive rather than as a rejection.
    console.error("MX lookup failed", error);
    return true;
  }
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

    if (!(await hasValidEmailDomain(email))) {
      return { success: false, error: INVALID_EMAIL_MESSAGE, code: "validation" };
    }

    const [emailLimit, ipLimit] = await Promise.all([
      getEmailRateLimiter().limit(email.toLowerCase()),
      getIpRateLimiter().limit(clientIp),
    ]);

    if (!emailLimit.success) {
      return {
        success: false,
        error: "A scan for this email was already requested recently. Please try again later.",
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

    const supabase = getSupabaseServer();
    const reportSlug = nanoid(REPORT_SLUG_LENGTH);

    const leadInsert: LeadInsert = {
      name,
      business_name: business,
      email,
      phone,
      website_url: website,
      status: "scanning",
      heat_score: 0,
      report_slug: reportSlug,
    };

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert(leadInsert)
      .select("id")
      .single();

    if (insertError || !lead) {
      throw new Error(`Failed to save lead: ${insertError?.message ?? "unknown error"}`);
    }

    // No retry-by-clicking-a-link fallback anymore, so this must be awaited:
    // a lead the pipeline never hears about would sit at 'scanning' forever.
    try {
      await sendScanRequested({
        leadId: lead.id,
        websiteUrl: website,
        leadName: name,
        businessName: business,
        reportSlug,
      });
    } catch (error) {
      console.error("Failed to send scan/requested event, removing orphaned lead", error);
      await supabase.from("leads").delete().eq("id", lead.id);
      return {
        success: false,
        error: "Something went wrong, please try again",
        code: "server_error",
      };
    }

    return { success: true, slug: reportSlug };
  } catch (error) {
    console.error("scan-request failed", error);
    return { success: false, error: "Something went wrong", code: "server_error" };
  }
}
