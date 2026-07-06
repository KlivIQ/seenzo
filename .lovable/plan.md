## New Route: `/admin` — Admin Dashboard (UI only)

Build the full admin UI with mock data. No auth, no backend wiring yet.

### Files

**Create `src/routes/admin.tsx`**
- `createFileRoute("/admin")` with `head()` setting title + `robots: noindex`.
- Self-contained dark-themed shell (matches the report page palette: `bg-slate-950`, amber accents) so it feels like the internal Seenzo tool rather than the marketing site.
- Local component state for search, status filter, sort column/direction, selected lead, and per-lead status/notes overrides.

**Create `src/lib/mock-admin.ts`**
- Exports `leads`: ~18 realistic Indian SMB leads (name, business, email, phone, city, website, score 0–100, heatScore 0–100, status, createdAt, lastActivityAt, reportSlug).
- Exports `activityFor(leadId)`: mock timeline events (scan requested, email verified, scan completed, report viewed, WhatsApp sent, etc.).
- `statuses` const array in canonical order for dropdowns and badge colours.

### UI structure

1. **Top bar** — "Seenzo Admin · by KlivIQ" left, mock user chip right (avatar + "admin@kliviq.com"). Note: "Preview UI — no auth yet." pill.

2. **Metric tiles (4-col grid, stacks on mobile)** — computed from mock data:
   - Scans This Week (count of leads with `scanned`/later status in last 7 days)
   - Verification Rate (verified+ / total, %)
   - Avg Score (mean of scored leads)
   - Scan→Consult Rate (consult_booked+won / scanned, %)
   Each tile: label, big number, small delta vs "last week" (mock ±%).

3. **Leads panel** (card):
   - Header row: title "Leads", search input (name/business/email), status filter `<select>`, "Export CSV" button top right (client-side Blob download of currently filtered rows).
   - Table with sortable headers (click to toggle asc/desc, arrow indicator): Name · Business · Score (colored badge amber/lime/rose by band) · Heat Score (small horizontal bar 0–100) · Status (inline `<select>` that updates local state) · Created (relative) · Last Activity (relative).
   - Row click opens the detail panel; the status `<select>` uses `stopPropagation` so changing status doesn't open the panel.
   - Empty state when filters yield no rows.

4. **Lead detail — slide-in drawer** (right side, ~480px, backdrop click closes; ESC also closes):
   - Header: name, business, status badge, close X.
   - Contact block: email, phone, website, city (each with copy-to-clipboard icon).
   - Scan summary: score dial (small SVG), grade, verdict line, "Open full report →" link to `/r/{reportSlug}`.
   - Activity timeline: vertical list with dots + timestamps.
   - Notes: textarea with "Save note" button (updates local state only).
   - Status dropdown (mirrors table).
   - Actions row: "Re-run Scan" (secondary) and "Delete Lead" (red). Delete opens a confirm dialog (native modal with cancel/confirm); on confirm, removes from local list and closes the drawer.

### CSV Export
- Client-side: build CSV from current filtered+sorted rows with columns matching the table (plus email/phone), escape quotes, trigger download via `Blob` + `URL.createObjectURL` as `seenzo-leads-YYYY-MM-DD.csv`. No new dependency.

### Behaviour details
- All mutations (status change, note save, delete, re-run) are optimistic local state only — no network calls.
- Re-run Scan shows a 1.5s spinner then a toast-style inline "Scan queued" message (local state, auto-hides).
- Sorting is stable; numeric columns sort numerically, dates by timestamp.
- Status badges: unverified=slate, verified=sky, scanned=amber, contacted=violet, consult_booked=lime, won=emerald, lost=rose.
- Score badges: ≥80 emerald, 60–79 amber, <60 rose.
- Drawer uses CSS transform transition; not a routed page (so `/admin` stays a single route).
- Route is `noindex` and not linked from the public nav — reachable by typing `/admin`.

### Out of scope
- Authentication / route protection.
- Real data fetching, RLS, edge functions.
- Server-side pagination (mock set is small).
- Bulk actions, saved views, column customization.
