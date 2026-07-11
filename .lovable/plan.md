## SEO visibility fixes

### 1. LocalBusiness schema (sitewide)
Edit `src/routes/__root.tsx` — append a `LocalBusiness` node to the existing `@graph` JSON-LD block, using the exact fields you provided (Chennai, TN, IN, +919840497937, hello@kliviq.com).

### 2. BreadcrumbList schema (per page)
Add a `BreadcrumbList` JSON-LD `scripts` entry to each leaf route's `head()`:
- `/about`, `/faq`, `/glossary`, `/privacy`, `/terms`, `/blog`, `/blog/what-is-ai-visibility`
- Homepage `/` gets a single-item Home breadcrumb.
Each breadcrumb uses absolute `https://www.seenzo.in/...` URLs.

### 3. Visible phone number in footer
Edit `src/components/site/SiteShell.tsx` — under the **Company** column, add a `tel:+919069026969` link showing `+91 90690 26969` (WhatsApp) below the India line. Also add it to the homepage footer in `src/routes/index.tsx` for consistency.

### 4. og:image meta tag
No OG image exists in `/public` yet. I'll generate a branded 1200×630 image (Seenzo logo + tagline "Get seen by AI" on brand emerald background) and save it as `public/seenzo-og.png`. Then add to `src/routes/__root.tsx` head meta:
- `og:image` → `https://www.seenzo.in/seenzo-og.png`
- `og:image:width` `1200`, `og:image:height` `630`
- `twitter:image` → same URL

Per platform guidance, `og:image` should live on leaf routes, not root — but since you want it sitewide as a default and no per-page images are defined, putting it in root is acceptable here; leaf pages can override later.

### 5. Blog section at /blog
Create two new routes, no backend:
- `src/routes/blog/index.tsx` — index listing one post card linking to the post. Title "Blog — Seenzo", description, `Blog` JSON-LD, BreadcrumbList.
- `src/routes/blog/what-is-ai-visibility.tsx` — full post, ~350–400 words, semantic `<article>` with H1, H2 subheads, author "Sriram Ramkumar", date today (2026-07-11). Head meta: title, description, `og:type: article`, canonical, `Article` JSON-LD (headline, author Person, datePublished, publisher Organization), BreadcrumbList.
- Add "Blog" link to header nav and footer Product column in `SiteShell.tsx` and the homepage `NavBar` in `src/routes/index.tsx`.
- Add both URLs to `public/sitemap.xml`.

Post outline (300+ words):
1. What is AI Visibility (ChatGPT/Gemini/Perplexity/Claude answer engines)
2. Why it matters for Indian businesses (buyers asking AI, not just Googling)
3. How it differs from SEO (retrieval vs ranking, citations vs clicks)
4. What to fix first (structured data, entity clarity, India-specific signals like GST, directory presence)
5. CTA linking to `/` for a free scan

### Files changed
- `src/routes/__root.tsx` — LocalBusiness in graph, og:image + twitter:image
- `src/components/site/SiteShell.tsx` — phone in footer, Blog nav link
- `src/routes/index.tsx` — phone in footer, Blog nav link
- `src/routes/about.tsx`, `faq.tsx`, `glossary.tsx`, `privacy.tsx`, `terms.tsx` — BreadcrumbList JSON-LD
- `src/routes/blog/index.tsx` (new)
- `src/routes/blog/what-is-ai-visibility.tsx` (new)
- `public/seenzo-og.png` (new, generated)
- `public/sitemap.xml` — add /blog urls

### Not touched
Backend files (`src/lib/server/**`, `src/lib/inngest/**`, `src/routes/api/**`), `ScanForm.tsx`, scan schema, scoring engine.
