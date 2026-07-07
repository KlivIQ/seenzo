import { createFileRoute } from "@tanstack/react-router";
import { serve } from "inngest/edge";

import { getInngest } from "@/lib/inngest/client";
import { deliverReport } from "@/lib/inngest/deliver";
import { followupSequence } from "@/lib/inngest/followup";
import { scanRun } from "@/lib/inngest/scan";

// Inngest calls this endpoint to execute function steps (POST) and to sync
// the function registry (PUT) or health-check it (GET) — all three must
// point at the same handler for the SDK/dashboard sync to work.
//
// serveOrigin is set explicitly rather than relying on Host-header inference
// so the Inngest Cloud registration handshake always reports the real public
// URL, even if a proxy/CDN in front of the deployment rewrites that header.
const handler = serve({
  client: getInngest(),
  functions: [scanRun, deliverReport, followupSequence],
  serveOrigin: import.meta.env.VITE_APP_URL,
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handler(request),
      POST: ({ request }: { request: Request }) => handler(request),
      PUT: ({ request }: { request: Request }) => handler(request),
    },
  },
});
