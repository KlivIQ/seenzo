-- DM queue for the outreach tool: Instagram as a channel, plus an Instagram handle per prospect.
-- Instagram, WhatsApp and LinkedIn messages are sent by hand (no automation), so there is no
-- sending state here: a DM is recorded as a normal outreach_messages row once Sri has sent it.

alter table public.outreach_prospects
  add column if not exists instagram_handle text;

create unique index if not exists outreach_prospects_instagram_uniq
  on public.outreach_prospects (lower(instagram_handle)) where instagram_handle is not null;

alter table public.outreach_messages
  drop constraint if exists outreach_messages_channel_check;
alter table public.outreach_messages
  add constraint outreach_messages_channel_check
  check (channel in ('email', 'linkedin', 'whatsapp', 'instagram'));
