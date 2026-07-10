import { createFileRoute } from "@tanstack/react-router";
import { waitUntil } from "@vercel/functions";

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

// verify_token/verify_expires must not be cleared until we know the DB
// write itself succeeded — clearing them and then failing to persist
// "verified" would burn the token on a request that never actually
// completed, with no way to retry. The Inngest send no longer gates this
// page: it fires after the redirect and can't be the reason we land here.
function retryLinkPage(retryUrl: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Verification failed — Seenzo</title>
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
      <h1>Something went wrong</h1>
      <p>We couldn't confirm your scan just now. Your link is still valid — please try again.</p>
      <a href="${retryUrl}">Try again</a>
    </div>
  </body>
</html>`,
    { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/verify")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) return expiredLinkPage();

        const supabase = getSupabaseServer();
        const { data: lead } = await supabase
          .from("leads")
          .select("id, name, business_name, website_url")
          .eq("verify_token", token)
          .gt("verify_expires", new Date().toISOString())
          .maybeSingle();

        if (!lead) return expiredLinkPage();
        // TEMP DEBUG — remove once verify-flow failures are confirmed gone.
        console.log("[verify] token found", { leadId: lead.id });

        // Mark the lead verified FIRST and redirect immediately — the user's
        // success page must never wait on, or fail because of, Inngest. Only
        // a failure to persist "verified" leaves the token intact for retry.
        const { error: updateError } = await supabase
          .from("leads")
          .update({ status: "verified", verify_token: null, verify_expires: null })
          .eq("id", lead.id);
        if (updateError) {
          console.error(
            "verify failed",
            new Error(`Failed to mark lead verified: ${updateError.message}`),
          );
          return retryLinkPage(url.toString());
        }
        console.log("[verify] lead marked verified", { leadId: lead.id });

        // Fire the scan pipeline in the background, after the DB write is
        // confirmed. Deliberately not awaited: the redirect below must not
        // wait on Inngest, and a failed send must not turn a successfully
        // verified lead into an error page. If this fails, the lead is
        // still verified and the scan can be retried manually from admin.
        // waitUntil keeps the serverless function alive until the send
        // settles, since Vercel freezes the function as soon as the redirect
        // response returns and an un-awaited promise would otherwise never
        // complete.
        const eventData: ScanRequestedEventData = {
          leadId: lead.id,
          websiteUrl: lead.website_url,
          leadName: lead.name,
          businessName: lead.business_name,
        };
        console.log("[verify] sending scan/requested to inngest (background)", { leadId: lead.id });
        waitUntil(
          getInngest()
            .send({ name: "scan/requested", data: eventData })
            .then(() => console.log("[verify] inngest send succeeded", { leadId: lead.id }))
            .catch((error: unknown) =>
              console.error("[verify] inngest send failed (background)", error),
            ),
        );

        return new Response(null, { status: 302, headers: { Location: "/verified" } });
      },
    },
  },
});
