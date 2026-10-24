// Types for the internal outreach tool. Kept out of database.ts so the generated/hand-synced
// Seenzo schema types stay untouched; server code uses a loosely typed client for these tables.

export type OutreachProduct = "seenzo" | "tryon" | "connect" | "consulting";
export type OutreachChannel = "email" | "linkedin" | "whatsapp" | "instagram";
export type OutreachStatus =
  "new" | "drafted" | "sent" | "replied" | "booked" | "won" | "lost" | "do_not_contact";
export type OutreachMessageStatus = "draft" | "sending" | "sent" | "skipped";

export const OUTREACH_PRODUCTS: OutreachProduct[] = ["seenzo", "tryon", "connect", "consulting"];
export const OUTREACH_CHANNELS: OutreachChannel[] = ["email", "linkedin", "whatsapp", "instagram"];
export const OUTREACH_STATUSES: OutreachStatus[] = [
  "new",
  "drafted",
  "sent",
  "replied",
  "booked",
  "won",
  "lost",
  "do_not_contact",
];

export interface OutreachProspect {
  id: string;
  created_at: string;
  business_name: string;
  website_url: string | null;
  website_host: string | null;
  city: string | null;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  instagram_handle: string | null;
  source: string;
  product: OutreachProduct;
  seenzo_score: number | null;
  status: OutreachStatus;
  notes: string | null;
  followup_step: number;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  last_reply_at: string | null;
  last_reply_snippet: string | null;
  last_reply_kind: "reply" | "opt_out" | "bounce" | "auto_reply" | null;
}

export interface OutreachMessage {
  id: string;
  prospect_id: string;
  created_at: string;
  channel: OutreachChannel;
  step: number;
  product: string;
  subject: string | null;
  body: string;
  status: OutreachMessageStatus;
  sent_at: string | null;
  sent_via: "manual" | "hostinger" | null;
  sent_uid: number | null;
  sent_folder: string | null;
  sending_started_at: string | null;
  error: string | null;
}

export interface ProspectImportRow {
  business_name: string;
  website_url?: string;
  city?: string;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  source_type?: string;
  score?: string;
}

export interface OutreachMetrics {
  total: number;
  toSend: number;
  sent: number;
  replied: number;
  followupsDue: number;
}

export interface OutreachDashboard {
  prospects: OutreachProspect[];
  messages: OutreachMessage[];
  metrics: OutreachMetrics;
  adminEmail: string;
  sending: OutreachSendingInfo;
}

export interface OutreachSendingInfo {
  enabled: boolean;
  from: string | null;
  dailyCap: number;
  sentToday: number;
}

export interface ImportResult {
  added: number;
  skippedDuplicate: number;
  skippedOptedOut: number;
  skippedInvalid: number;
}
