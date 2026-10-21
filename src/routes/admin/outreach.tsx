import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { mailtoLink, whatsappLink } from "@/lib/outreach-templates";
import { getAdminSession } from "@/lib/server/auth";
import {
  deleteProspect,
  importProspects,
  loadOutreach,
  markMessageSent,
  regenerateDrafts,
  updateMessageBody,
  updateProspect,
  type ProspectPatch,
} from "@/lib/server/outreach";
import type {
  ImportResult,
  OutreachChannel,
  OutreachMessage,
  OutreachProduct,
  OutreachProspect,
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
};

const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
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

// ---------- page ----------

type Filter = "all" | "to_send" | "due" | "sent" | "replied" | "closed";

function OutreachPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("to_send");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState<OutreachProduct | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const refresh = () => router.invalidate();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.prospects.filter((p) => {
      if (product !== "all" && p.product !== product) return false;
      if (q) {
        const hay =
          `${p.business_name} ${p.city ?? ""} ${p.industry ?? ""} ${p.contact_email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "to_send":
          return p.status === "new" || p.status === "drafted";
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
  }, [data.prospects, filter, query, product]);

  const selected = data.prospects.find((p) => p.id === selectedId) ?? null;
  const m = data.metrics;

  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: "to_send", label: "To send", count: m.toSend },
    { key: "due", label: "Follow-up due", count: m.followupsDue },
    { key: "sent", label: "Sent", count: m.sent },
    { key: "replied", label: "Replied", count: m.replied },
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
              Manual send
            </span>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
          >
            <Upload className="h-4 w-4" /> Import prospects
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
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

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last touch</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
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
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {[p.contact_email, p.contact_phone, p.linkedin_url ? "LinkedIn" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                    {isDue(p) && <span className="ml-2 text-xs text-amber-300">follow-up due</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {relTime(p.last_contacted_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <ProspectDrawer
          key={selected.id}
          prospect={selected}
          messages={data.messages.filter((x) => x.prospect_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      )}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onDone={refresh} />}
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
          contact_name, contact_phone, linkedin_url, source_type, score. Each row needs a business
          name and at least one way to reach them. Duplicates and opted-out emails are skipped.
          Drafts are generated for every new row; nothing is sent.
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
}: {
  prospect: OutreachProspect;
  messages: OutreachMessage[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState(prospect.notes ?? "");
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Show the latest unsent draft for the channel, otherwise the latest message.
  const forChannel = messages.filter((x) => x.channel === channel);
  const draft = [...forChannel].reverse().find((x) => x.status === "draft") ?? forChannel.at(-1);
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

        <ContactFields
          prospect={prospect}
          onSave={(patch) =>
            run("contact", () => patchFn({ data: { id: prospect.id, patch } }), "Saved")
          }
        />

        {dnc ? (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Marked do not contact. No drafts will be generated or marked sent.
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2">
              {(["email", "linkedin", "whatsapp"] as OutreachChannel[]).map((c) => (
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
                  {draft.status === "sent" ? `sent ${relTime(draft.sent_at)}` : "draft"}
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
                              await sentFn({ data: draft.id });
                            },
                            "Marked as sent. Follow-up scheduled.",
                          )
                        }
                        disabled={busy !== null}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
                      >
                        <Check className="h-4 w-4" /> I sent this
                      </button>
                    </>
                  )}
                </div>
                {channel !== "email" && !external && (
                  <p className="text-xs text-slate-500">
                    {channel === "whatsapp"
                      ? "Add a phone number above to get an open-in-WhatsApp link."
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
    seenzo_score: prospect.seenzo_score?.toString() ?? "",
  });
  const dirty =
    v.contact_name !== (prospect.contact_name ?? "") ||
    v.contact_email !== (prospect.contact_email ?? "") ||
    v.contact_phone !== (prospect.contact_phone ?? "") ||
    v.linkedin_url !== (prospect.linkedin_url ?? "") ||
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
