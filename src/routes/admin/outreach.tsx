import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Inbox,
  Instagram,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  buildDmBody,
  instagramLink,
  mailtoLink,
  TAMIL_MARKER,
  websiteVerified,
  whatsappLink,
  type DmChannel,
} from "@/lib/outreach-templates";
import { buildDmQueue, DM_DAILY_LIMIT, sentToday, type QueueItem } from "@/lib/outreach-dm";
import { getAdminSession } from "@/lib/server/auth";
import {
  deleteProspect,
  importProspects,
  loadOutreach,
  auditProspect,
  markMessageSent,
  recordDmSent,
  checkRepliesNow,
  regenerateAllDrafts,
  regenerateDrafts,
  sendOutreachEmail,
  updateMessageBody,
  updateProspect,
  type ProspectPatch,
} from "@/lib/server/outreach";
import type {
  AuditVerdict,
  ImportResult,
  OutreachChannel,
  OutreachMessage,
  OutreachProduct,
  OutreachProspect,
  OutreachSendingInfo,
  OutreachStatus,
  ProspectImportRow,
} from "@/lib/types/outreach";
import { OUTREACH_PRODUCTS, OUTREACH_STATUSES } from "@/lib/types/outreach";

// ---------- server functions ----------

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAdminSession();
  return { authenticated: session !== null };
});

const getData = createServerFn({ method: "GET" }).handler(async () => loadOutreach());

const importFn = createServerFn({ method: "POST" })
  .validator((rows: ProspectImportRow[]) => rows)
  .handler(async ({ data }) => importProspects(data));

const patchFn = createServerFn({ method: "POST" })
  .validator((input: { id: string; patch: ProspectPatch }) => input)
  .handler(async ({ data }) => {
    await updateProspect(data.id, data.patch);
    return { success: true } as const;
  });

const regenAllFn = createServerFn({ method: "POST" }).handler(async () => regenerateAllDrafts());

const checkRepliesFn = createServerFn({ method: "POST" }).handler(async () => checkRepliesNow());

const regenFn = createServerFn({ method: "POST" })
  .validator((input: { id: string; product?: OutreachProduct; step?: 1 | 2 | 3 }) => input)
  .handler(async ({ data }) => {
    await regenerateDrafts(data.id, { product: data.product, step: data.step });
    return { success: true } as const;
  });

const saveDraftFn = createServerFn({ method: "POST" })
  .validator((input: { id: string; body: string; subject: string | null }) => input)
  .handler(async ({ data }) => {
    await updateMessageBody(data.id, data.body, data.subject);
    return { success: true } as const;
  });

const sentFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await markMessageSent(id);
    return { success: true } as const;
  });

const auditFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => auditProspect(id));

const recordDmFn = createServerFn({ method: "POST" })
  .validator(
    (input: { prospectId: string; channel: OutreachChannel; step: number; body: string }) => input,
  )
  .handler(async ({ data }) => {
    await recordDmSent(data);
    return { success: true } as const;
  });

const sendFn = createServerFn({ method: "POST" })
  .validator((input: { id: string; subject: string; body: string }) => input)
  .handler(async ({ data }) =>
    sendOutreachEmail(data.id, { subject: data.subject, body: data.body }),
  );

const deleteFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await deleteProspect(id);
    return { success: true } as const;
  });

