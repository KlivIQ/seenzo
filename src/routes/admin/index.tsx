import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchLeadActivity,
  loadAdminDashboard,
  rerunLeadScan,
  type AdminActivityEvent,
  type AdminLead,
} from "@/lib/server/admin";
import { getAdminSession } from "@/lib/server/auth";
import type { LeadStatus } from "@/lib/types/database";

type Status = LeadStatus;
type Lead = AdminLead;

const statuses: Status[] = [
  "unverified",
  "verified",
  "scanned",
  "contacted",
  "consult_booked",
  "won",
  "lost",
  "opted_out",
];

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function adminInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase() || "AD";
}

const checkAdminAuth = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAdminSession();
  return { authenticated: session !== null };
});

const getAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  return loadAdminDashboard();
});

const getLeadActivity = createServerFn({ method: "GET" })
  .validator((leadId: string) => leadId)
  .handler(async ({ data: leadId }) => fetchLeadActivity(leadId));

const rerunScanFn = createServerFn({ method: "POST" })
  .validator((leadId: string) => leadId)
  .handler(async ({ data: leadId }) => {
    await rerunLeadScan(leadId);
    return { success: true } as const;
  });

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  beforeLoad: async () => {
    const { authenticated } = await checkAdminAuth();
    if (!authenticated) throw redirect({ to: "/admin/login" });
  },
  loader: () => getAdminDashboardData(),
  head: () => ({
    meta: [{ title: "Seenzo Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

// ---------- helpers ----------
const statusStyle: Record<Status, string> = {
  unverified: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  verified: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  scanning: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  scanned: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  contacted: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  consult_booked: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  lost: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  opted_out: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const statusLabel: Record<Status, string> = {
  unverified: "Unverified",
  verified: "Verified",
  scanning: "Scanning",
  scanned: "Scanned",
  contacted: "Contacted",
  consult_booked: "Consult booked",
  won: "Won",
  lost: "Lost",
  opted_out: "Opted out",
};

function scoreBand(score: number | null) {
  if (score == null) return "border-slate-500/30 bg-slate-500/10 text-slate-400";
  if (score >= 80) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (score >= 60) return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-rose-500/40 bg-rose-500/15 text-rose-300";
}

function grade(score: number | null) {
  if (score == null) return "—";
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

type SortKey =
  | "name"
  | "business"
  | "score"
  | "heatScore"
  | "status"
  | "createdAt"
  | "lastActivityAt";
type SortDir = "asc" | "desc";

function AdminPage() {
  const data = Route.useLoaderData();
  const [rows, setRows] = useState<Lead[]>(data.leads);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "lastActivityAt",
    dir: "desc",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const metrics = data.metrics;

  // Filter + sort
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.business.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    });
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[key] as string | number | null;
      const bv = b[key] as string | number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (key === "createdAt" || key === "lastActivityAt") {
        return (+new Date(av as string) - +new Date(bv as string)) * mul;
      }
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
    return out;
  }, [rows, query, statusFilter, sort]);

  const selected = rows.find((l) => l.id === selectedId) ?? null;

  // ESC closes drawer
  useEffect(() => {
    if (!selectedId && !confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDelete) setConfirmDelete(null);
        else setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, confirmDelete]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  async function updateStatus(id: string, status: Status) {
    setRows((r) =>
      r.map((l) => (l.id === id ? { ...l, status, lastActivityAt: new Date().toISOString() } : l)),
    );
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch {
      toast.error("Failed to update status. Please retry.");
    }
  }

  function updateNotesLocal(id: string, notes: string) {
    setRows((r) => r.map((l) => (l.id === id ? { ...l, notes } : l)));
  }

  async function deleteLead(id: string) {
    setRows((r) => r.filter((l) => l.id !== id));
    setConfirmDelete(null);
    if (selectedId === id) setSelectedId(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) throw new Error("Failed to delete lead");
    } catch {
      toast.error("Failed to delete lead. Please refresh.");
    }
  }

  function exportCSV() {
    const cols = [
      "ID",
      "Name",
      "Business",
      "Email",
      "Phone",
      "City",
      "Website",
      "Score",
      "HeatScore",
      "Status",
      "Created",
      "Last Activity",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      cols.join(","),
      ...visible.map((l) =>
        [
          l.id,
          l.name,
          l.business,
          l.email,
          l.phone,
          l.city,
          l.website,
          l.score ?? "",
          l.heatScore,
          l.status,
          l.createdAt,
          l.lastActivityAt,
        ]
          .map(esc)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `seenzo-leads-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 font-display text-lg font-black text-amber-950">
              S
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight">Seenzo Admin</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-400">by KlivIQ</div>
            </div>
            <span className="ml-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
              {adminInitials(data.adminEmail)}
            </div>
            <span className="text-sm text-slate-300">{data.adminEmail}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {/* Metric tiles */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Scans this week" value={metrics.scansThisWeek} delta="+18%" positive />
          <MetricTile
            label="Verification rate"
            value={`${metrics.verificationRate}%`}
            delta="+4%"
            positive
          />
          <MetricTile label="Avg score" value={metrics.avgScore} delta="-2" />
          <MetricTile
            label="Scan → Consult rate"
            value={`${metrics.consultRate}%`}
            delta="+7%"
            positive
          />
        </section>

        {/* Leads panel */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Leads</h2>
              <p className="text-sm text-slate-400">
                {visible.length} of {rows.length} shown
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, business, email"
                  className="w-64 rounded-lg border border-white/10 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
                className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
              >
                <option value="all">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <SortHeader
                    label="Name"
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onClick={() => toggleSort("name")}
                  />
                  <SortHeader
                    label="Business"
                    active={sort.key === "business"}
                    dir={sort.dir}
                    onClick={() => toggleSort("business")}
                  />
                  <SortHeader
                    label="Score"
                    active={sort.key === "score"}
                    dir={sort.dir}
                    onClick={() => toggleSort("score")}
                  />
                  <SortHeader
                    label="Heat"
                    active={sort.key === "heatScore"}
                    dir={sort.dir}
                    onClick={() => toggleSort("heatScore")}
                  />
                  <SortHeader
                    label="Status"
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onClick={() => toggleSort("status")}
                  />
                  <SortHeader
                    label="Created"
                    active={sort.key === "createdAt"}
                    dir={sort.dir}
                    onClick={() => toggleSort("createdAt")}
                  />
                  <SortHeader
                    label="Last activity"
                    active={sort.key === "lastActivityAt"}
                    dir={sort.dir}
                    onClick={() => toggleSort("lastActivityAt")}
                  />
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{l.name}</div>
                      <div className="text-xs text-slate-500">{l.city}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-200">{l.business}</div>
                      <div className="text-xs text-slate-500">{l.website}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold tabular-nums ${scoreBand(l.score)}`}
                      >
                        {l.score ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${l.heatScore}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-400">{l.heatScore}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect value={l.status} onChange={(v) => updateStatus(l.id, v)} />
                    </td>
                    <td className="px-5 py-3 text-slate-400">{relTime(l.createdAt)}</td>
                    <td className="px-5 py-3 text-slate-400">{relTime(l.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="px-5 py-16 text-center text-sm text-slate-500">
                No leads match your filters.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Drawer */}
      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelectedId(null)}
          onStatusChange={(s) => updateStatus(selected.id, s)}
          onNotesChange={(notes) => updateNotesLocal(selected.id, notes)}
          onDelete={() => setConfirmDelete(selected.id)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-white">Delete lead?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This permanently removes the lead and all associated activity. This action cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteLead(confirmDelete)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                <Trash2 className="h-4 w-4" /> Delete lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="font-display text-4xl font-extrabold tabular-nums text-white">{value}</div>
        {delta && (
          <div
            className={`text-xs font-semibold ${positive ? "text-emerald-400" : "text-slate-400"}`}
          >
            {delta} <span className="text-slate-500">vs last wk</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-5 py-3 text-left font-semibold">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition ${active ? "text-amber-300" : "hover:text-slate-200"}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </th>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        className={`appearance-none rounded-md border px-2.5 py-1 pr-6 text-xs font-semibold focus:outline-none ${statusStyle[value]}`}
      >
        {statuses.map((s) => (
          <option key={s} value={s} className="bg-slate-900 text-white">
            {statusLabel[s]}
          </option>
        ))}
      </select>
      <ArrowDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70" />
    </div>
  );
}

function LeadDrawer({
  lead,
  onClose,
  onStatusChange,
  onNotesChange,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (s: Status) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState(lead.notes);
  const [savedNote, setSavedNote] = useState<string | null>(lead.notes || null);
  const [rescanning, setRescanning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setNote(lead.notes);
    setSavedNote(lead.notes || null);
    let cancelled = false;
    getLeadActivity({ data: lead.id })
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lead.id, lead.notes]);

  function copy(v: string) {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1500);
  }

  async function rescan() {
    setRescanning(true);
    try {
      await rerunScanFn({ data: lead.id });
      setToastMsg("Scan queued");
    } catch {
      setToastMsg("Failed to queue scan");
    } finally {
      setRescanning(false);
      setTimeout(() => setToastMsg(null), 2200);
    }
  }

  async function saveNote() {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, notes: note }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      setSavedNote(note);
      onNotesChange(note);
      setToastMsg("Note saved");
    } catch {
      setToastMsg("Failed to save note");
    } finally {
      setTimeout(() => setToastMsg(null), 1800);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-slate-900 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">{lead.id}</div>
            <h3 className="mt-0.5 truncate font-display text-xl font-bold text-white">
              {lead.name}
            </h3>
            <div className="mt-1 truncate text-sm text-slate-400">{lead.business}</div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyle[lead.status]}`}
              >
                {statusLabel[lead.status]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Contact */}
          <Section title="Contact">
            <ContactRow
              label="Email"
              value={lead.email}
              copied={copied === lead.email}
              onCopy={() => copy(lead.email)}
            />
            <ContactRow
              label="Phone"
              value={lead.phone}
              copied={copied === lead.phone}
              onCopy={() => copy(lead.phone)}
            />
            <ContactRow
              label="Website"
              value={lead.website}
              copied={copied === lead.website}
              onCopy={() => copy(lead.website)}
            />
            <ContactRow label="City" value={lead.city} />
          </Section>

          {/* Scan summary */}
          <Section title="Scan summary">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <MiniDial score={lead.score} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-amber-950">
                    Grade {grade(lead.score)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-slate-300">{lead.verdict}</p>
                <Link
                  to="/r/$slug"
                  params={{ slug: lead.reportSlug }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
                >
                  Open full report <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section title="Status">
            <StatusSelect value={lead.status} onChange={onStatusChange} />
          </Section>

          {/* Activity */}
          <Section title="Activity">
            <ol className="relative space-y-4 border-l border-white/10 pl-5">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-amber-500" />
                  <div className="text-sm font-semibold text-white">{e.label}</div>
                  {e.detail && <div className="text-xs text-slate-400">{e.detail}</div>}
                  <div className="mt-0.5 text-xs text-slate-500">{relTime(e.at)}</div>
                </li>
              ))}
            </ol>
          </Section>

          {/* Notes */}
          <Section title="Notes">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add internal note…"
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {!note ? "Not saved" : savedNote === note ? "Saved" : "Unsaved changes"}
              </div>
              <button
                onClick={saveNote}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                Save note
              </button>
            </div>
          </Section>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-slate-950/40 p-4">
          <button
            onClick={rescan}
            disabled={rescanning}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            {rescanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {rescanning ? "Queuing…" : "Re-run scan"}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            <Trash2 className="h-4 w-4" />
            Delete lead
          </button>
        </div>

        {toastMsg && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-950 shadow-lg">
            {toastMsg}
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function ContactRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-200">{value}</div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function MiniDial({ score }: { score: number | null }) {
  const s = score ?? 0;
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (s / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#F59E0B"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-extrabold text-white tabular-nums">
        {score ?? "—"}
      </div>
    </div>
  );
}
