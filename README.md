# Seenzo

**Seenzo — Get seen by AI.**

A free AI Visibility Report platform built for Indian businesses. Seenzo shows you how ChatGPT, Gemini, Perplexity and Claude describe your business, surfaces what is hurting your visibility, and gives you a prioritised fix list to improve your AI search presence.

> **Status:** Coming soon. The site currently shows a "Coming soon" overlay while the final product is being prepared.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [SEO & GEO](#seo--geo)
- [Legal & Disclaimer](#legal--disclaimer)
- [License](#license)

---

## Overview

Search behaviour is changing: a growing share of buying decisions in India now starts with an AI-generated answer instead of a traditional search engine. Seenzo helps businesses understand and improve their presence inside AI answers.

The application is a landing page + lead-capture experience that includes:

- Hero section with trust signals and CTA
- AI Visibility Score explainer
- Sample report preview
- Benefits, features, comparison, testimonials, FAQ
- Free scan request form with client-side validation
- Responsive footer with legal links and social icons
- Full-screen "Coming soon" overlay (active until launch)

---

## Features

- **AI Visibility Report preview** — sample score + per-model breakdown
- **Free scan request form** — validated with Zod + react-hook-form (currently demo-only, no backend storage)
- **Responsive design** — mobile-first, built with Tailwind CSS v4
- **SEO / GEO metadata** — structured data, Open Graph, Twitter/X cards, robots, sitemap
- **Accessible UI** — Radix UI primitives, ARIA labels, keyboard-friendly interactions
- **Animations** — marquee, scroll reveals, score counters, and a breathing "Coming soon" overlay

---

## Tech Stack

| Layer         | Technology                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Framework     | [TanStack Start](https://tanstack.com/start/) v1 + [TanStack Router](https://tanstack.com/router/) |
| UI Library    | React 19                                                                                           |
| Language      | TypeScript 5 (strict mode)                                                                         |
| Styling       | Tailwind CSS v4 + `tw-animate-css`                                                                 |
| Components    | shadcn/ui + Radix UI primitives                                                                    |
| Forms         | react-hook-form + Zod + `@hookform/resolvers`                                                      |
| Icons         | lucide-react                                                                                       |
| Charts        | recharts                                                                                           |
| Build Tool    | Vite 8                                                                                             |
| Lint / Format | ESLint 9 + Prettier 3                                                                              |

### Server runtime

The project targets an edge-compatible serverless runtime (TanStack Start / Cloudflare Workers). Server-side code must avoid Node-only APIs such as `child_process`, `sharp`, `fs.watch`, and dynamic filesystem access. Use standard Web APIs, `fetch`, and pure-JS packages instead.

---

## Project Structure

```text
.
├── public/                  # Static assets, logos, favicon, robots, sitemap
├── src/
│   ├── components/
│   │   ├── site/            # Page-specific components (Logo, ScanForm)
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Shared React hooks
│   ├── lib/                 # Utilities, schemas, error handling
│   ├── routes/              # TanStack file-based routes
│   │   ├── __root.tsx       # Root layout + head metadata
│   │   └── index.tsx        # Homepage / landing page
│   ├── router.tsx           # Router configuration
│   ├── server.ts            # Server entry point
│   ├── start.ts             # TanStack Start middleware
│   └── styles.css           # Global styles + Tailwind v4 theme
├── .lovable/                # Lovable project metadata
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+

### Install dependencies

```bash
bun install
```

### Run the development server

```bash
bun dev
```

The dev server will start at `http://localhost:8080`.

---

## Available Scripts

| Script      | Command             | Description                          |
| ----------- | ------------------- | ------------------------------------ |
| Dev         | `bun dev`           | Start Vite development server        |
| Build       | `bun run build`     | Production build                     |
| Build (dev) | `bun run build:dev` | Development build                    |
| Preview     | `bun run preview`   | Preview the production build locally |
| Lint        | `bun run lint`      | Run ESLint                           |
| Format      | `bun run format`    | Format code with Prettier            |

---

## Environment Variables

No runtime environment variables are required for the current demo-only landing page. When the backend is implemented, secrets should be managed through Lovable Cloud / Supabase and never committed to the repository.

---

## Deployment

This project is configured for Lovable Cloud hosting. The production build is produced by `vite build` and can be previewed with `vite preview`.

---

## SEO & GEO

The site includes:

- `<title>` and `<meta name="description">`
- Open Graph and Twitter/X card tags
- JSON-LD structured data (`Organization`, `WebSite`, `SoftwareApplication`)
- `robots.txt` with friendly directives for AI crawlers
- `sitemap.xml`
- `theme-color`, `geo.region`, `ICBM`, and content-language hints

---

## Legal & Disclaimer

Seenzo is a product of **KlivIQ Technologies OPC Private Limited**.

> Seenzo provides general AI-visibility insights based on public model behavior at the time of scanning. Results are indicative only and do not guarantee rankings, citations, traffic, or business outcomes across ChatGPT, Gemini, Perplexity, Claude or any other AI system.

Footer links for Terms & Conditions, Privacy Policy, and Contact are placeholders (`#`) until the real pages are published.

---

## License

Proprietary — KlivIQ Technologies OPC Private Limited. All rights reserved.
