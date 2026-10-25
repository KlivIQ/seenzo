-- Website audit for outreach prospects: how much does their site need a redo?
-- audit_score   = Seenzo SEO / AI-search score (0-100, higher is better)
-- redo_score    = how much the site needs work (0-100, higher = better prospect)
-- audit_verdict = target | maybe | skip (skip = site is already modern, do not contact)

alter table public.outreach_prospects
  add column if not exists audit_score int,
  add column if not exists redo_score int,
  add column if not exists audit_verdict text
    check (audit_verdict in ('target', 'maybe', 'skip')),
  add column if not exists audit_findings jsonb,
  add column if not exists audited_at timestamptz;

create index if not exists outreach_prospects_verdict_idx
  on public.outreach_prospects (audit_verdict);

-- New pitch: "Website and AI" (rebuild old websites, add WhatsApp enquiry and AI assistants).
alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_product_check;
alter table public.outreach_prospects
  add constraint outreach_prospects_product_check
  check (product in ('seenzo', 'tryon', 'connect', 'consulting', 'webredo'));
