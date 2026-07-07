import { createFileRoute } from "@tanstack/react-router";

import { deleteLeadHard, rerunLeadScan, updateLeadFields } from "@/lib/server/admin";
import { getAdminSession } from "@/lib/server/auth";
import type { LeadStatus } from "@/lib/types/database";

const VALID_STATUSES: LeadStatus[] = [
  "unverified",
  "verified",
  "scanned",
  "contacted",
  "consult_booked",
  "won",
  "lost",
  "opted_out",
];

interface PatchBody {
  leadId?: string;
  status?: string;
  notes?: string;
}

interface DeleteBody {
  leadId?: string;
}

interface RerunBody {
  leadId?: string;
  action?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const session = await getAdminSession(request);
        if (!session) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

        let input: PatchBody;
        try {
          input = (await request.json()) as PatchBody;
        } catch {
          return jsonResponse({ success: false, error: "Invalid request body" }, 400);
        }

        const { leadId, status, notes } = input;
        if (!leadId) return jsonResponse({ success: false, error: "leadId is required" }, 400);
        if (status !== undefined && !VALID_STATUSES.includes(status as LeadStatus)) {
          return jsonResponse({ success: false, error: "Invalid status" }, 400);
        }
        if (status === undefined && notes === undefined) {
          return jsonResponse({ success: false, error: "Nothing to update" }, 400);
        }

        try {
          await updateLeadFields(leadId, {
            ...(status !== undefined ? { status: status as LeadStatus } : {}),
            ...(notes !== undefined ? { notes } : {}),
          });
        } catch {
          return jsonResponse({ success: false, error: "Failed to update lead" }, 500);
        }

        return jsonResponse({ success: true }, 200);
      },

      DELETE: async ({ request }: { request: Request }) => {
        const session = await getAdminSession(request);
        if (!session) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

        let input: DeleteBody;
        try {
          input = (await request.json()) as DeleteBody;
        } catch {
          return jsonResponse({ success: false, error: "Invalid request body" }, 400);
        }

        if (!input.leadId)
          return jsonResponse({ success: false, error: "leadId is required" }, 400);

        try {
          await deleteLeadHard(input.leadId);
        } catch {
          return jsonResponse({ success: false, error: "Failed to delete lead" }, 500);
        }

        return jsonResponse({ success: true }, 200);
      },

      POST: async ({ request }: { request: Request }) => {
        const session = await getAdminSession(request);
        if (!session) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

        let input: RerunBody;
        try {
          input = (await request.json()) as RerunBody;
        } catch {
          return jsonResponse({ success: false, error: "Invalid request body" }, 400);
        }

        if (!input.leadId || input.action !== "rerun_scan") {
          return jsonResponse({ success: false, error: "Invalid request" }, 400);
        }

        try {
          await rerunLeadScan(input.leadId);
        } catch {
          return jsonResponse({ success: false, error: "Failed to queue scan" }, 500);
        }

        return jsonResponse({ success: true }, 200);
      },
    },
  },
});
