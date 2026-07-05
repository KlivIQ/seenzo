import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { scanSchema, type ScanFormValues } from "@/lib/scan-schema";
import { cn } from "@/lib/utils";

type Props = { compact?: boolean; className?: string };

export function ScanForm({ compact = false, className }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: { name: "", business: "", email: "", phone: "", website: "" },
  });

  const onSubmit = async (values: ScanFormValues) => {
    await new Promise((r) => setTimeout(r, 900));
    // Lead capture placeholder — wire to backend when available
    console.info("[Seenzo] scan requested", values);
    toast.success("Your scan is queued", {
      description: "We'll email your AI Visibility Report within a few minutes.",
    });
    setSubmitted(true);
    reset();
  };

  if (submitted) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-brand/30 bg-brand-soft p-8 text-center",
          className,
        )}
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
        <h3 className="mt-4 font-display text-xl font-bold text-ink">
          Request received.
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Your AI Visibility Report is being generated. Check your email in a few
          minutes — we also send a WhatsApp copy.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-5 text-sm font-medium text-brand-ink underline underline-offset-4"
        >
          Scan another site
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

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
        <Field label="Your name" error={errors.name?.message}>
          <input {...register("name")} placeholder="Ravi Kumar" className={inputClass} />
        </Field>
        <Field label="Business name" error={errors.business?.message}>
          <input {...register("business")} placeholder="Kumar Textiles" className={inputClass} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="you@business.in"
            className={inputClass}
          />
        </Field>
        <Field label="Phone / WhatsApp" error={errors.phone?.message}>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+91 98xxx xxxxx"
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Website URL" error={errors.website?.message}>
            <input
              {...register("website")}
              placeholder="yourbusiness.in"
              className={inputClass}
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
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}