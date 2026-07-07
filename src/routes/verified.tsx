import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/verified")({
  component: VerifiedPage,
  head: () => ({
    meta: [
      { title: "You're verified — Seenzo" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Your email is verified and your Seenzo AI Visibility scan is now running.",
      },
    ],
  }),
});

function VerifiedPage() {
  return (
    <SiteShell>
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center sm:py-32">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          You're verified.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Your scan is running — check your email in a few minutes.
        </p>
      </div>
    </SiteShell>
  );
}
