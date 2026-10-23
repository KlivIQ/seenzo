-- Direct sending from the outreach tool via Hostinger Agentic Mail.
-- Adds a transient 'sending' status (row lock), the Sent-folder UID used to thread follow-ups,
-- how the message was sent, and the last send error.

alter table public.outreach_messages
  add column if not exists sent_via text check (sent_via in ('manual', 'hostinger')),
  add column if not exists sent_uid int,
  add column if not exists sent_folder text,
  add column if not exists sending_started_at timestamptz,
  add column if not exists error text;

alter table public.outreach_messages drop constraint if exists outreach_messages_status_check;
alter table public.outreach_messages
  add constraint outreach_messages_status_check
  check (status in ('draft', 'sending', 'sent', 'skipped'));

create index if not exists outreach_messages_sent_at_idx
  on public.outreach_messages (sent_at) where status = 'sent';
