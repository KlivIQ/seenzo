import { createFileRoute } from "@tanstack/react-router";

import { getSupabaseServer } from "@/lib/supabase";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/scan-status/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = getSupabaseServer();
        const { data: scan } = await supabase
          .from("scans")
          .select("status, score, grade")
          .eq("report_slug", params.slug)
          .maybeSingle();

        if (!scan) {
          // Inngest hasn't reached the store-results step yet — confirm the
          // slug actually belongs to a lead before claiming it's scanning.
          const { data: lead } = await supabase
            .from("leads")
            .select("id")
            .eq("report_slug", params.slug)
            .maybeSingle();
          if (!lead) return jsonResponse({ error: "Not found" }, 404);
          return jsonResponse({ status: "scanning" }, 200);
        }

        if (scan.status === "failed") {
          return jsonResponse({ status: "failed" }, 200);
        }
        if (scan.status === "complete" && scan.score != null && scan.grade != null) {
          return jsonResponse({ status: "done", score: scan.score, grade: scan.grade }, 200);
        }
        return jsonResponse({ status: "scanning" }, 200);
      },
    },
  },
});
