export interface ScanRequestedEventData {
  leadId: string;
  websiteUrl: string;
  leadName: string;
  businessName: string;
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
