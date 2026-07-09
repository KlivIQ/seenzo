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

// The SDK auto-detects a "branch environment" name from VERCEL_GIT_COMMIT_REF
// whenever it's present — which Vercel sets on every deployment, including
// production (it's just the branch that triggered the deploy, e.g. "main").
// Without this override, production requests carry `x-inngest-env: main`,
// and since no branch environment named "main" exists in Inngest, every
// send fails with "Inngest API Error: 404 Branch environment does not
// exist". Pin `env` to "production" for real Vercel production deployments
// so branch-name detection never kicks in there; preview deployments still
// fall through to the SDK's normal per-branch auto-detection.
const inngestEnv =
  process.env.INNGEST_ENV ?? (process.env.VERCEL_ENV === "production" ? "production" : undefined);

/** Shared Inngest client — one instance per runtime, lazily created. */
export function getInngest(): Inngest {
  if (!client) {
    client = new Inngest({
      id: "seenzo",
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      env: inngestEnv,
    });
  }
  return client;
}
