## Two fixes

### 1. Resubmit the correct URL in Search Console
- Remove `https://www.seenzo.in/public/sitemap.xml`
- Add `https://www.seenzo.in/sitemap.xml`

(`/public` is the Vite source folder — files there are served from the site root, so `public/sitemap.xml` → `/sitemap.xml`.)

### 2. Fix `public/sitemap.xml` to use absolute URLs

Sitemaps require full `https://…` URLs in every `<loc>`. Update the file to:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.seenzo.in/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.seenzo.in/faq</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.seenzo.in/glossary</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.seenzo.in/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://www.seenzo.in/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>
```

Also add a `Sitemap:` line to `public/robots.txt`:

```
Sitemap: https://www.seenzo.in/sitemap.xml
```

After publishing, click "Rescan" in Search Console — status should flip to Success.

Confirm `https://www.seenzo.in` (with `www`) is your canonical domain — if you actually use the apex `https://seenzo.in`, I'll use that instead.
