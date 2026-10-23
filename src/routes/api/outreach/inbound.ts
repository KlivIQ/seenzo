import { createFileRoute } from "@tanstack/react-router";

import { scanInboxForReplies } from "@/lib/server/outreach";

// Hostinger Agentic Mail webhook (event: message.received) for sriram@kliviq.com.
// Hostinger authenticates each delivery with `Authorization: Bearer <webhook secret>`.
// The payload is only used as a trigger: the handler re-reads the Inbox through the Mail API,
// so it does not depend on the payload's exact fields and safely handles retries.

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Constant-time string comparison, so the secret cannot be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export const Route = createFileRoute("/api/outreach/inbound")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = process.env.HOSTINGER_WEBHOOK_SECRET;
        if (!secret) return jsonResponse({ success: false, error: "Not configured" }, 503);

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "");
        if (!token || !safeEqual(token, secret)) {
          return jsonResponse({ success: false, error: "Unauthorized" }, 401);
        }

        // Log only the payload's shape (field names), never message content.
        try {
          const body = (await request.json()) as Record<string, unknown>;
          console.log("[outreach inbound] webhook fields:", Object.keys(body ?? {}).join(","));
        } catch {
          // empty or non-JSON body is fine; it is only a trigger
        }

        try {
          const result = await scanInboxForReplies(2);
          return jsonResponse({ success: true, ...result }, 200);
        } catch (err) {
          console.error(
            "[outreach inbound] scan failed:",
            err instanceof Error ? err.message : err,
          );
          return jsonResponse({ success: false, error: "Scan failed" }, 500);
        }
      },
      GET: () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
    },
  },
});
