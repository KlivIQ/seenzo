import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminSession, signInAdmin } from "@/lib/server/auth";

const checkAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAdminSession();
  return { authenticated: session !== null };
});

const loginAdmin = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => signInAdmin(data.email, data.password));

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  beforeLoad: async () => {
    const { authenticated } = await checkAdminSession();
    if (authenticated) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [{ title: "Admin Login — Seenzo" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const inputClassName =
  "border-white/10 bg-slate-900/60 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50";

function AdminLoginPage() {
  const navigate = Route.useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await loginAdmin({ data: { email, password } });
      if (!result.success) {
        setError("Invalid credentials");
        return;
      }
      navigate({ to: "/admin" });
    } catch {
      setError("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 font-sans text-slate-100 antialiased">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 font-display text-lg font-black text-amber-950">
            S
          </div>
          <div>
            <div className="font-display text-base font-bold leading-tight text-white">
              Seenzo Admin
            </div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">by KlivIQ</div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-xl font-bold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-slate-400">Internal dashboard access only.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
