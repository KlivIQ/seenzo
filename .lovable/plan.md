## New Route: `/r/$slug` — Seenzo Scan Report

Create a dynamic report page with full UI and mock data. Uses existing dark theme, `SiteShell` for header/footer, and amber (#F59E0B) accent.

### Files

**Create `src/routes/r.$slug.tsx`**
- `createFileRoute("/r/$slug")` with `head()` setting report-specific title/description + `robots: noindex` (report pages shouldn't be indexed).
- Reads `slug` via `Route.useParams()` (unused for now — mock data is static; wired later).
- Renders inside `<SiteShell>` so nav + footer match the site.

**Create `src/components/report/` (small, focused components)**
- `ReportHeader.tsx` — Seenzo logo + "by KlivIQ", business name, URL scanned, scan date.
- `ScoreDial.tsx` — animated SVG circular dial (0–100), amber stroke, grade badge (A/B/C/D/F), one-line verdict.
- `CategoryBars.tsx` — six horizontal bars (Crawlability, Structured Data, Metadata, Content Quality, India Presence, Trust Signals) with pass (emerald) / partial (amber) / fail (rose) coding.
- `PriorityFixes.tsx` — numbered list of top 5 fixes; each has title, description, effort badge (Quick Win / 2–3 Days / 1 Week), projected score impact (+N).
- `ProjectedScore.tsx` — current vs projected score side-by-side with an arrow.
- `CheckAppendix.tsx` — collapsible `<details>` per category listing all 30 checks with pass/partial/fail icons + evidence text.
- `ReportCTA.tsx` — amber background block with "Book your free 20-min consultation" (→ https://cal.com) and WhatsApp button (→ https://wa.me/919840497937).
- `PrintButton.tsx` — button calling `window.print()`; hidden in print.

**Create `src/lib/mock-report.ts`**
- Exports a realistic mock report: business "Anand Sweets", URL "anandsweets.in", date, overall score 62, grade "C", six category scores, 5 prioritized fixes, projected score 84, and 30 individual checks grouped by category with pass/partial/fail + evidence strings.

**Edit `src/styles.css`**
- Add `@media print` block: hide `nav`, `footer`, `.no-print` (CTA, print button, coming-soon overlay); force light background, black text, remove shadows, expand collapsibles.

### Behaviour details
- Score dial animates from 0 to target on mount (CSS transition on `stroke-dashoffset`).
- Category bars animate width from 0 to value on mount.
- All CTA/print controls carry `className="no-print"`.
- Report body carries `className="print:bg-white print:text-black"` plus the print stylesheet.
- Page uses responsive grid: single column mobile, 2-col grid for dial + verdict on md+.

### Out of scope
- Real data wiring (loader, DB, scan pipeline).
- PDF generation beyond `window.print()`.
- Auth / access control on report URLs.
