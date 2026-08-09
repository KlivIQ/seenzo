import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

import { scanFormSchema, type ScanFormValues } from "@/lib/scan-schema";
import type { ScanRequestResult } from "@/lib/server/scan-request";
import { cn } from "@/lib/utils";

type Props = { compact?: boolean; className?: string };

type ScanStatusResponse =
  | { status: "scanning" }
  | { status: "done"; score?: number; grade?: string }
  | { status: "failed" };

type View = { kind: "form" } | { kind: "progress" } | { kind: "error" } | { kind: "timeout" };

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_SECONDS = 90;

function phaseMessage(elapsedSeconds: number): string {
  if (elapsedSeconds < 5) return "Fetching your website…";
  if (elapsedSeconds < 12) return "Checking how AI crawlers see you…";
  if (elapsedSeconds < 18) return "Scoring across six pillars…";
  return "Finalizing your report…";
}

export function ScanForm({ compact = false, className }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ kind: "form" });
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: { nameOrBusiness: "", email: "", phone: "", website: "" },
  });

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  };

  // Belt-and-braces cleanup if the component unmounts mid-poll (e.g. the
  // user navigates away before the scan finishes).
  useEffect(() => clearTimers, []);

  const startPolling = (slug: string) => {
    setElapsed(0);
    setView({ kind: "progress" });

    tickRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    const poll = async () => {
      try {
        const res = await fetch(`/api/scan-status/${slug}`);
        if (!res.ok) return; // transient error — keep polling, the timeout will catch a real hang
        const data = (await res.json()) as ScanStatusResponse;
        if (data.status === "done") {
          clearTimers();
          void navigate({ to: "/r/$slug", params: { slug } });
        } else if (data.status === "failed") {
          clearTimers();
          setView({ kind: "error" });
        }
      } catch {
        // network hiccup — keep polling until the timeout kicks in
      }
    };

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  // Elapsed time also drives the 90s giving-up point, independent of poll results.
  useEffect(() => {
    if (view.kind !== "progress") return;
    if (elapsed >= TIMEOUT_SECONDS) {
      clearTimers();
      setView({ kind: "timeout" });
    }
  }, [elapsed, view.kind]);

  const onSubmit = async (values: ScanFormValues) => {
    try {
      const res = await fetch("/api/scan-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.nameOrBusiness,
          business: values.nameOrBusiness,
          email: values.email,
          phone: values.phone ?? "",
          website: values.website,
        }),
      });
      const result = (await res.json()) as ScanRequestResult;

      if (result.success) {
        startPolling(result.slug);
        return;
      }

      toast.error(
        result.code === "rate_limited" ? result.error : "Something went wrong. Please try again.",
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const resetToForm = () => {
    clearTimers();
    setElapsed(0);
    reset();
    setView({ kind: "form" });
  };

  const cardBase = "rounded-2xl p-8 text-center sm:p-8";

  if (view.kind === "progress") {
    const pct = Math.min(96, 12 + Math.round((elapsed / TIMEOUT_SECONDS) * 100));
    return (
      <div className={cn(cardBase, "border border-slate-200 bg-white", className)}>
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-brand" />
        <h3 className="mt-4 font-display text-xl font-bold text-ink">{phaseMessage(elapsed)}</h3>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${pct}%`, transition: "width 1s ease-out" }}
          />
        </div>
        <p className="mt-4 text-sm text-slate-500">This usually takes about 30 seconds.</p>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className={cn(cardBase, "border border-red-200 bg-red-50", className)}>
        <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
        <p className="mt-4 text-base font-medium text-ink">
          Something went wrong with your scan. We&apos;ve saved your request — check your email
          shortly, or try again.
        </p>
        <button
          onClick={resetToForm}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (view.kind === "timeout") {
    return (
      <div className={cn(cardBase, "border border-brand/30 bg-brand-soft", className)}>
        <p className="text-base font-medium text-ink">
          This is taking longer than usual — we&apos;ll email your report as soon as it&apos;s
          ready.
        </p>
        <button
          onClick={resetToForm}
          className="mt-5 text-sm font-medium text-brand-ink underline underline-offset-4"
        >
          Scan another site
        </button>
      </div>
    );
  }

  const baseInput =
    "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate-400 outline-none transition focus:ring-4";
  const okInput = "border-slate-200 focus:border-brand focus:ring-brand/10";
  const errInput = "border-red-400 focus:border-red-500 focus:ring-red-500/10";
  const cls = (hasErr: boolean) => cn(baseInput, hasErr ? errInput : okInput);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_60px_-30px_rgba(15,23,42,0.15)] sm:p-8",
        className,
      )}
      noValidate
    >
      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        <Field label="Name / Business name" required error={errors.nameOrBusiness?.message}>
          <input
            {...register("nameOrBusiness")}
            placeholder="Ravi Kumar, Kumar Textiles"
            aria-invalid={!!errors.nameOrBusiness}
            aria-required="true"
            autoComplete="name"
            className={cls(!!errors.nameOrBusiness)}
          />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="you@business.in"
            aria-invalid={!!errors.email}
            aria-required="true"
            autoComplete="email"
            className={cls(!!errors.email)}
          />
        </Field>
        <Field
          label="Phone / WhatsApp"
          error={errors.phone?.message}
          hint="Optional — we'll send your report by WhatsApp too if provided."
        >
          <input
            {...register("phone")}
            type="tel"
            placeholder="+91 98xxx xxxxx"
            aria-invalid={!!errors.phone}
            autoComplete="tel"
            className={cls(!!errors.phone)}
          />
        </Field>
        <Field label="Website URL" required error={errors.website?.message}>
          <input
            {...register("website")}
            placeholder="yourbusiness.in"
            aria-invalid={!!errors.website}
            aria-required="true"
            autoComplete="url"
            className={cls(!!errors.website)}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting your scan…
          </>
        ) : (
          <>
            Get Free AI Visibility Report
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        No credit card. No contracts. Results in about 30 seconds.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
      {!error && hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
