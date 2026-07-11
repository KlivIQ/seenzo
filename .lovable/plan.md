## Add /faq and /glossary pages (keep FAQ on homepage)

### 1. Extract FAQ data
Create `src/lib/faq-data.ts` exporting a shared `faqs` array (question + answer). Add one new item:
- **"What's the difference between SEO, GEO and AEO?"** — plain-English answer: SEO = ranking on Google's blue links; GEO (Generative Engine Optimization) = getting cited inside ChatGPT/Gemini/Perplexity/Claude answers; AEO (Answer Engine Optimization) = structuring content so answer engines (voice assistants, featured snippets, AI overviews) can extract direct answers. Note Seenzo focuses on GEO + AEO for Indian businesses.

### 2. Update homepage FAQ section
In `src/routes/index.tsx`, replace the inline FAQ array with an import from `faq-data.ts`. Section stays visually identical. Add a small "View all FAQs →" link under the section pointing to `/faq`.

### 3. Create `/faq` page (`src/routes/faq.tsx`)
- Uses `SiteShell` for header/footer consistency.
- `head()` with unique title "FAQ — Seenzo AI Visibility", meta description, og tags.
- Renders the same `faqs` array as accessible accordion (`<details>`), grouped visually with intro copy.
- JSON-LD `FAQPage` schema for SEO/AI ingestion.

### 4. Create `/glossary` page (`src/routes/glossary.tsx`)
- Uses `SiteShell`.
- `head()`: title "AI Search Glossary for Indian Startups & SMBs — Seenzo", meta description targeting "AI search, GEO, AEO, SEO, LLM optimization, ChatGPT SEO India".
- Intro paragraph: "Plain-English definitions of the terms Indian founders and small business owners need when starting with AI search and visibility."
- Alphabetical `<dl>` list of ~20–25 terms, each with an H2/`<dt>` (term) and 2–4 sentence `<dd>` (definition) that naturally uses target phrases. Terms to include:
  - AEO (Answer Engine Optimization)
  - AI Overviews (Google SGE)
  - AI Visibility Score
  - Anthropic Claude
  - Bing Copilot
  - ChatGPT Search
  - Citation (in AI answers)
  - Crawlability
  - DPDP Act 2023
  - Entity SEO
  - Featured Snippet
  - Gemini (Google)
  - Generative AI
  - GEO (Generative Engine Optimization)
  - GST (as a trust signal)
  - Hallucination
  - Knowledge Graph
  - LLM (Large Language Model)
  - LLMs.txt
  - Local SEO (India)
  - Perplexity
  - Prompt
  - RAG (Retrieval-Augmented Generation)
  - Schema Markup / Structured Data
  - SEO (Search Engine Optimization)
  - Zero-Click Search
- JSON-LD `DefinedTermSet` schema listing each term, so AI crawlers and Google can ingest definitions.
- Internal link to `/` and `/faq` in a closing "See how your business scores" CTA.

### 5. Wire up navigation & discoverability
- Add `Glossary` and `FAQ` links to the footer "Resources" / "Company" column in `src/routes/index.tsx`, `privacy.tsx`, `terms.tsx` (wherever the footer lives — likely `SiteShell`).
- Update `public/sitemap.xml` to add `/faq` and `/glossary`.
- Update `public/llms.txt` to list both new pages under Core pages.

### Out of scope
- No design/layout changes to existing pages beyond adding two footer links and the "View all FAQs" link.
- No changes to the homepage FAQ visual style.
- No backend or form changes.
