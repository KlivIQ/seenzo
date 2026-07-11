## Plan: Add a contact section to the Seenzo landing page

### What we’ll do
Add a new, self-contained **Contact** section at the bottom of the homepage (after the FAQ section and before the existing footer). No other sections, components, or pages will be changed.

### Scope
- **Only file changed:** `src/routes/index.tsx`
- **No changes to:** `SiteShell.tsx`, `ScanForm.tsx`, `styles.css`, any other routes, or any other files.

### Section design
- Insert `<Contact />` between `<FAQ />` and `<Footer />` in the main `Index` component.
- Use the existing `Section` primitive so padding, width, and font behavior stay consistent with the rest of the page.
- The contact card itself will be highlighted with the brand emerald / "zo" color from the Seenzo logo (`bg-brand`) and white text.
- Add `id="contact"` so the section can be linked directly if needed later.

### Contact card content
| Item | What’s shown | Link behavior |
|------|--------------|---------------|
| Email | `hello@kliviq.com` | `mailto:hello@kliviq.com?subject=Seenzo%20inquiry` — opens the user’s default email app with a pre-filled subject line |
| Phone / WhatsApp | `+91 90690 26969 (WhatsApp only)` | `https://wa.me/919069026969` — opens a new WhatsApp chat on mobile and WhatsApp Web on desktop |
| KlivIQ Instagram | Instagram icon | `https://instagram.com/kliviq` (new tab) |
| KlivIQ Twitter/X | Twitter/X icon | `https://x.com/kliviq` (new tab) |
| kliviq.com | Globe icon | `https://kliviq.com` (new tab) |
| Company | `KlivIQ Technologies OPC Private Limited` | — |

### Icons
- Reuse existing imports: `Instagram`, `Twitter`, `Globe2`.
- Add two new imports from `lucide-react`: `Mail` (for email) and `Phone` (for WhatsApp).

### Note on footer link
The existing footer has a `Contact` link pointing to `#`. We will **not** change it to keep the scope exactly as requested; if you want it to scroll to this new section afterward, just let us know and we can point it to `#contact` in a follow-up.

Please confirm and I’ll implement it.