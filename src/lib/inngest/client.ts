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

// INNGEST_ENV=production is set in Vercel (Production scope) so the SDK's
// header builder (`opts.inngestEnv || getEnvironmentName(env)`) picks it up
// first, ahead of VERCEL_GIT_COMMIT_REF/BRANCH_NAME/etc — no branch-env
// header gets sent, and Inngest Cloud resolves events against Production.

// TEMP DEBUG — remove once the branch-env issue is confirmed resolved.
console.log("[inngest client] env vars at construction", {
  INNGEST_ENV: process.env.INNGEST_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
});

/** Shared Inngest client — one instance per runtime, lazily created. */
export function getInngest(): Inngest {
  if (!client) {
    client = new Inngest({
      id: "seenzo",
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      env: process.env.INNGEST_ENV || undefined,
    });
  }
  return client;
}
