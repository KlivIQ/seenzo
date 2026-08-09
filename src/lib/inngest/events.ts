export interface ScanRequestedEventData {
  leadId: string;
  websiteUrl: string;
  leadName: string;
  businessName: string;
  // Optional for back-compat with the admin rerun path (src/lib/server/admin.ts),
  // which doesn't yet look up the lead's existing slug. scan.ts falls back to
  // generating a fresh one when absent.
  reportSlug?: string;
}

export interface ReportReadyEventData {
  leadId: string;
  scanId: string;
  reportSlug: string;
}

export interface FollowupStartEventData {
  leadId: string;
  slug: string;
}
