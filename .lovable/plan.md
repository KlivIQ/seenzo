## Changes

### 1. Logo — "by KlivIQ" lockup
- Update `src/components/site/Logo.tsx` so the `full` variant always renders a small "by KlivIQ" line (uppercase, tracked, `text-[10px]` slate-500) directly under "seenzo", aligned to the wordmark (not the icon). Remove the `withTagline` toggle — it's default now.
- Regenerate `public/logo/seenzo-full-light.svg` and `seenzo-full-dark.svg` to include the "by KlivIQ" sub-line so downloaded/OG assets match.

### 2. Tagline "Get seen by AI"
- Add tagline as a pill/eyebrow above the hero H1 ("Get seen by AI").
- Add tagline in footer, directly under the footer logo.

### 3. Header nav
- Add **Home** (scrolls to `#top`) and **Benefits** (`#benefits`) to the primary nav, keeping existing items. Ensure the Benefits section has `id="benefits"`.

### 4. Pill text size +2
- Bump every "pill" / chip / eyebrow badge across the page from their current size (mostly `text-xs` / `text-[11px]`) up by ~2px (→ `text-sm` / `text-[13px]`). Applies to hero trust chips, section eyebrows, comparison tags, "Why India" chips, testimonial tags, FAQ tag, etc.

### 5. Form validation (mock stays)
- Form is currently a **mock** (console.info + toast, no backend). Keeping it mock this pass per your choice.
- Harden validation in `src/lib/scan-schema.ts` and `ScanForm.tsx`:
  - All 5 fields required (already are via zod).
  - Add `required` + `aria-invalid` + inline red border on error.
  - Trigger validation on blur and on submit (`mode: "onBlur"`).
  - Normalize website (auto-prefix `https://` before regex if missing) and phone (strip spaces).
  - Ensure empty submit shows all field errors at once and focuses the first invalid field.
- Add a small note under the button: "This is a demo form — submissions are not stored yet."

### 6. Footer
Rebuild footer with:
- Left: logo + "by KlivIQ" + tagline + short blurb.
- Middle: Quick links (Home, Benefits, How it works, FAQ, Request scan).
- Right: Legal — **Terms & Conditions**, **Privacy Policy**, **Refund Policy**, **Contact** (all `href="#"` for now).
- Social icons row: Facebook, Instagram, X, LinkedIn (lucide icons, `href="#"`, `aria-label`s).
- Bottom bar:
  - `© 2026 KlivIQ Technologies OPC Private Limited. All rights reserved.`
  - **Disclaimer (tiny, `text-[11px]` slate-400):** "Seenzo provides general AI-visibility insights based on public model behavior at the time of scanning. Results are indicative only and do not guarantee rankings, citations, traffic, or business outcomes across ChatGPT, Gemini, Perplexity, Claude or any other AI system."

## Out of scope
- Real form submission / lead storage (needs Lovable Cloud — skipped per your choice).
- Real Terms/Privacy page content (links point to `#`).
- Real social profile URLs (all `#`).
