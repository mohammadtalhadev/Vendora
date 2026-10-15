-- ============================================================================
-- Vendora Batch 86: TEMPORARY per-account MFA testing exemption.
--
-- While the owner tests the staff consoles, named staff accounts may be
-- excused the second factor Batch 64 made mandatory. An account is exempt
-- exactly while a row naming it exists in `public.mfa_exemptions`; deleting
-- the row restores full MFA for that account, and dropping the table (plus
-- the Batch 86 client checks) removes the feature entirely. This is a
-- testing convenience, NOT a product feature: it must not survive launch.
--
-- The table is deliberately unreachable from the app:
--
--   1. The table is created EMPTY and RLS is enabled with NO policies at
--      all - not for select, not for insert, not for anyone. Writes happen
--      only where RLS does not apply: the SQL editor / service role. No
--      client, admin included, can read, grant, or revoke an exemption, so
--      a compromised console session cannot excuse itself.
--   2. The only reader is `public.is_mfa_exempt()`, a SECURITY DEFINER
--      function that answers solely about the CALLER (auth.uid()): it takes
--      no account argument, so no one can probe whether some other account
--      is exempt. The function's owner bypasses the policy-less RLS, which
--      is precisely why it must never accept an identifier.
--   3. The client fails CLOSED around it (see features/auth/api/mfa): an RPC
--      error or a missing migration reads as NOT exempt, so deploying this
--      code before (or after the removal of) this migration changes nothing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The exemption list. Empty on purpose: nobody is exempt until the owner
--    inserts a row from the SQL editor.
-- ----------------------------------------------------------------------------
create table if not exists public.mfa_exemptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

-- RLS on, and no policies: the absence of policies IS the access rule. Only
-- the definer function below (running as its owner) and the service role
-- (which bypasses RLS) can ever touch a row.
alter table public.mfa_exemptions enable row level security;

-- ----------------------------------------------------------------------------
-- 2. is_mfa_exempt(): "does the CALLER hold an exemption row?" Nothing else
--    can be asked of it, by construction.
-- ----------------------------------------------------------------------------
create or replace function public.is_mfa_exempt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mfa_exemptions
    where user_id = auth.uid()
  );
$$;

revoke execute on function public.is_mfa_exempt()
  from public, anon;
grant execute on function public.is_mfa_exempt()
  to authenticated, service_role;
