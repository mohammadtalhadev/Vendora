-- ============================================================================
-- VENDORA — keep profiles.email in step with the auth email
-- Run in the Supabase SQL editor (like the Batch 10/21 migrations). Idempotent:
-- safe to run twice.
--
-- Why: `profiles.email` is written once at signup (handle_new_user) and is
-- pinned afterwards — `profiles_update_self` deliberately does not let the
-- owner rewrite it, because the login credential lives in auth.users and the
-- two must not desync (see the note on updateProfileIdentity in the client).
-- A customer email change goes through `supabase.auth.updateUser({ email })`
-- and takes effect in auth.users only once the confirmation link sent to the
-- NEW address is opened. Without this trigger the profile row — which is what
-- the app displays and what admin tooling reads — would keep showing the old
-- address forever after such a change.
--
-- What it does: after an auth.users row's email actually changes, copy the
-- new value onto that same user's profiles row. One column, one row, fired
-- only on a real change. SECURITY DEFINER mirrors handle_new_user: the write
-- must not depend on the caller's RLS rights, and it can only ever touch the
-- row whose auth email just changed.
-- ============================================================================

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
