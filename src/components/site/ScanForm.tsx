import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { scanSchema, type ScanFormValues } from "@/lib/scan-schema";
import type { ScanRequestResult } from "@/lib/server/scan-request";
import { cn } from "@/lib/utils";

type Props = { compact?: boolean; className?: string };

type Outcome = { kind: "verify" } | { kind: "duplicate"; reportSlug: string };

export function ScanForm({ compact = false, className }: Props) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: { name: "", business: "", email: "", phone: "", website: "" },
  });

  const onSubmit = async (values: ScanFormValues) => {
    try {
      const res = await fetch("/api/scan-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await res.json()) as ScanRequestResult;

      if (result.success) {
        setOutcome(
          result.reportSlug
            ? { kind: "duplicate", reportSlug: result.reportSlug }
            : { kind: "verify" },
        );
        reset();
        return;
      }

      if (result.code === "rate_limited") {
        toast.error(
          "You've already requested a scan recently. Check your inbox for your previous report.",
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (outcome) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-brand/30 bg-brand-soft p-8 text-center",
          className,
        )}
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
        <h3 className="mt-4 font-display text-xl font-bold text-ink">Request received.</h3>
        {outcome.kind === "duplicate" ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              We've already scanned this site. Check your email for the existing report.
            </p>
            <a
              href={`/r/${outcome.reportSlug}`}
              className="mt-3 inline-block text-sm font-medium text-brand-ink underline underline-offset-4"
            >
              View existing report
            </a>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Check your email — we've sent you a verification link to start your scan.
          </p>
        )}
        <button
          onClick={() => setOutcome(null)}
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
        <Field label="Your name" required error={errors.name?.message}>
          <input
            {...register("name")}
            placeholder="Ravi Kumar"
            aria-invalid={!!errors.name}
            aria-required="true"
            autoComplete="name"
            className={cls(!!errors.name)}
          />
        </Field>
        <Field label="Business name" required error={errors.business?.message}>
          <input
            {...register("business")}
            placeholder="Kumar Textiles"
            aria-invalid={!!errors.business}
            aria-required="true"
            autoComplete="organization"
            className={cls(!!errors.business)}
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
        <Field label="Phone / WhatsApp" required error={errors.phone?.message}>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+91 98xxx xxxxx"
            aria-invalid={!!errors.phone}
            aria-required="true"
            autoComplete="tel"
            className={cls(!!errors.phone)}
          />
        </Field>
        <div className="sm:col-span-2">
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
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Queuing your scan…
          </>
        ) : (
          <>
            Get Free AI Visibility Report
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        No credit card. No contracts. Report delivered in minutes.
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        We'll verify your email before running the scan.
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Demo form — submissions are not stored yet.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
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
    </label>
  );
}
