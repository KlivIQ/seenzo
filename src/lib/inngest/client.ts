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

// This project has zero branch environments configured in Inngest — only
// Production. The SDK's header builder is
// `opts.inngestEnv || getEnvironmentName(env)`, and getEnvironmentName()
// checks VERCEL_GIT_COMMIT_REF, INNGEST_ENV, BRANCH_NAME, and NETLIFY_BRANCH
// (in that order) — ANY truthy value among these gets sent as `x-inngest-env`
// and Inngest Cloud tries to resolve it as a branch environment, 404ing
// ("Branch environment does not exist") since none are configured. Passing
// `env: "production"` (tried previously) hits the exact same 404 — Inngest
// treats the literal string "production" as a branch name to look up, not as
// "use the default Production environment". The only way to get the SDK to
// omit the header entirely is for all of these vars to be unset, so they're
// deleted before client construction rather than filtered via a client option
// (there isn't one that suppresses this).
const BRANCH_ENV_VARS = [
  "VERCEL_GIT_COMMIT_REF",
  "INNGEST_ENV",
  "BRANCH_NAME",
  "NETLIFY_BRANCH",
] as const;

// TEMP DEBUG — remove once the branch-env issue is confirmed resolved.
console.log(
  "[inngest client] branch env vars before deletion",
  Object.fromEntries(BRANCH_ENV_VARS.map((key) => [key, process.env[key]])),
);

for (const key of BRANCH_ENV_VARS) {
  delete process.env[key];
}

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
