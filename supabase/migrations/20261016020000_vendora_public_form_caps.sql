-- ============================================================================
-- VENDORA Batch 66 — public-form length caps + anon default-privilege fix
-- Idempotent: safe to run twice.
--
-- Why: the three public insert surfaces (contact_messages,
-- newsletter_subscribers, error_logs) accept anonymous rows with
-- `with check (true)` and NO length limits — a script could fill the
-- database with giant rows. These tables are insert-only for the public
-- (no read-back policy), so the risk is storage abuse, not data leaks.
-- The caps match what the client already sends: the public-forms API
-- validates to the same numbers, and error-reporter.ts already slices
-- message to 2000 and stack to 8000 chars before insert.
--
-- Also: the project-wide default privileges hand every FUTURE table a
-- SELECT grant to anon automatically. RLS still protects the data, but a
-- future table created without RLS would be publicly readable. Revoking
-- the default means new tables get no anon grant unless one is added on
-- purpose. Existing tables keep their current grants.
-- ============================================================================

-- 1. contact_messages caps -------------------------------------------------
alter table public.contact_messages drop constraint if exists contact_messages_name_len;
alter table public.contact_messages
  add constraint contact_messages_name_len check (char_length(name) between 1 and 120);

alter table public.contact_messages drop constraint if exists contact_messages_email_len;
alter table public.contact_messages
  add constraint contact_messages_email_len check (char_length(email) between 3 and 254);

alter table public.contact_messages drop constraint if exists contact_messages_topic_len;
alter table public.contact_messages
  add constraint contact_messages_topic_len check (char_length(topic) between 1 and 80);

alter table public.contact_messages drop constraint if exists contact_messages_order_ref_len;
alter table public.contact_messages
  add constraint contact_messages_order_ref_len
  check (order_ref is null or char_length(order_ref) <= 64);

alter table public.contact_messages drop constraint if exists contact_messages_message_len;
alter table public.contact_messages
  add constraint contact_messages_message_len check (char_length(message) between 1 and 4000);

-- 2. newsletter_subscribers cap -------------------------------------------
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_email_len;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_email_len check (char_length(email) between 3 and 254);

-- 3. error_logs caps ---------------------------------------------------------
alter table public.error_logs drop constraint if exists error_logs_message_len;
alter table public.error_logs
  add constraint error_logs_message_len check (char_length(message) <= 2000);

alter table public.error_logs drop constraint if exists error_logs_stack_len;
alter table public.error_logs
  add constraint error_logs_stack_len check (stack is null or char_length(stack) <= 8000);

alter table public.error_logs drop constraint if exists error_logs_route_len;
alter table public.error_logs
  add constraint error_logs_route_len check (route is null or char_length(route) <= 500);

alter table public.error_logs drop constraint if exists error_logs_user_agent_len;
alter table public.error_logs
  add constraint error_logs_user_agent_len check (user_agent is null or char_length(user_agent) <= 500);

-- 4. Future tables: no automatic anon SELECT --------------------------------
alter default privileges in schema public revoke select on tables from anon;
