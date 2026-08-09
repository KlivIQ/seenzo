import type { ScanRequestedEventData } from "@/lib/inngest/events";

// Sends via a direct HTTP POST to Inngest's Event API rather than the SDK's
// send(), because the Vercel-Inngest integration auto-injects its own
// branch-routing-scoped INNGEST_EVENT_KEY at deploy time, overriding any
// manually set value and causing the SDK client (src/lib/inngest/client.ts)
// to send against a nonexistent branch environment. INNGEST_SEND_KEY is a
// separate, manually managed key the integration doesn't touch.
// INNGEST_EVENT_KEY is kept as a fallback only for local dev where
// INNGEST_SEND_KEY may not be set.
export async function sendScanRequested(eventData: ScanRequestedEventData): Promise<void> {
  const eventKey = process.env.INNGEST_SEND_KEY || process.env.INNGEST_EVENT_KEY;
  if (!eventKey) throw new Error("Missing INNGEST_SEND_KEY/INNGEST_EVENT_KEY");

  const response = await fetch(`https://inn.gs/e/${eventKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "scan/requested", data: eventData }),
  });
  if (!response.ok) {
    throw new Error(`Inngest event API responded ${response.status}: ${await response.text()}`);
  }
}
