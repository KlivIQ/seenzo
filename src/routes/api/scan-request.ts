import { createFileRoute } from "@tanstack/react-router";

import { handleScanRequest, type ScanRequestInput } from "@/lib/server/scan-request";

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/scan-request")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let input: ScanRequestInput;
        try {
          input = (await request.json()) as ScanRequestInput;
        } catch {
          return jsonResponse({ success: false, error: "Invalid request body" }, 400);
        }

        const result = await handleScanRequest(input, getClientIp(request));
        return jsonResponse(result, result.success ? 200 : 400);
      },
      GET: () => jsonResponse({ success: false, error: "Method not allowed" }, 405),
    },
  },
});