export const Route = createFileRoute("/admin/outreach")({
  component: OutreachPage,
  beforeLoad: async () => {
    const { authenticated } = await checkAuth();
    if (!authenticated) throw redirect({ to: "/admin/login" });
  },
  loader: () => getData(),
  head: () => ({
    meta: [{ title: "Outreach | Seenzo Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

// ---------- helpers ----------

const STATUS_LABEL: Record<OutreachStatus, string> = {
  new: "New",
  drafted: "Drafted",
  sent: "Sent",
  replied: "Replied",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
  do_not_contact: "Do not contact",
};

const STATUS_STYLE: Record<OutreachStatus, string> = {
  new: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  drafted: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sent: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  replied: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  booked: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  lost: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  do_not_contact: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

const PRODUCT_LABEL: Record<OutreachProduct, string> = {
  seenzo: "Seenzo",
  tryon: "TryOn",
  connect: "Connect",
  consulting: "Consulting",
  webredo: "Website & AI",
};

const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isDue(p: OutreachProspect): boolean {
  return (
    p.status === "sent" &&
    !!p.next_followup_at &&
    new Date(p.next_followup_at).getTime() <= Date.now()
  );
}

/** Minimal CSV parser: quoted fields, escaped quotes, CRLF. */
function parseCsv(text: string): ProspectImportRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const alias: Record<string, keyof ProspectImportRow> = {
    business_name: "business_name",
    title: "business_name",
    category: "industry",
    address: "address",
    emails: "contact_email",
    business: "business_name",
    company: "business_name",
    website_url: "website_url",
    website: "website_url",
    url: "website_url",
    city: "city",
    industry: "industry",
    contact_name: "contact_name",
    name: "contact_name",
    contact_email: "contact_email",
    email: "contact_email",
    contact_phone: "contact_phone",
    phone: "contact_phone",
    linkedin_url: "linkedin_url",
    linkedin: "linkedin_url",
    instagram_handle: "instagram_handle",
    instagram: "instagram_handle",
    instagram_url: "instagram_handle",
    ig: "instagram_handle",
    source_type: "source_type",
    source: "source_type",
    score: "score",
    seenzo_score: "score",
  };
  return rows.slice(1).map((r) => {
    const out: Record<string, string> = {};
    header.forEach((h, idx) => {
      const key = alias[h];
      if (key && r[idx] !== undefined) out[key] = r[idx].trim();
    });
    return out as unknown as ProspectImportRow;
  });
}

// ---------- sending ----------

interface SendTarget {
  prospect: OutreachProspect;
  message: OutreachMessage;
  subject?: string;
  body?: string;
}

/** The email draft that is ready to go out for this prospect, if any. */
function nextEmailDraft(p: OutreachProspect, messages: OutreachMessage[]): OutreachMessage | null {
  if (["do_not_contact", "replied", "booked", "won", "lost"].includes(p.status)) return null;
  if (!p.contact_email) return null;
  if (p.audit_verdict === "skip") return null;
  const drafts = messages.filter(
    (m) => m.prospect_id === p.id && m.channel === "email" && m.status === "draft",
  );
  if (drafts.length === 0) return null;
  return drafts.reduce((a, b) => (b.step > a.step ? b : a));
}

function ConfirmSendDialog({
  target,
  sending,
  onClose,
  onSent,
}: {
  target: SendTarget;
  sending: OutreachSendingInfo;
  onClose: () => void;
  onSent: () => void;
}) {
  const { prospect, message } = target;
  const [subject, setSubject] = useState(target.subject ?? message.subject ?? "");
  const [body, setBody] = useState(target.body ?? message.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(message.error);

  const remaining = Math.max(sending.dailyCap - sending.sentToday, 0);
  const unverifiedSite =
    !!prospect.website_url && !websiteVerified(prospect.contact_email, prospect.website_url);
  const isFollowUp = message.step > 1;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await sendFn({ data: { id: message.id, subject, body } });
      toast.success(
        `Sent to ${prospect.contact_email}. ${res.sentToday}/${res.dailyCap} today.${
          isFollowUp && !res.threaded ? " Sent as a new email (original not found in Sent)." : ""
        }`,
      );
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {isFollowUp ? `Send follow-up ${message.step - 1}` : "Send email"}
          </h2>
          <button onClick={onClose} aria-label="Close" disabled={busy}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <dl className="mb-3 grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
          <dt className="text-slate-400">From</dt>
          <dd>{sending.from}</dd>
          <dt className="text-slate-400">To</dt>
          <dd>
            {prospect.contact_email}{" "}
            <span className="text-slate-400">({prospect.business_name})</span>
          </dd>
        </dl>

        {unverifiedSite && (
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            Website not verified: {prospect.website_host} does not match the email domain. It is
            left out of the email. Check the business name looks right.
          </div>
        )}
        {isFollowUp && (
          <div className="mb-3 text-xs text-slate-400">
            Sent as a reply to your earlier email, so it lands in the same thread.
          </div>
        )}

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={busy}
          className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
          rows={12}
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-relaxed"
        />

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {remaining} of {sending.dailyCap} sends left today
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={busy || remaining === 0 || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {remaining === 0 ? "Daily limit reached" : "Confirm and send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------

type Filter = "all" | "to_send" | "dm" | "due" | "sent" | "replied" | "closed" | "skipped";

function OutreachPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("to_send");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<OutreachProduct | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [regenAll, setRegenAll] = useState(false);
  const [checking, setChecking] = useState(false);
  const [auditProgress, setAuditProgress] = useState<{ done: number; total: number } | null>(null);
  const [auditingIds, setAuditingIds] = useState<Set<string>>(new Set());
  const stopAudit = useRef(false);

  const refresh = () => router.invalidate();

  /** Audits sites two at a time, one per request, so each stays well inside the time limit. */
  async function runAudit(targets: OutreachProspect[]) {
    if (targets.length === 0 || auditProgress) return;
    stopAudit.current = false;
    let next = 0;
    let done = 0;
    const counts = { target: 0, maybe: 0, skip: 0, failed: 0 };
    setAuditProgress({ done: 0, total: targets.length });
    const worker = async () => {
      while (!stopAudit.current) {
        const p = targets[next++];
        if (!p) return;
        setAuditingIds((prev) => new Set(prev).add(p.id));
        try {
          const r = await auditFn({ data: p.id });
          if (r.error) counts.failed += 1;
          else counts[r.verdict] += 1;
        } catch {
          counts.failed += 1;
        }
        setAuditingIds((prev) => {
          const n = new Set(prev);
          n.delete(p.id);
          return n;
        });
        done += 1;
        setAuditProgress({ done, total: targets.length });
        if (done % 5 === 0) refresh();
      }
    };
    await Promise.all([worker(), worker()]);
    setAuditProgress(null);
    refresh();
    toast.success(
      `Audited ${done}: ${counts.target} to target, ${counts.maybe} maybe, ${counts.skip} skipped` +
        (counts.failed ? `, ${counts.failed} did not load` : ""),
    );
  }

  const unaudited = data.prospects.filter(
    (p) =>
      p.website_url &&
      !p.audited_at &&
      !["do_not_contact", "lost", "won", "replied", "booked"].includes(p.status),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data.prospects.filter((p) => {
      if (product !== "all" && p.product !== product) return false;
      if (q) {
        const hay =
          `${p.business_name} ${p.city ?? ""} ${p.industry ?? ""} ${p.contact_email ?? ""} ${p.instagram_handle ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "to_send":
          return (p.status === "new" || p.status === "drafted") && p.audit_verdict !== "skip";
        case "skipped":
          return p.audit_verdict === "skip";
        case "due":
          return isDue(p);
        case "sent":
          return p.status === "sent";
        case "replied":
          return ["replied", "booked"].includes(p.status);
        case "closed":
          return ["won", "lost", "do_not_contact"].includes(p.status);
        default:
          return true;
      }
    });
    // Best prospects first once their sites have been audited.
    if (filter === "to_send") {
      rows.sort((a, b) => (b.redo_score ?? -1) - (a.redo_score ?? -1));
    }
    return rows;
  }, [data.prospects, filter, query, product]);

  const selected = data.prospects.find((p) => p.id === selectedId) ?? null;
  const m = data.metrics;

  const dmQueueAll = useMemo(
    () => buildDmQueue(data.prospects, data.messages),
    [data.prospects, data.messages],
  );
  const dmQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dmQueueAll.filter(({ prospect: p }) => {
      if (product !== "all" && p.product !== product) return false;
      if (!q) return true;
      return `${p.business_name} ${p.city ?? ""} ${p.instagram_handle ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [dmQueueAll, product, query]);

  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: "to_send", label: "To send", count: m.toSend },
    { key: "dm", label: "DM queue", count: dmQueueAll.length },
    { key: "due", label: "Follow-up due", count: m.followupsDue },
    { key: "sent", label: "Sent", count: m.sent },
    { key: "replied", label: "Replied", count: m.replied },
    {
      key: "skipped",
      label: "Skipped (modern site)",
      count: data.prospects.filter((p) => p.audit_verdict === "skip").length,
    },
    { key: "closed", label: "Closed" },
    { key: "all", label: "All", count: m.total },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm text-slate-400 hover:text-slate-200">
              ← Leads
            </Link>
            <div className="font-display text-base font-bold">KlivIQ Outreach</div>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {data.sending.enabled
                ? `Sending as ${data.sending.from} · ${data.sending.sentToday}/${data.sending.dailyCap} today`
                : "Manual send (direct sending not set up)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.sending.enabled && (
              <button
                onClick={async () => {
                  setChecking(true);
                  try {
                    const r = await checkRepliesFn();
                    const parts = [
                      r.replies && `${r.replies} replied`,
                      r.optOuts && `${r.optOuts} opted out`,
                      r.bounces && `${r.bounces} bounced`,
                      r.autoReplies && `${r.autoReplies} auto-replies`,
                    ].filter(Boolean);
                    toast.success(parts.length ? `New: ${parts.join(", ")}` : "No new replies");
                    refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not check replies");
                  } finally {
                    setChecking(false);
                  }
                }}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Inbox className="h-4 w-4" />
                )}
                Check replies
              </button>
            )}
            {auditProgress ? (
              <button
                onClick={() => (stopAudit.current = true)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Auditing {auditProgress.done}/{auditProgress.total} · Stop
              </button>
            ) : (
              <button
                onClick={() => void runAudit(unaudited)}
                disabled={unaudited.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
              >
                <Globe className="h-4 w-4" />
                Audit websites{unaudited.length ? ` (${unaudited.length})` : ""}
              </button>
            )}
            <button
              onClick={async () => {
                if (
                  !confirm(
                    "Rewrite all unsent drafts with the latest email wording? Sent emails are not changed. Any edits you made to unsent drafts will be replaced.",
                  )
                )
                  return;
                setRegenAll(true);
                try {
                  const res = await regenAllFn();
                  toast.success(`Drafts updated for ${res.prospects} prospects`);
                  refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not update drafts");
                } finally {
                  setRegenAll(false);
                }
              }}
              disabled={regenAll}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
            >
              {regenAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate all drafts
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
            >
              <Upload className="h-4 w-4" /> Import prospects
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
          <div>
            <span className="text-2xl font-bold text-amber-200">{data.inbound.replies}</span>
            <span className="ml-2 text-slate-300">
              {data.inbound.replies === 1 ? "reply received" : "replies received"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>{data.inbound.optOuts} opted out</span>
            <span>{data.inbound.bounces} bounced</span>
            <span>{data.inbound.autoReplies} auto-replies</span>
            <span>
              {data.inbound.total} inbound tracked
              {data.inbound.lastReceivedAt ? ` · last ${relTime(data.inbound.lastReceivedAt)}` : ""}
            </span>
          </div>
          <span className="ml-auto text-xs text-slate-500">
            Email replies are caught automatically. For DMs, tap "They replied" in the queue.
          </span>
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filter === t.key
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 text-slate-400">{t.count}</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value as OutreachProduct | "all")}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="all">All products</option>
              {OUTREACH_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {PRODUCT_LABEL[p]}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search business, city, email"
                className="w-64 rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-sm placeholder:text-slate-500"
              />
            </div>
          </div>
        </section>

        {filter === "dm" ? (
          <DmQueue
            items={dmQueue}
            messages={data.messages}
            onOpen={(id) => setSelectedId(id)}
            onChanged={refresh}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last touch</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nothing here. Import prospects or change the filter.
                    </td>
                  </tr>
                )}
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.business_name}</div>
                      <div className="text-xs text-slate-400">
                        {[p.industry, p.city].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{PRODUCT_LABEL[p.product]}</td>
                    <td className="px-4 py-3">
                      <SiteCell
                        p={p}
                        auditing={auditingIds.has(p.id)}
                        onAudit={() => void runAudit([p])}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {[
                        p.contact_email,
                        p.contact_phone,
                        p.instagram_handle ? `@${p.instagram_handle}` : null,
                        p.linkedin_url ? "LinkedIn" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                      {isDue(p) && (
                        <span className="ml-2 text-xs text-amber-300">follow-up due</span>
                      )}
                      {p.last_reply_at && p.last_reply_kind !== "auto_reply" && (
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {relTime(p.last_reply_at)}: {p.last_reply_snippet}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {relTime(p.last_contacted_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const draft = nextEmailDraft(p, data.messages);
                        if (!draft || !data.sending.enabled) return null;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSendTarget({ prospect: p, message: draft });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {draft.step === 1 ? "Send" : `Send follow-up ${draft.step - 1}`}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selected && (
        <ProspectDrawer
          key={selected.id}
          prospect={selected}
          messages={data.messages.filter((x) => x.prospect_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
          sending={data.sending}
          onSend={(t) => setSendTarget(t)}
        />
      )}
      {sendTarget && (
        <ConfirmSendDialog
          target={sendTarget}
          sending={data.sending}
          onClose={() => setSendTarget(null)}
          onSent={() => {
            setSendTarget(null);
            refresh();
          }}
        />
      )}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onDone={refresh} />}
    </div>
  );
}

// ---------- website audit ----------

const VERDICT_STYLE: Record<AuditVerdict, string> = {
  target: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  maybe: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  skip: "border-slate-500/40 bg-slate-500/10 text-slate-400",
};
const VERDICT_LABEL: Record<AuditVerdict, string> = {
  target: "Target",
  maybe: "Maybe",
  skip: "Skip",
};

function SiteCell({
  p,
  auditing,
  onAudit,
}: {
  p: OutreachProspect;
  auditing: boolean;
  onAudit: () => void;
}) {
  if (!p.website_url) {
    return <span className="text-xs text-amber-300">No website</span>;
  }
  if (auditing) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking
      </span>
    );
  }
  if (!p.audited_at || !p.audit_verdict) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAudit();
        }}
        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
      >
        Audit
      </button>
    );
  }
  const f = p.audit_findings;
  if (f?.error) {
    return <span className="text-xs text-slate-400">Did not load</span>;
  }
  return (
    <div className="max-w-[14rem]">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-slate-100">{p.redo_score}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${VERDICT_STYLE[p.audit_verdict]}`}
        >
          {VERDICT_LABEL[p.audit_verdict]}
        </span>
      </div>
      {f?.topProblems[0] && (
        <div className="mt-1 truncate text-xs text-slate-500" title={f.topProblems[0]}>
          {f.topProblems[0]}
        </div>
      )}
    </div>
  );
}

function AuditPanel({
  prospect,
  busy,
  onAudit,
  onVerdict,
}: {
  prospect: OutreachProspect;
  busy: boolean;
  onAudit: () => void;
  onVerdict: (v: AuditVerdict) => void;
}) {
  const f = prospect.audit_findings;
  if (!prospect.website_url) {
    return (
      <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        No website listed. A business with no website at all can be pitched a new one.
      </div>
    );
  }
  if (!prospect.audited_at || !f || !prospect.audit_verdict) {
    return (
      <div className="mt-6 flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm">
        <span className="text-slate-400">Website not audited yet.</span>
        <button
          onClick={onAudit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
        >
          <Globe className="h-4 w-4" /> Audit website
        </button>
      </div>
    );
  }
  const groups: { title: string; items: string[] }[] = [
    { title: "Looks dated", items: f.design.map((x) => x.label) },
    { title: "Hard to find (Google and AI search)", items: f.seo.map((x) => x.label) },
    { title: "Hard to reach", items: f.conversion.map((x) => x.label) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mt-6 rounded-lg border border-white/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold text-slate-100">{prospect.redo_score ?? "-"}</span>
        <span className="text-xs text-slate-400">/100 needs a redo</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${VERDICT_STYLE[prospect.audit_verdict]}`}
        >
          {VERDICT_LABEL[prospect.audit_verdict]}
        </span>
        <button
          onClick={onAudit}
          disabled={busy}
          className="ml-auto rounded-lg border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
        >
          Re-audit
        </button>
      </div>

      {f.error ? (
        <p className="text-sm text-slate-300">
          {f.error}. It may be down for now, so try again later. A site that stays down is itself a
          reason to get in touch.
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="text-base font-semibold text-slate-100">{f.seenzo?.score ?? "-"}</div>
              Seenzo score
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="text-base font-semibold text-slate-100">{f.parts?.design ?? "-"}</div>
              Dated look
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="text-base font-semibold text-slate-100">
                {f.parts?.conversion ?? "-"}
              </div>
              Missed enquiries
            </div>
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing major found. Safe to skip.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.title}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {g.title}
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-300">
                    {g.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {[
              f.platform && `Built on ${f.platform}`,
              f.copyrightYear && `footer © ${f.copyrightYear}`,
              f.fetchMs != null && `${(f.fetchMs / 1000).toFixed(1)}s to load`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
        {prospect.audit_verdict === "skip" ? (
          <button
            onClick={() => onVerdict("maybe")}
            disabled={busy}
            className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5"
          >
            Contact anyway
          </button>
        ) : (
          <button
            onClick={() => onVerdict("skip")}
            disabled={busy}
            className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5"
          >
            Skip this one
          </button>
        )}
        <span>Messages quote one finding and never say how to fix it.</span>
      </div>
    </div>
  );
}

// ---------- DM queue ----------

const STEP_LABEL = ["", "First message", "Follow-up 1", "Last note"];

const DM_OPEN_LABEL: Record<DmChannel, string> = {
  whatsapp: "Open WhatsApp",
  instagram: "Open Instagram",
  linkedin: "Open LinkedIn",
};

function dmLink(item: QueueItem, body: string): string | null {
  const p = item.prospect;
  if (item.channel === "whatsapp") return whatsappLink(p.contact_phone, body);
  if (item.channel === "instagram") return instagramLink(p.instagram_handle);
  return p.linkedin_url?.startsWith("http")
    ? p.linkedin_url
    : p.linkedin_url
      ? `https://${p.linkedin_url}`
      : null;
}

function DmQueue({
  items,
  messages,
  onOpen,
  onChanged,
}: {
  items: QueueItem[];
  messages: OutreachMessage[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const today = useMemo(() => sentToday(messages), [messages]);
  const shown = items.filter((i) => !skipped.has(`${i.prospect.id}:${i.channel}:${i.step}`));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {(["whatsapp", "instagram", "linkedin"] as DmChannel[]).map((c) => (
          <span
            key={c}
            className={`rounded-full border px-2.5 py-1 ${
              today[c] >= DM_DAILY_LIMIT[c]
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : "border-white/10 text-slate-300"
            }`}
          >
            {CHANNEL_LABEL[c]} {today[c]}/{DM_DAILY_LIMIT[c]} today
          </span>
        ))}
        <span className="text-slate-500">
          You send these by hand: open the chat, paste, send, then tap Mark sent. Stay under the
          daily numbers so the accounts are not limited.
        </span>
      </div>

      {shown.length === 0 && (
        <div className="rounded-xl border border-white/10 px-4 py-10 text-center text-slate-400">
          Nobody to message right now. Import prospects with a phone, Instagram handle or LinkedIn
          link, or come back when a follow-up is due.
        </div>
      )}

      <div className="space-y-4">
        {shown.slice(0, 25).map((item) => (
          <DmCard
            key={`${item.prospect.id}:${item.channel}:${item.step}`}
            item={item}
            overLimit={today[item.channel] >= DM_DAILY_LIMIT[item.channel]}
            onOpen={() => onOpen(item.prospect.id)}
            onSkip={() =>
              setSkipped((prev) =>
                new Set(prev).add(`${item.prospect.id}:${item.channel}:${item.step}`),
              )
            }
            onChanged={onChanged}
          />
        ))}
        {shown.length > 25 && (
          <p className="text-center text-xs text-slate-500">
            Showing the first 25 of {shown.length}. The rest appear as you clear these.
          </p>
        )}
      </div>
    </div>
  );
}

function DmCard({
  item,
  overLimit,
  onOpen,
  onSkip,
  onChanged,
}: {
  item: QueueItem;
  overLimit: boolean;
  onOpen: () => void;
  onSkip: () => void;
  onChanged: () => void;
}) {
  const p = item.prospect;
  const generated = useMemo(
    () =>
      item.draft?.body ??
      buildDmBody(
        item.channel,
        p.product,
        {
          businessName: p.business_name,
          contactName: p.contact_name,
          city: p.city,
          industry: p.industry,
          websiteUrl: p.website_url,
          contactEmail: p.contact_email,
          seenzoScore: p.seenzo_score,
        },
        item.step,
      ),
    [item, p],
  );
  const [body, setBody] = useState(generated);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const parts = body.split(`\n\n${TAMIL_MARKER}\n\n`);
  const hasTamil = parts.length === 2;
  const link = dmLink(item, body);
  const tooLong = item.channel === "instagram" && body.length > 1000;

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const handle = p.instagram_handle ? `@${p.instagram_handle}` : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <button onClick={onOpen} className="text-left font-medium hover:text-amber-200">
            {p.business_name}
          </button>
          <div className="text-xs text-slate-400">
            {[
              p.contact_name,
              p.city,
              item.channel === "instagram" ? handle : null,
              item.channel === "whatsapp" ? p.contact_phone : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-300">
            {CHANNEL_LABEL[item.channel]}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 ${
              item.step > 1
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-white/10 text-slate-300"
            }`}
          >
            {STEP_LABEL[item.step]}
            {item.overdueDays > 0 ? ` · ${item.overdueDays}d late` : ""}
          </span>
          <span className="text-slate-500">{PRODUCT_LABEL[p.product]}</span>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={hasTamil ? 12 : 7}
        className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span className={tooLong ? "text-rose-300" : ""}>
          {body.length} characters
          {tooLong && ". Instagram stops at 1,000: send English and Tamil as two messages."}
        </span>
        {overLimit && (
          <span className="text-rose-300">Over today's {CHANNEL_LABEL[item.channel]} limit</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => copy(body, "all")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
        >
          {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
        </button>
        {hasTamil && (
          <>
            <button
              onClick={() => copy(parts[0].trim(), "en")}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
            >
              {copied === "en" ? "Copied" : "Copy English"}
            </button>
            <button
              onClick={() => copy(parts[1].trim(), "ta")}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
            >
              {copied === "ta" ? "Copied" : "Copy Tamil"}
            </button>
          </>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
          >
            {item.channel === "instagram" ? (
              <Instagram className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {DM_OPEN_LABEL[item.channel]}
          </a>
        )}
        <button
          onClick={onSkip}
          className="ml-auto rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5"
        >
          Skip
        </button>
        <button
          disabled={busy}
          onClick={() =>
            act(
              () =>
                recordDmFn({
                  data: {
                    prospectId: p.id,
                    channel: item.channel,
                    step: item.step,
                    body,
                  },
                }),
              "Marked as sent",
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Mark sent
        </button>
      </div>

      {item.step > 1 && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
          Already heard back?
          <button
            disabled={busy}
            onClick={() =>
              act(
                () => patchFn({ data: { id: p.id, patch: { status: "replied" } } }),
                "Moved to Replied",
              )
            }
            className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5"
          >
            They replied
          </button>
          <button
            disabled={busy}
            onClick={() =>
              act(
                () => patchFn({ data: { id: p.id, patch: { status: "lost" } } }),
                "Closed as lost",
              )
            }
            className="rounded-lg border border-white/10 px-2.5 py-1 hover:bg-white/5"
          >
            Not interested
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- import ----------

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(file: File | undefined) {
    if (file) setText(await file.text());
  }

  async function run() {
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error("No rows found. First line must be a header.");
      return;
    }
    setBusy(true);
    try {
      const res = await importFn({ data: rows });
      setResult(res);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Import prospects</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-400">
          CSV with a header row. Columns: business_name, website_url, city, industry, contact_email,
          contact_name, contact_phone, linkedin_url, instagram (handle or link), source_type, score.
          Each row needs a business name and at least one way to reach them. Duplicates and
          opted-out emails are skipped. Drafts are generated for every new row; nothing is sent.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="mb-3 block text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="…or paste CSV here"
          className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-xs"
        />
        {result && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            Added {result.added}. Skipped: {result.skippedDuplicate} duplicate,{" "}
            {result.skippedOptedOut} opted out, {result.skippedInvalid} invalid.
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm">
            {result ? "Done" : "Cancel"}
          </button>
          <button
            onClick={run}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Import
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- drawer ----------

function ProspectDrawer({
  prospect,
  messages,
  onClose,
  onChanged,
  sending,
  onSend,
}: {
  prospect: OutreachProspect;
  messages: OutreachMessage[];
  onClose: () => void;
  onChanged: () => void;
  sending: OutreachSendingInfo;
  onSend: (t: SendTarget) => void;
}) {
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Show the latest unsent draft for the channel, otherwise the latest message.
  const forChannel = messages.filter((x) => x.channel === channel);
  const draft =
    [...forChannel].reverse().find((x) => x.status === "draft" || x.status === "sending") ??
    forChannel.at(-1);
  const edit = draft
    ? (edits[draft.id] ?? { subject: draft.subject ?? "", body: draft.body })
    : null;
  const sentHistory = messages.filter((x) => x.status === "sent");
  const nextStep = (Math.min(prospect.followup_step + 1, 3) as 1 | 2 | 3) || 1;

  async function run<T>(label: string, fn: () => Promise<T>, ok?: string) {
    setBusy(label);
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const external =
    draft && edit
      ? channel === "email"
        ? mailtoLink(prospect.contact_email, edit.subject, edit.body)
        : channel === "whatsapp"
          ? whatsappLink(prospect.contact_phone, edit.body)
          : channel === "instagram"
            ? instagramLink(prospect.instagram_handle)
            : prospect.linkedin_url
      : null;

  const dnc = prospect.status === "do_not_contact";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">{prospect.business_name}</h2>
            <div className="text-sm text-slate-400">
              {[prospect.industry, prospect.city].filter(Boolean).join(" · ")}
            </div>
            {prospect.website_url && (
              <a
                href={prospect.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300"
              >
                {prospect.website_host} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            Status
            <select
              value={prospect.status}
              onChange={(e) =>
                run("status", () =>
                  patchFn({
                    data: { id: prospect.id, patch: { status: e.target.value as OutreachStatus } },
                  }),
                )
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Product
            <select
              value={prospect.product}
              onChange={(e) =>
                run(
                  "product",
                  () =>
                    regenFn({
                      data: {
                        id: prospect.id,
                        product: e.target.value as OutreachProduct,
                        step: nextStep,
                      },
                    }),
                  "Product changed, drafts regenerated",
                )
              }
              disabled={dnc}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {OUTREACH_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {PRODUCT_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {prospect.last_reply_at && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              prospect.last_reply_kind === "reply"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                : prospect.last_reply_kind === "auto_reply"
                  ? "border-white/10 bg-white/[0.03] text-slate-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="mb-1 text-xs uppercase tracking-wider opacity-70">
              {prospect.last_reply_kind === "reply"
                ? "They replied"
                : prospect.last_reply_kind === "opt_out"
                  ? "Asked not to be contacted"
                  : prospect.last_reply_kind === "bounce"
                    ? "Email bounced"
                    : "Auto-reply (follow-ups continue)"}{" "}
              · {relTime(prospect.last_reply_at)}
            </div>
            {prospect.last_reply_snippet}
            {prospect.last_reply_kind === "reply" && (
              <div className="mt-1 text-xs opacity-70">
                Follow-ups stopped. Reply from your Hostinger inbox.
              </div>
            )}
          </div>
        )}

        <ContactFields
          prospect={prospect}
          onSave={(patch) =>
            run("contact", () => patchFn({ data: { id: prospect.id, patch } }), "Saved")
          }
        />

        <AuditPanel
          prospect={prospect}
          busy={busy !== null}
          onAudit={() => run("audit", () => auditFn({ data: prospect.id }), "Website audited")}
          onVerdict={(v) =>
            run("verdict", () =>
              patchFn({ data: { id: prospect.id, patch: { audit_verdict: v } } }),
            )
          }
        />

        {dnc ? (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Marked do not contact. No drafts will be generated or marked sent.
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2">
              {(["email", "whatsapp", "instagram", "linkedin"] as OutreachChannel[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    channel === c
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                      : "border-white/10 text-slate-300"
                  }`}
                >
                  {CHANNEL_LABEL[c]}
                </button>
              ))}
              <button
                onClick={() =>
                  run(
                    "regen",
                    () => regenFn({ data: { id: prospect.id, step: nextStep } }),
                    nextStep === 1 ? "Drafts regenerated" : `Follow-up ${nextStep - 1} drafted`,
                  )
                }
                disabled={busy !== null}
                className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {nextStep === 1 ? "Regenerate" : "Draft follow-up"}
              </button>
            </div>

            {draft && edit ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-slate-400">
                  Step {draft.step} ·{" "}
                  {draft.status === "sent"
                    ? `sent ${relTime(draft.sent_at)}${draft.sent_via === "hostinger" ? " from the tool" : ""}`
                    : draft.status === "sending"
                      ? "sending…"
                      : "draft"}
                </div>
                {channel === "email" && (
                  <input
                    value={edit.subject}
                    disabled={draft.status === "sent"}
                    onChange={(e) =>
                      setEdits({ ...edits, [draft.id]: { ...edit, subject: e.target.value } })
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                  />
                )}
                <textarea
                  value={edit.body}
                  disabled={draft.status === "sent"}
                  onChange={(e) =>
                    setEdits({ ...edits, [draft.id]: { ...edit, body: e.target.value } })
                  }
                  rows={12}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      copy(
                        channel === "email" ? `${edit.subject}\n\n${edit.body}` : edit.body,
                        draft.id,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    {copied === draft.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}{" "}
                    Copy
                  </button>
                  {external && (
                    <a
                      href={external}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <ExternalLink className="h-4 w-4" /> Open in{" "}
                      {channel === "email" ? "mail" : CHANNEL_LABEL[channel]}
                    </a>
                  )}
                  {draft.status === "draft" && (
                    <>
                      <button
                        onClick={() =>
                          run(
                            "save",
                            () =>
                              saveDraftFn({
                                data: {
                                  id: draft.id,
                                  body: edit.body,
                                  subject: channel === "email" ? edit.subject : null,
                                },
                              }),
                            "Draft saved",
                          )
                        }
                        disabled={busy !== null}
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                      >
                        Save edits
                      </button>
                      {channel === "email" && sending.enabled && prospect.contact_email && (
                        <button
                          onClick={() =>
                            onSend({
                              prospect,
                              message: draft,
                              subject: edit.subject,
                              body: edit.body,
                            })
                          }
                          disabled={busy !== null}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                        >
                          <Send className="h-4 w-4" /> Send
                        </button>
                      )}
                      <button
                        onClick={() =>
                          run(
                            "sent",
                            async () => {
                              await saveDraftFn({
                                data: {
                                  id: draft.id,
                                  body: edit.body,
                                  subject: channel === "email" ? edit.subject : null,
                                },
                              });
                              if (channel === "email") await sentFn({ data: draft.id });
                              else
                                await recordDmFn({
                                  data: {
                                    prospectId: prospect.id,
                                    channel,
                                    step: draft.step,
                                    body: edit.body,
                                  },
                                });
                            },
                            channel === "email"
                              ? "Marked as sent. Follow-up scheduled."
                              : "Marked as sent. It returns to the DM queue when the follow-up is due.",
                          )
                        }
                        disabled={busy !== null}
                        className={
                          channel === "email" && sending.enabled
                            ? "rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                            : "ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                        }
                      >
                        <Check className="h-4 w-4" />
                        {channel === "email" && sending.enabled
                          ? "I sent it myself"
                          : "I sent this"}
                      </button>
                    </>
                  )}
                </div>
                {draft.error && draft.status === "draft" && (
                  <p className="text-xs text-rose-300">Last send failed: {draft.error}</p>
                )}
                {channel !== "email" && !external && (
                  <p className="text-xs text-slate-500">
                    {channel === "whatsapp"
                      ? "Add a phone number above to get an open-in-WhatsApp link."
                      : channel === "instagram"
                        ? "Add an Instagram handle above to open the profile."
                        : "Add a LinkedIn URL above to open the profile."}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No draft for this channel yet.</p>
            )}
          </>
        )}

        {sentHistory.length > 0 && (
          <div className="mt-6 text-xs text-slate-400">
            Sent:{" "}
            {sentHistory
              .map((x) => `${CHANNEL_LABEL[x.channel]} step ${x.step} (${relTime(x.sent_at)})`)
              .join(", ")}
            {prospect.next_followup_at && prospect.status === "sent" && (
              <span>
                {" "}
                · follow-up{" "}
                {isDue(prospect)
                  ? "due now"
                  : `on ${new Date(prospect.next_followup_at).toLocaleDateString("en-IN")}`}
              </span>
            )}
          </div>
        )}

        <label className="mt-6 block text-xs text-slate-400">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              notes !== (prospect.notes ?? "") &&
              run("notes", () => patchFn({ data: { id: prospect.id, patch: { notes } } }))
            }
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-slate-100"
          />
        </label>

        <button
          onClick={() => {
            if (confirm(`Delete ${prospect.business_name} and all its drafts?`)) {
              void run("delete", async () => {
                await deleteFn({ data: prospect.id });
                onClose();
              });
            }
          }}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete prospect
        </button>
      </aside>
    </div>
  );
}

function ContactFields({
  prospect,
  onSave,
}: {
  prospect: OutreachProspect;
  onSave: (patch: ProspectPatch) => void;
}) {
  const [v, setV] = useState({
    contact_name: prospect.contact_name ?? "",
    contact_email: prospect.contact_email ?? "",
    contact_phone: prospect.contact_phone ?? "",
    linkedin_url: prospect.linkedin_url ?? "",
    instagram_handle: prospect.instagram_handle ?? "",
    seenzo_score: prospect.seenzo_score?.toString() ?? "",
  });
  const dirty =
    v.contact_name !== (prospect.contact_name ?? "") ||
    v.contact_email !== (prospect.contact_email ?? "") ||
    v.contact_phone !== (prospect.contact_phone ?? "") ||
    v.linkedin_url !== (prospect.linkedin_url ?? "") ||
    v.instagram_handle !== (prospect.instagram_handle ?? "") ||
    v.seenzo_score !== (prospect.seenzo_score?.toString() ?? "");

  const field = (key: keyof typeof v, label: string) => (
    <label className="text-xs text-slate-400">
      {label}
      <input
        value={v[key]}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      />
    </label>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {field("contact_name", "Contact name")}
      {field("contact_email", "Email")}
      {field("contact_phone", "Phone / WhatsApp")}
      {field("linkedin_url", "LinkedIn URL")}
      {field("instagram_handle", "Instagram handle or link")}
      {field("seenzo_score", "Seenzo score (0-100)")}
      <div className="flex items-end">
        <button
          disabled={!dirty}
          onClick={() => {
            const s = v.seenzo_score.trim();
            onSave({
              contact_name: v.contact_name,
              contact_email: v.contact_email,
              contact_phone: v.contact_phone,
              linkedin_url: v.linkedin_url,
              instagram_handle: v.instagram_handle,
              seenzo_score: s === "" ? null : Number.parseInt(s, 10),
            });
          }}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
        >
          Save contact
        </button>
      </div>
    </div>
  );
}
