## Changes

All edits are in `src/routes/index.tsx` and `src/components/site/ScanForm.tsx`. Layout, colours, animations and fonts stay untouched.

### 1. Replace `TrustedBy` marquee (index.tsx)
Rewrite the `TrustedBy` component body to render a single centered line inside the same `<section>` wrapper (same padding, border, background):
- Text: **"Used by early testers across Chennai, Bengaluru and Pune"**
- Keep the current caption typography style so it visually matches the removed eyebrow.

### 2. Replace `Testimonials` cards (index.tsx)
Replace the three testimonial cards (Aditi R., Vikram S., Dr. Meera K.) inside the existing `Testimonials` section with a single centered placeholder block:
- Text: **"Early results coming soon — be one of our first 50 scans"**
- Keep the section wrapper, eyebrow, and heading area intact so section rhythm is preserved.

### 3. Replace unsourced stats in `WhyItMatters` (index.tsx)
Remove the three stat cards ("1 in 3", "72%", "0"). Replace with a single centered statement card/paragraph:
- Text: **"Most Indian business websites are invisible to AI engines. Yours might be too."**
- Keep the `SectionHeader` above it unchanged.

### 4. Footer link fixes (index.tsx)
- Update `legalLinks`: **Terms → `/terms`**, **Privacy Policy → `/privacy`** (Contact stays `#` for now — user didn't specify).
- Update social icon `href`s to real profile URLs with handle `seenzo`:
  - Facebook → `https://facebook.com/seenzo`
  - Instagram → `https://instagram.com/seenzo`
  - X → `https://x.com/seenzo`
  - LinkedIn → `https://linkedin.com/company/seenzo`
- Add `target="_blank"` and `rel="noopener noreferrer"` on social icons.

Note: `/terms` and `/privacy` routes don't exist yet — the plan explicitly leaves them as dead links per the user's "we will build these pages next".

### 5. Hero credit line (index.tsx)
In the `Hero` component, directly under the wordmark/H1 area (below the H1, above the subheading paragraph), add:
- **"Built by KlivIQ Technologies · 20+ years enterprise IT · kliviq.com"**
- Small muted text, `kliviq.com` linked to `https://kliviq.com` (new tab). Uses existing slate-500 / text-sm style already in the hero to avoid new visual tokens.

### 6. ScanForm submit UX (ScanForm.tsx)
The button already shows a `Loader2` spinner + "Queuing your scan…" while `isSubmitting` — that satisfies "loading state when clicked". Additionally:
- Add a new helper line **below the button** (above/replacing the existing tiny helper text stack? — will be added as an additional line, keeping existing copy intact):
  - **"We'll verify your email before running the scan"**
  - Same muted style as existing helper lines so nothing visually shifts.

## Out of scope
- Building `/terms` and `/privacy` pages (user said "next").
- Any real email verification flow — the form stays a mock; only the copy is added.
- Any layout, colour, animation, or font changes.
