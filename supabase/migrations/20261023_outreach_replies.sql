-- Reply detection for the outreach tool.
-- outreach_inbound: one row per inbound email from a known prospect (keyed by mailbox UID, so
-- processing is idempotent across webhook retries and manual "Check replies").
-- Only mail from prospects is stored; unrelated mail in the mailbox is never saved.

create table if not exists public.outreach_inbound (
  uid int primary key,
  prospect_id uuid references public.outreach_prospects (id) on delete cascade,
  received_at timestamptz not null default now(),
  from_email text not null,
  subject text,
  snippet text,
  kind text not null check (kind in ('reply', 'opt_out', 'bounce', 'auto_reply'))
);

create index if not exists outreach_inbound_prospect_idx on public.outreach_inbound (prospect_id);

alter table public.outreach_prospects
  add column if not exists last_reply_at timestamptz,
  add column if not exists last_reply_snippet text,
  add column if not exists last_reply_kind text;

alter table public.outreach_inbound enable row level security;
