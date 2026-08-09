// Hand-written to match the Supabase schema already applied to the project.
// Keep in sync with the actual migrations — regenerate/adjust when the schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LeadStatus =
  // "unverified"/"verified" are kept for backward compatibility with rows
  // created before email verification was removed — no longer written.
  | "unverified"
  | "verified"
  | "scanning"
  | "scanned"
  | "contacted"
  | "consult_booked"
  | "won"
  | "lost"
  | "opted_out";

export type ScanStatus = "queued" | "fetching" | "checking" | "scoring" | "complete" | "failed";

export type ScanGrade = "A" | "B" | "C" | "D" | "F";

export type ScanCheckResult = "pass" | "partial" | "fail";

export type ScanCheckEffort = "low" | "med" | "high";

export type ActivityType =
  | "scan_requested"
  | "email_verified"
  | "scan_started"
  | "scan_completed"
  | "scan_failed"
  | "report_viewed"
  | "report_view"
  | "email_sent"
  | "whatsapp_sent"
  | "wa_sent"
  | "wa_skipped_no_phone"
  | "cta_consult_clicked"
  | "cta_whatsapp_clicked"
  | "sequence_complete"
  | "status_changed"
  | "note_added";

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          business_name: string;
          phone: string;
          email: string;
          website_url: string;
          city: string | null;
          industry: string | null;
          status: LeadStatus;
          heat_score: number;
          consent_at: string | null;
          consent_ip: string | null;
          verify_token: string | null;
          verify_expires: string | null;
          report_slug: string | null;
          utm: Json | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          business_name: string;
          phone: string;
          email: string;
          website_url: string;
          city?: string | null;
          industry?: string | null;
          status?: LeadStatus;
          heat_score?: number;
          consent_at?: string | null;
          consent_ip?: string | null;
          verify_token?: string | null;
          verify_expires?: string | null;
          report_slug?: string | null;
          utm?: Json | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          business_name?: string;
          phone?: string;
          email?: string;
          website_url?: string;
          city?: string | null;
          industry?: string | null;
          status?: LeadStatus;
          heat_score?: number;
          consent_at?: string | null;
          consent_ip?: string | null;
          verify_token?: string | null;
          verify_expires?: string | null;
          report_slug?: string | null;
          utm?: Json | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          id: string;
          lead_id: string;
          created_at: string;
          completed_at: string | null;
          url: string;
          status: ScanStatus;
          score: number | null;
          grade: ScanGrade | null;
          scoring_version: string;
          category_scores: Json | null;
          is_spa: boolean | null;
          pages_crawled: number | null;
          report_slug: string;
          pdf_path: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          created_at?: string;
          completed_at?: string | null;
          url: string;
          status?: ScanStatus;
          score?: number | null;
          grade?: ScanGrade | null;
          scoring_version: string;
          category_scores?: Json | null;
          is_spa?: boolean | null;
          pages_crawled?: number | null;
          report_slug: string;
          pdf_path?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          created_at?: string;
          completed_at?: string | null;
          url?: string;
          status?: ScanStatus;
          score?: number | null;
          grade?: ScanGrade | null;
          scoring_version?: string;
          category_scores?: Json | null;
          is_spa?: boolean | null;
          pages_crawled?: number | null;
          report_slug?: string;
          pdf_path?: string | null;
        };
        Relationships: [];
      };
      scan_checks: {
        Row: {
          id: string;
          scan_id: string;
          check_id: string;
          category: string;
          result: ScanCheckResult;
          evidence: string | null;
          fix_text: string | null;
          effort: ScanCheckEffort | null;
        };
        Insert: {
          id?: string;
          scan_id: string;
          check_id: string;
          category: string;
          result: ScanCheckResult;
          evidence?: string | null;
          fix_text?: string | null;
          effort?: ScanCheckEffort | null;
        };
        Update: {
          id?: string;
          scan_id?: string;
          check_id?: string;
          category?: string;
          result?: ScanCheckResult;
          evidence?: string | null;
          fix_text?: string | null;
          effort?: ScanCheckEffort | null;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          lead_id: string;
          at: string;
          type: ActivityType;
          payload: Json | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          at?: string;
          type: ActivityType;
          payload?: Json | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          at?: string;
          type?: ActivityType;
          payload?: Json | null;
        };
        Relationships: [];
      };
      url_cache: {
        Row: {
          url_hash: string;
          scan_id: string;
          expires_at: string;
        };
        Insert: {
          url_hash: string;
          scan_id: string;
          expires_at: string;
        };
        Update: {
          url_hash?: string;
          scan_id?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Scan = Database["public"]["Tables"]["scans"]["Row"];
export type ScanInsert = Database["public"]["Tables"]["scans"]["Insert"];
export type ScanUpdate = Database["public"]["Tables"]["scans"]["Update"];

export type ScanCheck = Database["public"]["Tables"]["scan_checks"]["Row"];
export type ScanCheckInsert = Database["public"]["Tables"]["scan_checks"]["Insert"];
export type ScanCheckUpdate = Database["public"]["Tables"]["scan_checks"]["Update"];

export type ActivityLogEntry = Database["public"]["Tables"]["activity_log"]["Row"];
export type ActivityLogInsert = Database["public"]["Tables"]["activity_log"]["Insert"];

export type UrlCache = Database["public"]["Tables"]["url_cache"]["Row"];
export type UrlCacheInsert = Database["public"]["Tables"]["url_cache"]["Insert"];
