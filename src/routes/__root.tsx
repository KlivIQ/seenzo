import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Seenzo - Get Seen By AI" },
      {
        name: "description",
        content:
          "Seenzo is India's AI Visibility platform. See exactly how ChatGPT, Gemini, Perplexity and Claude describe your business — and get a free AI Visibility Report with a prioritised fix list.",
      },
      { name: "author", content: "KlivIQ Technologies OPC Private Limited" },
      { name: "publisher", content: "KlivIQ Technologies OPC Private Limited" },
      { name: "theme-color", content: "#10B981" },
      {
        name: "keywords",
        content:
          "AI visibility, generative engine optimization, GEO, AEO, answer engine optimization, ChatGPT SEO, Gemini SEO, Perplexity SEO, Claude, AI search, LLM SEO, AI visibility report, India SEO, Indian businesses",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "format-detection", content: "telephone=no" },
      { httpEquiv: "content-language", content: "en-IN" },

      // Geo tags
      { name: "geo.region", content: "IN" },
      { name: "geo.country", content: "India" },
      { name: "geo.placename", content: "India" },
      { name: "ICBM", content: "20.5937, 78.9629" },

      // Open Graph
      { property: "og:site_name", content: "Seenzo" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_IN" },
      { property: "og:title", content: "Seenzo - Get Seen By AI" },
      {
        property: "og:description",
        content:
          "Free AI Visibility Report for Indian businesses. Find out how ChatGPT, Gemini, Perplexity and Claude describe you — and how to get found.",
      },
      { property: "og:url", content: "/" },

      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Seenzo - Get Seen By AI" },
      {
        name: "twitter:description",
        content:
          "See how ChatGPT, Gemini, Perplexity and Claude describe your business. Free AI Visibility Report for Indian businesses.",
      },
      { property: "og:image", content: "https://www.seenzo.in/seenzo-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Seenzo — Get seen by AI" },
      { name: "twitter:image", content: "https://www.seenzo.in/seenzo-og.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo/seenzo-icon-light.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "256x256" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "canonical", href: "/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "#organization",
              name: "Seenzo",
              legalName: "KlivIQ Technologies OPC Private Limited",
              url: "/",
              logo: "/logo/seenzo-full-light.svg",
              foundingDate: "2025",
              areaServed: "IN",
              address: {
                "@type": "PostalAddress",
                addressCountry: "IN",
              },
            },
            {
              "@type": "WebSite",
              "@id": "#website",
              name: "Seenzo",
              url: "/",
              inLanguage: "en-IN",
              publisher: { "@id": "#organization" },
            },
            {
              "@type": "SoftwareApplication",
              name: "Seenzo",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "AI Visibility platform that scans ChatGPT, Gemini, Perplexity and Claude to show how they describe your business.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
              },
            },
            {
              "@type": "LocalBusiness",
              name: "Seenzo by KlivIQ",
              url: "https://www.seenzo.in",
              email: "hello@kliviq.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Chennai",
                addressRegion: "Tamil Nadu",
                addressCountry: "IN",
              },
              telephone: "+919840497937",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
