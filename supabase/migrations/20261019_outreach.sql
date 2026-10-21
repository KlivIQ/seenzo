-- KlivIQ outreach tool (internal). Cold prospects are kept separate from the consented inbound `leads` table.
-- Service-role access only: RLS enabled with no policies, same as the other admin tables.

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null,
  website_url text,
  website_host text,
  city text,
  industry text,
  contact_name text,
  contact_email text,
  contact_phone text,
  linkedin_url text,
  source text not null default 'manual',
  product text not null default 'seenzo'
    check (product in ('seenzo', 'tryon', 'connect', 'consulting')),
  seenzo_score int,
  status text not null default 'new'
    check (status in ('new', 'drafted', 'sent', 'replied', 'booked', 'won', 'lost', 'do_not_contact')),
  notes text,
  followup_step int not null default 0,
  last_contacted_at timestamptz,
  next_followup_at timestamptz
);

create unique index if not exists outreach_prospects_email_uniq
  on public.outreach_prospects (lower(contact_email)) where contact_email is not null;
create unique index if not exists outreach_prospects_host_uniq
  on public.outreach_prospects (website_host) where website_host is not null;
create index if not exists outreach_prospects_status_idx on public.outreach_prospects (status);
create index if not exists outreach_prospects_followup_idx on public.outreach_prospects (next_followup_at);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'linkedin', 'whatsapp')),
  step int not null default 1,
  product text not null,
  subject text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'skipped')),
  sent_at timestamptz
);

create index if not exists outreach_messages_prospect_idx on public.outreach_messages (prospect_id);

alter table public.outreach_prospects enable row level security;
alter table public.outreach_messages enable row level security;
