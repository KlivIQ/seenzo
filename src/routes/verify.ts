import { createFileRoute } from "@tanstack/react-router";

import { getInngest } from "@/lib/inngest/client";
import type { ScanRequestedEventData } from "@/lib/inngest/events";
import { getSupabaseServer } from "@/lib/supabase";

function expiredLinkPage(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Verification link expired — Seenzo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      a { display: inline-block; padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; text-decoration: none; background: #111; color: #fff; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Link expired</h1>
      <p>This verification link has expired. Please submit a new scan request.</p>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`,
    { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/verify")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const token = new URL(request.url).searchParams.get("token");
        if (!token) return expiredLinkPage();

        const supabase = getSupabaseServer();
        const { data: lead } = await supabase
          .from("leads")
          .select("id, name, business_name, website_url")
          .eq("verify_token", token)
          .gt("verify_expires", new Date().toISOString())
          .maybeSingle();

        if (!lead) return expiredLinkPage();

        const { error: updateError } = await supabase
          .from("leads")
          .update({ status: "verified", verify_token: null, verify_expires: null })
          .eq("id", lead.id);
        if (updateError) throw new Error(`Failed to mark lead verified: ${updateError.message}`);

        const eventData: ScanRequestedEventData = {
          leadId: lead.id,
          websiteUrl: lead.website_url,
          leadName: lead.name,
          businessName: lead.business_name,
        };
        await getInngest().send({ name: "scan/requested", data: eventData });

        return new Response(null, { status: 302, headers: { Location: "/verified" } });
      },
    },
  },
});
