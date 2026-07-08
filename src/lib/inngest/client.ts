import { Inngest } from "inngest";

import { requireEnv } from "@/lib/server/env";

let client: Inngest | undefined;

/** Shared Inngest client — one instance per runtime, lazily created. */
export function getInngest(): Inngest {
  if (!client) {
    client = new Inngest({
      id: "seenzo",
      eventKey: requireEnv("INNGEST_EVENT_KEY"),
      signingKey: requireEnv("INNGEST_SIGNING_KEY"),
    });
  }
  return client;
}
