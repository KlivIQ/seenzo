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

// Vercel sets VERCEL_GIT_COMMIT_REF (the branch that triggered the deploy,
// e.g. "main") on every deployment, production included. The SDK's header
// builder is `opts.inngestEnv || getEnvironmentName(env)` — ANY truthy value
// for the client's `env` option (this codebase previously tried pinning it
// to the literal string "production") still gets sent as `x-inngest-env`,
// and Inngest Cloud then tries to resolve it as a Branch Environment and
// 404s ("Branch environment does not exist"), since no branch env is
// configured for this app — there's only Production. The only way to get
// the SDK to omit the header (and so fall back to whichever environment the
// signing/event key itself belongs to, i.e. Production) is for
// getEnvironmentName() to find nothing at all — which means
// VERCEL_GIT_COMMIT_REF must not be visible to it. There's no supported
// client option to suppress this, so we strip the var before the SDK reads
// it. Confirmed against the SDK's own env.js source, not just docs.
delete process.env.VERCEL_GIT_COMMIT_REF;

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
