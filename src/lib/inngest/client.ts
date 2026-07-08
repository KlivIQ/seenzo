import { Inngest } from "inngest";

let client: Inngest | undefined;

// eventKey/signingKey are intentionally read straight from process.env rather
// than through a validator that throws on a missing var: the Inngest SDK
// itself treats both as optional at construction time (it falls back to
// reading INNGEST_SIGNING_KEY from the environment internally, and only
// errors on a missing eventKey when an event is actually sent). scan.ts,
// deliver.ts, and followup.ts call getInngest() at module scope to define
// their exported functions — a throw here would run at import time and,
// since TanStack Start's SSR entry eagerly imports every route module, take
// down every route rather than just the Inngest ones.

/** Shared Inngest client — one instance per runtime, lazily created. */
export function getInngest(): Inngest {
  if (!client) {
    client = new Inngest({
      id: "seenzo",
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
    });
  }
  return client;
}
