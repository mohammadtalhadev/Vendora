-- ============================================================================
-- VENDORA — public form inboxes: newsletter subscribers + contact messages
-- Run in the Supabase SQL editor (like the Batch 10/21/23 migrations).
-- Idempotent: safe to run twice.
--
-- Why: the footer newsletter and the contact page used to pretend to accept
-- submissions — the newsletter showed a success state and discarded the
-- email, and the contact form only composed a mailto: link. These two tables
-- give both forms a real destination.
--
-- What it does: two append-only inboxes.
--   * newsletter_subscribers — one row per email (unique on lower(email),
--     so case variants of the same address collide and the client can
--     answer "already subscribed" from the unique violation).
--   * contact_messages — one row per message sent from the contact page.
-- RLS is insert-only for the public: anon and authenticated callers may add
-- a row, but NO select/update/delete policy exists for them, so the inboxes
-- cannot be read back through the API. Staff read them in the Table Editor
-- (service role bypasses RLS), never from the client.
-- No extensions needed: case-insensitive uniqueness uses a lower() index.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_lower_key
  on public.newsletter_subscribers (lower(email));

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  order_ref text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists newsletter_subscribers_insert_public on public.newsletter_subscribers;
create policy newsletter_subscribers_insert_public on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (true);

grant insert on public.newsletter_subscribers to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
