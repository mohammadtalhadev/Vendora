-- ============================================================================
-- Vendora Phase 8 (Batch 10): the customer's own address book and saved
-- payment methods, held by the database instead of by a browser fiction.
--
-- Before this file, neither table existed. `src/store/user-account-store.ts`
-- was a Zustand store persisted to localStorage that seeded EVERY account -
-- including a brand-new signup and a signed-out guest - with two addresses
-- and two cards belonging to an invented "Sarah Jenkins" of San Francisco,
-- and `CheckoutPage` carried its own pair of invented Pakistani addresses
-- with invented phone numbers, pre-selected at checkout with the signed-in
-- user's name pasted on top. Both fictions are deleted by this phase; the
-- screens now read and write the two tables below, so a fresh account sees
-- an honest empty address book.
--
-- Design decisions:
--
--   1. Rows are owned, never shared. Each row carries the owner's `user_id`
--      (the profile, which is 1:1 with the auth user) and four RLS policies
--      restrict every verb to `auth.uid() = user_id`. There is no staff read:
--      a customer's home address is not console data.
--   2. "Default" is singular by construction. A partial unique index allows
--      at most one `is_default` row per user per table, so the client can
--      never leave an account with two defaults no matter how it races; the
--      API unsets the old default before setting the new one.
--   3. Payment methods are display metadata ONLY. The table holds the brand,
--      the cardholder name, the last four digits and the expiry - the facts a
--      "saved card" tile renders. A full card number or CVV must never be
--      stored here; real charging stays in the checkout flow and belongs to
--      a future payment provider (Phase 14).
--   4. Nothing is seeded. An empty book is the truthful initial state.
--
-- Nothing here is applied to the remote until you approve a push; `npm run
-- db:check` compiles the chain and asserts each rule against real Postgres.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The address book.
-- ----------------------------------------------------------------------------
create table public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'home' check (type in ('home', 'work', 'other')),
  label text not null default '',
  full_name text not null,
  phone text not null default '',
  street text not null,
  city text not null,
  state text not null default '',
  zip_code text not null default '',
  country text not null default 'Pakistan',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_addresses_user_id_idx on public.user_addresses (user_id);

-- At most one default per owner; a second default is a constraint violation,
-- not a state the UI has to apologise for.
create unique index user_addresses_one_default_per_user
  on public.user_addresses (user_id) where is_default;

drop trigger if exists trg_user_addresses_updated on public.user_addresses;
create trigger trg_user_addresses_updated before update on public.user_addresses
  for each row execute function public.set_updated_at();

alter table public.user_addresses enable row level security;

drop policy if exists user_addresses_select_own on public.user_addresses;
create policy user_addresses_select_own on public.user_addresses
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_addresses_insert_own on public.user_addresses;
create policy user_addresses_insert_own on public.user_addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_addresses_update_own on public.user_addresses;
create policy user_addresses_update_own on public.user_addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_addresses_delete_own on public.user_addresses;
create policy user_addresses_delete_own on public.user_addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. Saved payment methods: display metadata only (see decision 3 above).
-- ----------------------------------------------------------------------------
create table public.user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'card' check (type in ('card', 'cod')),
  brand text not null default '',
  cardholder_name text,
  last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  expiry_month text,
  expiry_year text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_payment_methods is
  'Display metadata for a saved payment method (brand, cardholder, last4, expiry). '
  'A full card number or CVV must NEVER be stored here; real charging stays in the '
  'checkout flow (future PSP, Phase 14).';

create index user_payment_methods_user_id_idx on public.user_payment_methods (user_id);

create unique index user_payment_methods_one_default_per_user
  on public.user_payment_methods (user_id) where is_default;

drop trigger if exists trg_user_payment_methods_updated on public.user_payment_methods;
create trigger trg_user_payment_methods_updated before update on public.user_payment_methods
  for each row execute function public.set_updated_at();

alter table public.user_payment_methods enable row level security;

drop policy if exists user_payment_methods_select_own on public.user_payment_methods;
create policy user_payment_methods_select_own on public.user_payment_methods
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_payment_methods_insert_own on public.user_payment_methods;
create policy user_payment_methods_insert_own on public.user_payment_methods
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_payment_methods_update_own on public.user_payment_methods;
create policy user_payment_methods_update_own on public.user_payment_methods
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_payment_methods_delete_own on public.user_payment_methods;
create policy user_payment_methods_delete_own on public.user_payment_methods
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. Grants. The default privileges from 20261011000400 already cover these
--    tables; asserted explicitly, like the console migration does, so the
--    exposure of the new tables is visible in the file that creates them.
--    No anon grant: RLS has no anon policy, so there is nothing for a guest
--    to read even at the privilege layer.
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on
  public.user_addresses, public.user_payment_methods
  to authenticated;
