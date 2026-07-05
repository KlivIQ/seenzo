# Seenzo Marketing Site — Build Plan

A premium, light-themed, single-page marketing site for Seenzo (AI Visibility Platform by KlivIQ Technologies OPC Private Limited), built with the existing TanStack Start + React + TypeScript + Tailwind v4 stack.

## Design direction

- Light/white background throughout, deep neutral text, one restrained accent (deep indigo/violet) plus a warm signal color for score highlights.
- Typography: Instrument Serif (display) + Inter (body) via `<link>` in `__root.tsx`, wired through `@theme` tokens in `src/styles.css`.
- Generous whitespace, hairline borders, soft shadows, no glassmorphism, no robot/brain/circuit imagery.
- Motion: subtle fade/slide-up on scroll, gentle hover lifts, animated AI Visibility Score gauge and animated sample-report bars. Uses Tailwind keyframes already available + a small IntersectionObserver hook — no heavy libs.
- Fully responsive, mobile-first, semantic HTML, strong SEO metadata.

## Logo assets

Generate a Seenzo identity (wordmark + "eye/scan" mark) and export to `/public/logo/`:

- `seenzo-full-light.svg` / `.png` (dark ink on light)
- `seenzo-full-dark.svg` / `.png` (light ink on dark)
- `seenzo-icon-light.svg` / `.png`
- `seenzo-icon-dark.svg` / `.png`
- `seenzo-full-transparent.png`, `seenzo-icon-transparent.png`
- 1x / 2x PNG at high resolution; all SVGs hand-authored (no raster embed), transparent backgrounds.
- Favicon updated to Seenzo mark.

## Page structure (single route: `/`)

All sections live in `src/routes/index.tsx` composed of components under `src/components/site/`:

1. **NavBar** — logo, anchor links, primary CTA "Get Free Scan".
2. **Hero** — original headline (e.g. "See how AI sees your business."), sub-headline, animated visibility-score orb, dual CTA (primary → scan form, secondary → How it works). Trust chips: "No contracts · No 12-month lock-ins · Built for Indian businesses".
3. **TrustedBy** — muted logo strip placeholder (grayscale text marks).
4. **WhyAIVisibility** — 3–4 stat cards explaining the shift from search to AI answers.
5. **HowItWorks** — 3 steps: Submit URL → We scan across AI engines → Get your report + action plan.
6. **VisibilityScore** — animated 0–100 gauge with pillar breakdown (Presence, Accuracy, Sentiment, Citations).
7. **SampleReport** — mock report card with animated bars, model coverage (ChatGPT, Gemini, Perplexity, Claude, Copilot), sample recommendations.
8. **Features** — 6-card grid of capabilities.
9. **Benefits** — outcome-oriented list with icons.
10. **Comparison** — side-by-side table: Traditional SEO vs AI Visibility.
11. **WhyIndia** — India-specific positioning (regional queries, INR pricing tone, local-context tuning) — copy only, no flags/clichés.
12. **Testimonials** — 3 placeholder quote cards ("Coming soon" tastefully handled).
13. **FAQ** — accordion (uses existing shadcn `accordion`).
14. **FinalCTA** — large centered scan-form module (Name, Business Name, Email, Phone, Website URL) with zod validation and "Get Free AI Visibility Report" button. Submit stores to local state and shows a success toast (no backend requested).
15. **Footer** — logo + single line: `© 2026 KlivIQ Technologies OPC Private Limited. All rights reserved.`

## Form

- `react-hook-form` + `zod` schema (name, business, email, phone `+91` friendly, URL).
- Client-side validation, accessible labels, inline errors, success state.
- No backend integration in this build (user did not request Cloud); noted as a next step if they want lead capture persisted.

## Metadata & SEO

- `__root.tsx` head updated: title "Seenzo — See how AI sees your business", description, og/twitter tags, canonical.
- Semantic landmarks, single H1, alt text, `prefers-reduced-motion` respected.
- Update `<title>` fallback and favicon; remove any "Lovable" strings from templates/comments/metadata.

## De-Lovable pass

- Scrub Lovable references from `index.tsx` placeholder, `__root.tsx` meta, `README`-style comments in routes, and any visible strings. Internal error-reporting utility keeps its function but no user-visible mention.

## Files to add / modify

- Modify: `src/routes/__root.tsx` (meta, font link, favicon), `src/routes/index.tsx` (compose sections), `src/styles.css` (font tokens, accent color, keyframes).
- Add: `src/components/site/{NavBar,Hero,TrustedBy,WhyAIVisibility,HowItWorks,VisibilityScore,SampleReport,Features,Benefits,Comparison,WhyIndia,Testimonials,FAQ,ScanForm,Footer}.tsx`, `src/components/site/ScoreGauge.tsx`, `src/hooks/use-in-view.ts`, `src/lib/scan-schema.ts`.
- Add: `/public/logo/*` assets + updated `/public/favicon.ico` (or `favicon.svg`).

## Out of scope (flag to user after build)

- Persisting form submissions (needs Lovable Cloud).
- Real customer logos/testimonials (placeholders shown).
- Analytics wiring.
