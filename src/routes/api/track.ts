import { createFileRoute } from "@tanstack/react-router";

import { getSupabaseServer } from "@/lib/supabase";
import type { ActivityType } from "@/lib/types/database";

type TrackEvent = "cta_consult_clicked" | "cta_whatsapp_clicked";
const VALID_EVENTS: TrackEvent[] = ["cta_consult_clicked", "cta_whatsapp_clicked"];

interface TrackRequestBody {
  slug?: string;
  event?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let input: TrackRequestBody;
        try {
          input = (await request.json()) as TrackRequestBody;
        } catch {
          return jsonResponse({ success: false, error: "Invalid request body" }, 400);
        }

        const { slug, event } = input;
        if (!slug || !event || !VALID_EVENTS.includes(event as TrackEvent)) {
          return jsonResponse({ success: false, error: "Invalid payload" }, 400);
        }

        const supabase = getSupabaseServer();
        const { data: scan } = await supabase
          .from("scans")
          .select("lead_id")
          .eq("report_slug", slug)
          .maybeSingle();

        if (!scan) return jsonResponse({ success: false, error: "Unknown report" }, 404);

        const { error } = await supabase.from("activity_log").insert({
          lead_id: scan.lead_id,
          type: event as ActivityType,
          payload: { slug },
        });
        if (error) return jsonResponse({ success: false, error: "Failed to record event" }, 500);

        return jsonResponse({ success: true }, 200);
      },
      GET: () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
    },
  },
});
