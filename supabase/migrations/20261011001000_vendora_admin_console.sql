-- ============================================================================
-- Vendora Phase 6: the admin console.
--
-- What the console claimed before this file, and where it got it from:
--
--   * `AdminDashboardPage` summed vendors, products, disputes and packages out
--     of `useMarketplaceStore` - a browser store whose arrays were filled by
--     `syncWithDatabase`, which back-filled any missing column with a demo
--     default. Every tile was therefore a mix of real rows and invented ones.
--   * `AdminVendorsPage` carried an `INITIAL_VENDORS` literal (revenue, tier,
--     KYC, joined dates) and layered `vendorOverrides` / `extraVendors` on top
--     of it, so approving or suspending a store changed React state only.
--   * `AdminProductsPage` held `localItemOverrides` for the same reason: the
--     approve / reject / archive buttons wrote to a map in the component.
--   * `AdminCommissionPage` rendered `CATEGORY_OVERRIDES` with a
--     `baseTierFee: '10.0%'` no table stored, and "saved" rules into the store.
--   * `AdminReportsPage` listed a `REPORT_ARCHIVES` array of files that were
--     never generated, and "Generate" appended one to local state.
--   * `AdminAuditLogsPage` shipped four invented audit rows - complete with
--     IP addresses and cities - merged under whatever the legacy client read.
--   * `AdminSettingsPage` persisted the whole platform configuration to
--     localStorage.
--
-- This migration makes the console's claims computable, and gives every
-- governance decision a write path:
--
--   1. columns for the facts the pages rendered but no table carried:
--      account status on `profiles`, moderation attribution on `products`,
--      a category hierarchy on `categories`
--   2. tables for state that only existed in the browser: platform settings,
--      merchant strikes, refunds
--   3. read RPCs that do each queue's joining, filtering, counting and paging
--      in SQL, so the browser cannot sum anything it was not given
--   4. write RPCs for every governance action, each one audited in the same
--      transaction as the change it describes
--   5. RLS and grants for the new objects
--
-- Money rules are unchanged and deliberately not re-implemented here:
-- `checkout_pricing`/`place_order` own what a buyer is charged and what a
-- seller earns, and the console only reads what those wrote. Anything the
-- schema cannot support is removed from the UI instead of being fabricated -
-- which is why there is no RPC for the settings page's tax-provider, API-rate,
-- retry-policy or webhook knobs: those integrations do not exist in Vendora.
--
-- Nothing here is applied to the remote project until the user approves a push.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Facts the console rendered but no table carried.
-- ----------------------------------------------------------------------------

create type public.account_state as enum ('active', 'suspended', 'banned');

-- An account's standing is a platform decision, not something the profile's
-- owner edits, so it lives beside the roles that already are.
alter table public.profiles
  add column if not exists account_status public.account_state not null default 'active',
  add column if not exists account_status_reason text,
  add column if not exists account_status_at timestamptz;

-- Moderation is a decision by a named person on a named listing, at a time.
-- Without these the audit trail describes work nobody is accountable for.
alter table public.products
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz;

-- The categories page draws a tree; a flat table cannot produce one.
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists is_active boolean not null default true;

create index if not exists categories_parent_idx on public.categories (parent_id);
create index if not exists products_moderated_by_idx on public.products (moderated_by);
create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- ----------------------------------------------------------------------------
-- 2. State that only ever lived in the browser.
-- ----------------------------------------------------------------------------

-- The platform configuration the settings page edits. Each key here is a knob
-- something in the app actually reads; the rest of that form is dropped instead
-- of stored, because a value nobody consumes is a lie with a save button.
create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  platform_name text not null default 'Vendora Multi-Vendor Marketplace',
  support_email text not null default 'ops@vendora.market',
  default_currency text not null default 'USD',
  payout_schedule text not null default 'Bi-weekly on Monday',
  min_payout_floor numeric(12,2) not null default 50 check (min_payout_floor >= 0),
  reserve_retention_days integer not null default 14 check (reserve_retention_days >= 0),
  new_listing_review text not null default 'Moderate (Standard)'
    check (new_listing_review in ('Moderate (Standard)', 'Strict (Manual Review)', 'Permissive (Post-Publish Scan)')),
  sla_ceiling_hours integer not null default 48 check (sla_ceiling_hours > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- A strike is evidence, not a note in a modal: the vendor queue's suspension
-- rule ("after the third strike") has to count rows, not read a demo integer.
create table if not exists public.vendor_strikes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  reason text not null check (btrim(reason) <> ''),
  note text,
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_strikes_vendor_idx on public.vendor_strikes (vendor_id, created_at desc);

-- Refunds are money leaving the platform, so they need a row of their own:
-- `payment_status = 'refunded'` alone cannot say how much, why or by whom.
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  sub_order_id uuid references public.sub_orders(id) on delete set null,
  order_group_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null default '',
  processed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists refunds_order_idx on public.refunds (order_group_id, created_at desc);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
insert into public.commission_config (id) values (true) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Guards and the audit write both depend on.
-- ----------------------------------------------------------------------------

-- One message shape for every console action, so the client can tell "you are
-- not staff" apart from "that row does not exist" instead of guessing.
create or replace function public.admin_require_admin(p_operation text default 'this action')
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'Only the platform team can %', p_operation using errcode = '42501';
  end if;
end;
$$;

-- Audit rows are written by the RPCs that make the change they describe: a
-- client that could insert freely would be able to invent a history.
create or replace function public.admin_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_id uuid;
begin
  select case
           when p.actor_id is null then 'System'
           when public.is_admin() then 'Admin'
           when public.has_role('support') then 'Support'
           when public.has_role('rider') then 'Rider'
           else 'Customer'
         end
    into v_role
    from (select v_actor as actor_id) p;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (v_actor, v_role, p_action, p_entity_type, p_entity_id, p_before, p_after)
  returning id into v_id;

  return v_id;
end;
$$;

-- The settled money a store has earned, in a window. `vendor_earned_net_payout`
-- is the lifetime rule; the console needs the same rule bounded by a period.
create or replace function public.admin_vendor_settled_gmv(p_vendor uuid, p_days integer)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric
  from public.sub_orders so
  where so.seller_id = p_vendor
    and so.status in ('delivered', 'refunded')
    and so.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
$$;

-- Same tiers the vendor workspace quotes, derived from the same settled GMV.
create or replace function public.admin_vendor_tier(p_vendor uuid, p_days integer default 365)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 100000 then 'enterprise'
           when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 25000 then 'volume_preferred'
           when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 5000 then 'growing'
           else 'standard'
         end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Read RPCs: every queue the console shows, computed in SQL.
-- ----------------------------------------------------------------------------

-- One call for the whole overview: booked volume, what the platform kept, what
-- sellers earned, the two queues that need a decision, and the period series the
-- chart draws. The client adds nothing.
create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the platform overview');
with
  params as (select greatest(coalesce(p_days, 30), 1) as days),
  money as (
    select
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.status <> 'cancelled'), 0)::numeric as gmv,
      coalesce(sum(so.commission_amount) filter (where so.status in ('delivered', 'refunded')), 0)::numeric as commission,
      coalesce(sum(so.net_payout) filter (where so.status in ('delivered', 'refunded')), 0)::numeric as net_to_sellers,
      coalesce(count(*) filter (where so.status <> 'cancelled'), 0)::int as packages,
      coalesce(count(distinct so.order_group_id), 0)::int as orders,
      coalesce(count(*) filter (where so.status in ('placed', 'confirmed', 'packed', 'ready_for_pickup')), 0)::int as open_packages
    from public.sub_orders so, params pm
    where so.created_at >= now() - make_interval(days => pm.days)
  ),
  previous as (
    select coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gmv
    from public.sub_orders so, params pm
    where so.status <> 'cancelled'
      and so.created_at >= now() - make_interval(days => pm.days * 2)
      and so.created_at <  now() - make_interval(days => pm.days)
  ),
  short as (
    select
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.created_at >= now() - interval '7 days' and so.status <> 'cancelled'), 0)::numeric as revenue7d,
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.created_at >= now() - interval '30 days' and so.status <> 'cancelled'), 0)::numeric as revenue30d,
      coalesce(count(distinct so.order_group_id) filter (where so.created_at >= now() - interval '7 days'), 0)::int as orders7d,
      coalesce(count(distinct so.order_group_id) filter (where so.created_at >= now() - interval '30 days'), 0)::int as orders30d
    from public.sub_orders so
  ),
  refunds_window as (
    select coalesce(sum(r.amount), 0)::numeric as amount, coalesce(count(*), 0)::int as count
    from public.refunds r, params pm
    where r.created_at >= now() - make_interval(days => pm.days)
  ),
  payouts as (
    select
      coalesce(sum(p.amount) filter (where p.status = 'completed'), 0)::numeric as paid,
      coalesce(sum(p.amount) filter (where p.status = 'processing'), 0)::numeric as pending,
      coalesce(count(*) filter (where p.status = 'processing'), 0)::int as pending_count
    from public.payouts p
  ),
  sellers as (
    select
      coalesce(count(*) filter (where vp.status = 'active'), 0)::int as active,
      coalesce(count(*) filter (where vp.status = 'suspended'), 0)::int as suspended
    from public.vendor_profiles vp
  ),
  applications as (
    select coalesce(count(*), 0)::int as awaiting_review
    from public.vendor_applications va
    where va.status in ('pending', 'under_review')
  ),
  catalog as (
    select
      coalesce(count(*) filter (where p.status = 'approved'), 0)::int as approved,
      coalesce(count(*) filter (where p.status = 'pending_review'), 0)::int as pending_review,
      coalesce(count(*) filter (where p.status = 'rejected'), 0)::int as rejected,
      coalesce(count(*) filter (where p.status = 'draft'), 0)::int as draft,
      coalesce(count(*) filter (where p.status = 'archived'), 0)::int as archived,
      coalesce(count(*) filter (where p.status = 'approved' and p.stock = 0), 0)::int as out_of_stock,
      coalesce(count(*) filter (where p.status = 'approved' and p.stock between 1 and 5), 0)::int as low_stock
    from public.products p
  ),
  trust as (
    select
      coalesce(count(*) filter (where d.status in ('open', 'under_review')), 0)::int as open_disputes,
      coalesce(count(*) filter (where d.status = 'escalated'), 0)::int as escalated_disputes
    from public.disputes d
  ),
  returns_strikes as (
    select
      coalesce((select count(*) from public.sub_orders so where so.status = 'return_requested'), 0)::int as pending_returns,
      coalesce((select count(*) from public.vendor_strikes vs, params pm where vs.created_at >= now() - make_interval(days => pm.days)), 0)::int as strikes
  ),
  monthly as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'month', to_char(bucket, 'Mon'),
      'label', to_char(bucket, 'YYYY-MM'),
      'gross', gross,
      'commission', commission,
      'net', net
    ) order by bucket), '[]'::jsonb) as series
    from (
      select
        date_trunc('month', so.created_at) as bucket,
        coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
        coalesce(sum(so.commission_amount), 0)::numeric as commission,
        coalesce(sum(so.net_payout), 0)::numeric as net
      from public.sub_orders so, params pm
      where so.created_at >= now() - make_interval(days => pm.days * 2)
      group by 1
    ) m
  ),
  top_vendors as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'storeName', store_name, 'gross', gross, 'commission', commission, 'packages', packages
    ) order by gross desc), '[]'::jsonb) as rows
    from (
      select
        vp.id,
        vp.store_name,
        coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.status <> 'cancelled'), 0)::numeric as gross,
        coalesce(sum(so.commission_amount) filter (where so.status in ('delivered', 'refunded')), 0)::numeric as commission,
        coalesce(count(so.id), 0)::int as packages
      from public.vendor_profiles vp
      left join public.sub_orders so on so.seller_id = vp.id
      group by vp.id, vp.store_name
      order by gross desc
      limit 5
    ) t
  ),
  stages as (
    select coalesce(jsonb_object_agg(so.status::text, so.n), '{}'::jsonb) as by_status
    from (select status, count(*)::int as n from public.sub_orders group by status) so
  )
select jsonb_build_object(
  'days', (select days from params),
  'kpis', jsonb_build_object(
    'gmvBooked', (select gmv from money),
    'commission', (select commission from money),
    'netToSellers', (select net_to_sellers from money),
    'packages', (select packages from money),
    'orders', (select orders from money),
    'openPackages', (select open_packages from money),
    'averageOrderValue', round((select gmv from money) / nullif((select orders from money), 0), 2),
    'refundAmount', (select amount from refunds_window),
    'refundCount', (select count from refunds_window),
    'payoutsPaid', (select paid from payouts),
    'payoutsPending', (select pending from payouts),
    'payoutsPendingCount', (select pending_count from payouts)
  ),
  'growth', jsonb_build_object(
    'revenue7d', (select revenue7d from short),
    'revenue30d', (select revenue30d from short),
    'orders7d', (select orders7d from short),
    'orders30d', (select orders30d from short),
    'previousGmv', (select gmv from previous),
    'deltaPct', round(((select gmv from money) - (select gmv from previous))
      / nullif((select gmv from previous), 0) * 100, 1)
  ),
  'sellers', jsonb_build_object(
    'active', (select active from sellers),
    'suspended', (select suspended from sellers),
    'awaitingReview', (select awaiting_review from applications)
  ),
  'catalog', (select to_jsonb(c) from catalog c),
  'trust', jsonb_build_object(
    'openDisputes', (select open_disputes from trust),
    'escalatedDisputes', (select escalated_disputes from trust),
    'pendingReturns', (select pending_returns from returns_strikes),
    'strikes', (select strikes from returns_strikes)
  ),
  'stages', (select by_status from stages),
  'monthly', (select series from monthly),
  'topVendors', (select rows from top_vendors)
);
$$;

-- The vendor queue: identity and status from `vendor_profiles`, money from the
-- settled packages, balance and paid-out from the vendor rules, risk from the
-- strike and dispute rows. Paging and total are the database's, not the grid's.
create or replace function public.admin_vendor_queue(
  p_status text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('list merchants');
with
  filtered as (
    select vp.id, vp.store_name, vp.slug, vp.seller_type, vp.status, vp.rating, vp.review_count,
           vp.commission_rate_override, vp.created_at, vp.user_id
    from public.vendor_profiles vp
    left join public.profiles pr on pr.id = vp.user_id
    where (p_status = 'all'
           or (p_status = 'pending' and pr.vendor_status::text = 'pending')
           or (p_status = 'suspended' and (vp.status::text = 'suspended' or pr.vendor_status::text = 'suspended'))
           or vp.status::text = p_status)
      and (btrim(coalesce(p_search, '')) = ''
           or vp.store_name ilike '%' || p_search || '%'
           or vp.slug ilike '%' || p_search || '%'
           or coalesce(pr.email, '') ilike '%' || p_search || '%')
  ),
  rollups as (
    select
      f.*,
      coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so
                where so.seller_id = f.id and so.status <> 'cancelled'), 0)::numeric as gross,
      coalesce((select sum(so.commission_amount) from public.sub_orders so
                where so.seller_id = f.id and so.status in ('delivered', 'refunded')), 0)::numeric as commission,
      coalesce(public.vendor_earned_net_payout(f.id), 0)::numeric as net,
      coalesce((select count(*) from public.sub_orders so where so.seller_id = f.id)::int, 0) as packages,
      coalesce((select count(*) from public.products p where p.seller_id = f.id)::int, 0) as listings,
      coalesce((select count(*) from public.products p
                where p.seller_id = f.id and p.status = 'pending_review')::int, 0) as pending_listings,
      coalesce(public.vendor_available_balance(f.id), 0)::numeric as balance,
      coalesce(public.vendor_paid_out(f.id), 0)::numeric as paid_out,
      coalesce((select count(*) from public.vendor_strikes vs where vs.vendor_id = f.id)::int, 0) as strikes,
      coalesce((select count(*) from public.disputes d
                where d.vendor_id = f.id and d.status in ('open', 'under_review', 'escalated'))::int, 0) as open_disputes,
      coalesce((select va.status::text from public.vendor_applications va
                where va.user_id = f.user_id order by va.created_at desc limit 1), 'none') as application_state
    from filtered f
  ),
  paged as (
    select *, count(*) over () as total
    from rollups
    order by gross desc, store_name
    limit greatest(coalesce(p_page_size, 12), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 12), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 12), 1),
  'total', coalesce((select max(total) from paged), 0),
  -- An applicant has no store row yet, so "pending" is the applications table,
  -- not a status a store can be in.
  'pending', (select count(*) from public.vendor_applications va
              where va.status in ('pending', 'under_review')),
  'suspended', (select count(*) from public.vendor_profiles where status::text = 'suspended'),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'storeName', store_name,
    'slug', slug,
    'sellerType', seller_type,
    'status', status,
    'rating', rating,
    'reviewCount', review_count,
    'commissionRate', commission_rate_override,
    'joinedAt', created_at,
    'gross', gross,
    'commission', commission,
    'net', net,
    'packages', packages,
    'listings', listings,
    'pendingListings', pending_listings,
    'balance', balance,
    'paidOut', paid_out,
    'strikes', strikes,
    'openDisputes', open_disputes,
    'tier', public.admin_vendor_tier(id),
    'kyc', case when application_state in ('approved') then 'verified'
                when application_state in ('pending', 'under_review') then 'submitted'
                when application_state = 'rejected' then 'rejected'
                else 'unverified' end
  ) order by gross desc), '[]'::jsonb)
) from paged;
$$;

-- Everything the detail screen shows about one store, in one read. A non-admin
-- gets nothing: the guard runs before any of the subselects matter.
create or replace function public.admin_vendor_detail(p_vendor_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vendor jsonb;
begin
  perform public.admin_require_admin('open a merchant record');

  select jsonb_build_object(
    'id', vp.id,
    'userId', vp.user_id,
    'storeName', vp.store_name,
    'slug', vp.slug,
    'description', vp.description,
    'logo', vp.logo,
    'banner', vp.banner,
    'sellerType', vp.seller_type,
    'status', vp.status,
    'rating', vp.rating,
    'reviewCount', vp.review_count,
    'commissionRate', vp.commission_rate_override,
    'joinedAt', vp.created_at,
    'email', pr.email,
    'name', pr.name,
    'vendorStatus', pr.vendor_status,
    'accountStatus', pr.account_status,
    'roles', coalesce(to_jsonb(pr.roles), '[]'::jsonb),
    'gross', coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so
                       where so.seller_id = vp.id and so.status <> 'cancelled'), 0)::numeric,
    'net', coalesce(public.vendor_earned_net_payout(vp.id), 0)::numeric,
    'balance', coalesce(public.vendor_available_balance(vp.id), 0)::numeric,
    'reserve', coalesce(public.vendor_reserve(vp.id), 0)::numeric,
    'paidOut', coalesce(public.vendor_paid_out(vp.id), 0)::numeric,
    'tier', public.admin_vendor_tier(vp.id),
    'payoutSchedule', (select ps.payout_schedule from public.platform_settings ps limit 1)
  )
  into v_vendor
  from public.vendor_profiles vp
  left join public.profiles pr on pr.id = vp.user_id
  where vp.id = p_vendor_id;

  if v_vendor is null then
    raise exception 'Store not found';
  end if;

  return v_vendor || jsonb_build_object(
    'packages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', so.id, 'orderGroupId', so.order_group_id, 'status', so.status, 'type', so.type,
        'gross', (so.subtotal + so.shipping_fee)::numeric, 'commission', so.commission_amount,
        'net', so.net_payout, 'createdAt', so.created_at, 'updatedAt', so.updated_at,
        'buyerEmail', (select o.customer_email from public.orders o where o.id = so.order_group_id)
      ) order by so.created_at desc)
      from (select * from public.sub_orders where seller_id = p_vendor_id order by created_at desc limit 20) so
    ), '[]'::jsonb),
    'strikes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', vs.id, 'reason', vs.reason, 'note', vs.note, 'createdAt', vs.created_at,
        'issuedBy', (select pr2.name from public.profiles pr2 where pr2.id = vs.issued_by)
      ) order by vs.created_at desc)
      from public.vendor_strikes vs where vs.vendor_id = p_vendor_id), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'amount', p.amount, 'status', p.status, 'method', p.payment_method,
        'reference', p.payment_reference, 'createdAt', p.created_at
      ) order by p.created_at desc)
      from (select * from public.payouts where vendor_id = p_vendor_id order by created_at desc limit 10) p
    ), '[]'::jsonb),
    'bankAccounts', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ba.id, 'holderName', ba.holder_name, 'bankName', ba.bank_name,
        'maskedAccount', ba.masked_account, 'isDefault', ba.is_default
      ) order by ba.is_default desc)
      from public.bank_accounts ba where ba.vendor_id = p_vendor_id), '[]'::jsonb),
    'disputes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'reason', d.reason, 'status', d.status, 'urgency', d.urgency,
        'createdAt', d.created_at, 'resolutionAmount', d.resolution_amount
      ) order by d.created_at desc)
      from (select * from public.disputes where vendor_id = p_vendor_id order by created_at desc limit 10) d
    ), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
        'id', va.id, 'status', va.status, 'businessType', va.business_type,
        'contactEmail', va.contact_email, 'createdAt', va.created_at, 'reviewNote', va.review_note
      ) order by va.created_at desc)
      from public.vendor_applications va
      where va.user_id = (select vp.user_id from public.vendor_profiles vp where vp.id = p_vendor_id)
    ), '[]'::jsonb),
    'auditTrail', coalesce((select jsonb_agg(jsonb_build_object(
        'id', al.id, 'action', al.action, 'actorRole', al.actor_role, 'createdAt', al.created_at,
        'before', al.before_data, 'after', al.after_data,
        'actor', (select pr3.name from public.profiles pr3 where pr3.id = al.actor_id)
      ) order by al.created_at desc)
      from (
        select * from public.audit_logs
        where entity_type = 'vendor' and entity_id = p_vendor_id::text
        order by created_at desc limit 25
      ) al
    ), '[]'::jsonb)
  );
end;
$$;

-- The moderation queue. `flagged` is the one thing the page wanted to sort by
-- that the schema can actually justify: a rejected listing that has been
-- resubmitted since the rejection happened.
create or replace function public.admin_moderation_queue(
  p_status text default 'pending_review',
  p_search text default '',
  p_category uuid default null,
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the moderation queue');
with
  filtered as (
    select p.*
    from public.products p
    left join public.vendor_profiles vp on vp.id = p.seller_id
    where (p_status = 'all' or p.status::text = p_status)
      and (p_category is null or p.category_id = p_category)
      and (btrim(coalesce(p_search, '')) = ''
           or p.title ilike '%' || p_search || '%'
           or p.brand ilike '%' || p_search || '%'
           or p.slug ilike '%' || p_search || '%'
           or vp.store_name ilike '%' || p_search || '%')
  ),
  paged as (
    select f.*, count(*) over () as total
    from filtered f
    order by f.created_at asc
    limit greatest(coalesce(p_page_size, 12), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 12), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 12), 1),
  'total', coalesce((select max(total) from paged), 0),
  'counts', jsonb_build_object(
    'pendingReview', (select count(*) from public.products where status = 'pending_review'),
    'approved', (select count(*) from public.products where status = 'approved'),
    'rejected', (select count(*) from public.products where status = 'rejected'),
    'draft', (select count(*) from public.products where status = 'draft'),
    'archived', (select count(*) from public.products where status = 'archived')
  ),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'title', f.title,
    'slug', f.slug,
    'brand', f.brand,
    'price', f.price,
    'stock', f.stock,
    'type', f.type,
    'status', f.status,
    'images', coalesce(to_jsonb(f.images), '[]'::jsonb),
    'rejectionReason', f.rejection_reason,
    'createdAt', f.created_at,
    'moderatedAt', f.moderated_at,
    'moderatedBy', (select pr.name from public.profiles pr where pr.id = f.moderated_by),
    'sellerId', f.seller_id,
    'storeName', (select vp.store_name from public.vendor_profiles vp where vp.id = f.seller_id),
    'sellerStatus', (select vp.status from public.vendor_profiles vp where vp.id = f.seller_id),
    'category', (select c.name from public.categories c where c.id = f.category_id),
    'flagged', f.status = 'pending_review' and f.updated_at > coalesce(f.moderated_at, f.created_at)
  ) order by f.created_at), '[]'::jsonb)
) from paged f;
$$;

-- Order support needs the whole order, not one store's slice of it: the platform
-- is a party to every order, which is why this read exists at all.
create or replace function public.admin_order_queue(
  p_status text default 'all',
  p_payment text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the order queue');
with
  grouped as (
    select
      o.id,
      o.customer_email,
      o.created_at,
      o.payment_method,
      o.payment_status,
      coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
      coalesce(sum(so.commission_amount), 0)::numeric as commission,
      coalesce(count(so.id), 0)::int as packages,
      coalesce(sum(so.net_payout) filter (where so.status in ('delivered', 'refunded')), 0)::numeric as paid_to_sellers,
      coalesce(jsonb_agg(jsonb_build_object(
        'id', so.id, 'sellerId', so.seller_id, 'status', so.status::text,
        'gross', (so.subtotal + so.shipping_fee)::numeric
      ) order by so.created_at), '[]'::jsonb) as lines,
      coalesce(max(so.status)::text, 'placed') as lead_status
    from public.orders o
    left join public.sub_orders so on so.order_group_id = o.id
    group by o.id, o.customer_email, o.created_at, o.payment_method, o.payment_status
  ),
  filtered as (
    select g.*
    from grouped g
    where (p_status = 'all' or g.lead_status = p_status)
      and (p_payment = 'all' or g.payment_status::text = p_payment)
      and (btrim(coalesce(p_search, '')) = ''
           or g.id::text ilike '%' || p_search || '%'
           or g.customer_email ilike '%' || p_search || '%')
  ),
  paged as (
    select f.*, count(*) over () as total
    from filtered f
    order by f.created_at desc
    limit greatest(coalesce(p_page_size, 12), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 12), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 12), 1),
  'total', coalesce((select max(total) from paged), 0),
  'booked', (select coalesce(sum(gross), 0) from grouped),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'customerEmail', customer_email,
    'createdAt', created_at,
    'paymentMethod', payment_method,
    'paymentStatus', payment_status,
    'gross', gross,
    'commission', commission,
    'paidToSellers', paid_to_sellers,
    'packages', packages,
    'leadStatus', lead_status,
    'lines', lines
  ) order by created_at desc), '[]'::jsonb)
) from paged;
$$;

-- One order with its packages, refund rows and any dispute against it.
create or replace function public.admin_order_detail(p_order_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read an order');
select jsonb_build_object(
  'id', o.id,
  'customerEmail', o.customer_email,
  'customerId', o.customer_id,
  'shippingAddress', o.shipping_address,
  'paymentMethod', o.payment_method,
  'paymentDetails', o.payment_details,
  'paymentStatus', o.payment_status,
  'createdAt', o.created_at,
  'gross', coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so
                     where so.order_group_id = o.id), 0)::numeric,
  'commission', coalesce((select sum(so.commission_amount) from public.sub_orders so
                          where so.order_group_id = o.id), 0)::numeric,
  'refunded', coalesce((select sum(r.amount) from public.refunds r
                        where r.order_group_id = o.id), 0)::numeric,
  'packages', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', so.id, 'sellerId', so.seller_id,
      'storeName', (select vp.store_name from public.vendor_profiles vp where vp.id = so.seller_id),
      'type', so.type, 'status', so.status, 'items', so.items,
      'subtotal', so.subtotal, 'shippingFee', so.shipping_fee,
      'commissionRate', so.commission_rate, 'commissionAmount', so.commission_amount,
      'netPayout', so.net_payout, 'riderId', so.rider_id, 'licenseKey', so.license_key,
      'carrierName', so.carrier_name, 'trackingNumber', so.tracking_number,
      'returnReason', so.return_reason, 'history', so.history,
      'createdAt', so.created_at, 'updatedAt', so.updated_at,
      'delivery', (select jsonb_build_object('status', d.status::text, 'riderId', d.rider_id,
                     'pickedUpAt', d.picked_up_at, 'deliveredAt', d.delivered_at)
                   from public.deliveries d where d.sub_order_id = so.id)
    ) order by so.created_at)
    from public.sub_orders so
    where so.order_group_id = o.id
  ), '[]'::jsonb),
  'disputes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'reason', d.reason, 'status', d.status, 'urgency', d.urgency,
      'vendorName', d.vendor_name, 'resolutionNote', d.resolution_note,
      'resolutionAmount', d.resolution_amount, 'createdAt', d.created_at
    ) order by d.created_at desc)
    from public.disputes d
    where d.order_group_id = o.id
  ), '[]'::jsonb),
  'refunds', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'amount', r.amount, 'reason', r.reason, 'createdAt', r.created_at,
      'processedBy', (select pr.name from public.profiles pr where pr.id = r.processed_by)
    ) order by r.created_at desc)
    from public.refunds r
    where r.order_group_id = o.id
  ), '[]'::jsonb)
)
from public.orders o
where o.id = p_order_group_id;
$$;

-- The people queue. Volume is what the account has actually bought, and status
-- is the platform's decision, so both come from rows rather than from a column
-- someone typed into a form.
create or replace function public.admin_user_queue(
  p_role text default 'all',
  p_status text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the accounts queue');
with
  rollups as (
    select
      pr.id, pr.name, pr.email, pr.avatar_url, pr.roles, pr.vendor_status,
      pr.account_status, pr.account_status_reason, pr.created_at,
      coalesce(
        (select vp.id from public.vendor_profiles vp where vp.user_id = pr.id limit 1),
        (select vr.id from public.rider_profiles vr where vr.user_id = pr.id limit 1)
      ) as linked_id,
      coalesce((select count(*) from public.orders o where o.customer_id = pr.id)::int, 0) as orders,
      coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so
                join public.orders o on o.id = so.order_group_id
                where o.customer_id = pr.id and so.status <> 'cancelled'), 0)::numeric as volume
    from public.profiles pr
    where (p_role = 'all' or pr.roles::text[] && array[p_role])
      and (p_status = 'all' or pr.account_status::text = p_status)
      and (btrim(coalesce(p_search, '')) = ''
           or pr.name ilike '%' || p_search || '%'
           or pr.email ilike '%' || p_search || '%')
  ),
  paged as (
    select r.*, count(*) over () as total from rollups r
    order by r.created_at desc
    limit greatest(coalesce(p_page_size, 20), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 20), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 20), 1),
  'total', coalesce((select max(total) from paged), 0),
  'counts', jsonb_build_object(
    'all', (select count(*) from public.profiles),
    'admins', (select count(*) from public.profiles where roles @> array['admin'::public.user_role]),
    'vendors', (select count(*) from public.profiles where roles @> array['vendor'::public.user_role]),
    'support', (select count(*) from public.profiles where roles @> array['support'::public.user_role]),
    'riders', (select count(*) from public.profiles where roles @> array['rider'::public.user_role]),
    'suspended', (select count(*) from public.profiles where account_status <> 'active')
  ),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'email', email, 'avatarUrl', avatar_url,
    'roles', coalesce(to_jsonb(roles), '[]'::jsonb),
    'vendorStatus', vendor_status,
    'accountStatus', account_status,
    'accountStatusReason', account_status_reason,
    'joinedAt', created_at,
    'orders', orders,
    'volume', volume,
    'linkedId', linked_id
  ) order by created_at desc), '[]'::jsonb)
) from paged;
$$;

-- The dispute queue with the money each case could move: the package's gross,
-- not a number the agent remembers typing.
create or replace function public.admin_dispute_queue(
  p_status text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the dispute queue');
with
  rollups as (
    select
      d.*,
      coalesce((select so.subtotal + so.shipping_fee from public.sub_orders so
                where so.id = d.sub_order_id), 0)::numeric as package_gross,
      coalesce((select so.status::text from public.sub_orders so where so.id = d.sub_order_id), 'n/a') as package_status,
      (select pr.name from public.profiles pr where pr.id = d.assigned_agent_id) as agent_name,
      (select count(*) from public.dispute_messages m where m.dispute_id = d.id)::int as message_count
    from public.disputes d
    where (p_status = 'all'
           or (p_status = 'awaiting_staff' and d.status in ('open', 'under_review', 'escalated'))
           or d.status::text = p_status)
      and (btrim(coalesce(p_search, '')) = ''
           or d.reason ilike '%' || p_search || '%'
           or d.customer_name ilike '%' || p_search || '%'
           or d.vendor_name ilike '%' || p_search || '%'
           or d.id::text ilike '%' || p_search || '%')
  ),
  paged as (
    select r.*, count(*) over () as total from rollups r
    order by case when r.urgency::text = 'urgent' then 0 else 1 end, r.created_at asc
    limit greatest(coalesce(p_page_size, 12), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 12), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 12), 1),
  'total', coalesce((select max(total) from paged), 0),
  'counts', jsonb_build_object(
    'open', (select count(*) from public.disputes where status = 'open'),
    'underReview', (select count(*) from public.disputes where status = 'under_review'),
    'escalated', (select count(*) from public.disputes where status = 'escalated'),
    'resolved', (select count(*) from public.disputes where status::text like 'resolved%'),
    'urgent', (select count(*) from public.disputes where urgency = 'urgent'
               and status in ('open', 'under_review', 'escalated'))
  ),
  'exposure', coalesce((select sum(g.package_gross) from (select * from rollups) g
                       where g.status in ('open', 'under_review', 'escalated')), 0)::numeric,
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'reason', reason, 'status', status, 'urgency', urgency,
    'customerId', customer_id, 'customerName', customer_name, 'vendorName', vendor_name,
    'vendorId', vendor_id, 'subOrderId', sub_order_id, 'orderGroupId', order_group_id,
    'evidencePhotos', coalesce(to_jsonb(evidence_photos), '[]'::jsonb),
    'resolutionNote', resolution_note, 'resolutionAmount', resolution_amount,
    'agentName', agent_name, 'messages', message_count,
    'packageGross', package_gross, 'packageStatus', package_status,
    'createdAt', created_at, 'updatedAt', updated_at
  ) order by case when urgency::text = 'urgent' then 0 else 1 end, created_at), '[]'::jsonb)
) from paged;
$$;

-- The audit trail with the actor's name resolved, and no invented IPs: the only
-- address the row ever had is the one the insert recorded.
create or replace function public.admin_audit_queue(
  p_action text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the audit trail');
with
  filtered as (
    select al.*,
           (select pr.name from public.profiles pr where pr.id = al.actor_id) as actor_name
    from public.audit_logs al
    where (p_action = 'all' or al.action = p_action)
      and (btrim(coalesce(p_search, '')) = ''
           or al.action ilike '%' || p_search || '%'
           or coalesce(al.entity_id, '') ilike '%' || p_search || '%'
           or coalesce(al.entity_type, '') ilike '%' || p_search || '%'
           or exists (select 1 from public.profiles pr
                      where pr.id = al.actor_id and pr.name ilike '%' || p_search || '%'))
  ),
  paged as (
    select f.*, count(*) over () as total from filtered f
    order by f.created_at desc
    limit greatest(coalesce(p_page_size, 25), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 25), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 25), 1),
  'total', coalesce((select max(total) from paged), 0),
  'actions', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'count', a.n))
                       from (select action, count(*)::int as n from public.audit_logs
                             group by action order by count(*) desc) a), '[]'::jsonb),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'action', action, 'actorRole', actor_role, 'actorName', actor_name,
    'entityType', entity_type, 'entityId', entity_id, 'ipAddress', ip_address,
    'before', before_data, 'after', after_data, 'createdAt', created_at
  ) order by created_at desc), '[]'::jsonb)
) from paged;
$$;

-- The report period, bucketed by day/week/month in SQL. The reports page used to
-- archive "generated" files in React state; there is no file here, only the answer.
create or replace function public.admin_report_summary(p_days integer default 30, p_bucket text default 'day')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read a report');
with
  params as (
    select greatest(coalesce(p_days, 30), 1) as days,
           case p_bucket when 'month' then 'month' when 'week' then 'week' else 'day' end as bucket
  ),
  bucketed as (
    select
      date_trunc((select bucket from params), so.created_at) as period,
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.status <> 'cancelled'), 0)::numeric as gross,
      coalesce(sum(so.commission_amount), 0)::numeric as commission,
      coalesce(sum(so.net_payout), 0)::numeric as net,
      coalesce(count(distinct so.order_group_id), 0)::int as orders,
      coalesce(count(so.id), 0)::int as packages,
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.type = 'digital'), 0)::numeric as digital_gross,
      coalesce(sum(so.shipping_fee), 0)::numeric as freight
    from public.sub_orders so, params pm
    where so.created_at >= now() - make_interval(days => pm.days)
    group by 1
  ),
  by_category as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', category, 'gross', gross, 'commission', commission, 'listings', listings
    ) order by gross desc), '[]'::jsonb) as rows
    from (
      select
        coalesce(c.name, 'Uncategorised') as category,
        coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
        coalesce(sum(so.commission_amount), 0)::numeric as commission,
        count(distinct p.id)::int as listings
      from public.sub_orders so
      join jsonb_array_elements(so.items) line on true
      left join public.products p on p.id::text = line->>'productId'
      left join public.categories c on c.id = p.category_id
      cross join params pm
      where so.created_at >= now() - make_interval(days => pm.days)
      group by 1
    ) t
  ),
  by_seller as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'storeName', store_name, 'gross', gross, 'commission', commission,
      'net', net, 'packages', packages, 'payoutsPaid', paid
    ) order by gross desc), '[]'::jsonb) as rows
    from (
      select
        vp.store_name,
        coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
        coalesce(sum(so.commission_amount), 0)::numeric as commission,
        coalesce(sum(so.net_payout), 0)::numeric as net,
        count(so.id)::int as packages,
        coalesce(max(pp.paid), 0)::numeric as paid
      from public.vendor_profiles vp
      left join public.sub_orders so on so.seller_id = vp.id
      left join lateral (
        select sum(p.amount) as paid from public.payouts p
        where p.vendor_id = vp.id and p.status = 'completed'
      ) pp on true
      cross join params pm
      where (so.created_at >= now() - make_interval(days => pm.days) or so.id is null)
      group by vp.id, vp.store_name
      order by gross desc
      limit 20
    ) t
  )
select jsonb_build_object(
  'days', (select days from params),
  'bucket', (select bucket from params),
  'totals', jsonb_build_object(
    'gross', coalesce((select sum(gross) from bucketed), 0),
    'commission', coalesce((select sum(commission) from bucketed), 0),
    'net', coalesce((select sum(net) from bucketed), 0),
    'freight', coalesce((select sum(freight) from bucketed), 0),
    'digitalGross', coalesce((select sum(digital_gross) from bucketed), 0),
    'orders', coalesce((select sum(orders) from bucketed), 0),
    'packages', coalesce((select sum(packages) from bucketed), 0),
    'refunds', coalesce((select sum(r.amount) from public.refunds r, params pm
                         where r.created_at >= now() - make_interval(days => pm.days)), 0),
    'takeRatePct', round(coalesce((select sum(commission) from bucketed), 0)
      / nullif(coalesce((select sum(gross) from bucketed), 0), 0) * 100, 2)
  ),
  'series', coalesce((select jsonb_agg(jsonb_build_object(
      'period', to_char(period, 'YYYY-MM-DD'),
      'gross', gross, 'commission', commission, 'net', net,
      'orders', orders, 'packages', packages
    ) order by period) from bucketed), '[]'::jsonb),
  'byCategory', (select rows from by_category),
  'bySeller', (select rows from by_seller)
);
$$;

-- The taxonomy the categories page draws, with the counts it claimed to have.
create or replace function public.admin_category_tree()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the category tree');
with
  nodes as (
    select
      c.id, c.name, c.slug, c.icon, c.image, c.parent_id, c.is_active,
      c.commission_rate_override, c.created_at,
      coalesce((select count(*) from public.products p where p.category_id = c.id)::int, 0) as products,
      coalesce((select count(distinct p.seller_id) from public.products p where p.category_id = c.id)::int, 0) as sellers,
      coalesce((select sum(p.price * p.stock) from public.products p where p.category_id = c.id), 0)::numeric as shelf_value,
      coalesce((select count(*) from public.categories kid where kid.parent_id = c.id)::int, 0) as children
    from public.categories c
  )
select jsonb_build_object(
  'total', (select count(*) from nodes),
  'roots', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'name', n.name, 'slug', n.slug, 'icon', n.icon, 'image', n.image,
      'isActive', n.is_active, 'commissionOverride', n.commission_rate_override,
      'products', n.products, 'sellers', n.sellers, 'shelfValue', n.shelf_value,
      'children', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', k.id, 'name', k.name, 'slug', k.slug, 'isActive', k.is_active,
          'commissionOverride', k.commission_rate_override, 'products', k.products,
          'sellers', k.sellers, 'shelfValue', k.shelf_value
        ) order by k.name)
        from nodes k
        where k.parent_id = n.id
      ), '[]'::jsonb)
    ) order by n.name)
    from nodes n
    where n.parent_id is null
  ), '[]'::jsonb),
  'unmapped', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.title, 'slug', p.slug, 'brand', p.brand, 'price', p.price,
      'stock', p.stock, 'status', p.status,
      'storeName', (select vp.store_name from public.vendor_profiles vp where vp.id = p.seller_id)
    ) order by p.created_at desc)
    from (select * from public.products where category_id is null order by created_at desc limit 50) p
  ), '[]'::jsonb)
);
$$;

-- What the platform actually charges, per seller and per category, and what that
-- choice collected. The commission page's tiers and "base tier fee" had no source.
create or replace function public.admin_commission_overview(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the commission ledger');
with
  params as (select greatest(coalesce(p_days, 30), 1) as days),
  earned as (
    select
      coalesce(sum(so.commission_amount), 0)::numeric as commission,
      coalesce(sum(so.subtotal + so.shipping_fee) filter (where so.status <> 'cancelled'), 0)::numeric as gross,
      coalesce(count(so.id), 0)::int as packages
    from public.sub_orders so, params pm
    where so.created_at >= now() - make_interval(days => pm.days)
  )
select jsonb_build_object(
  'days', (select days from params),
  'globalDefaultRate', coalesce((select cc.global_default_rate from public.commission_config cc limit 1), 0.10),
  'earned', (select to_jsonb(e) from earned e),
  'effectiveRatePct', round(coalesce((select commission from earned), 0)
    / nullif(coalesce((select gross from earned), 0), 0) * 100, 2),
  'byCategory', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug', c.slug,
      'override', c.commission_rate_override,
      'effective', coalesce(c.commission_rate_override,
                    coalesce((select cc.global_default_rate from public.commission_config cc limit 1), 0.10)),
      'gross', coalesce(t.gross, 0), 'commission', coalesce(t.commission, 0), 'sellers', coalesce(t.sellers, 0)
    ) order by coalesce(t.gross, 0) desc)
    from public.categories c
    left join lateral (
      select
        coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
        coalesce(sum(so.commission_amount), 0)::numeric as commission,
        count(distinct so.seller_id)::int as sellers
      from public.sub_orders so
      join jsonb_array_elements(so.items) line on true
      join public.products p on p.id::text = line->>'productId'
      cross join params pm
      where p.category_id = c.id and so.created_at >= now() - make_interval(days => pm.days)
    ) t on true
  ), '[]'::jsonb),
  'byVendor', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'storeName', store_name, 'override', override,
      'gross', gross, 'commission', commission
    ) order by commission desc)
    from (
      select
        vp.id,
        vp.store_name,
        vp.commission_rate_override as override,
        coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric as gross,
        coalesce(sum(so.commission_amount), 0)::numeric as commission
      from public.vendor_profiles vp
      left join public.sub_orders so on so.seller_id = vp.id
      cross join params pm
      where (so.created_at >= now() - make_interval(days => pm.days) or so.id is null)
      group by vp.id, vp.store_name, vp.commission_rate_override
      order by commission desc
      limit 25
    ) v
  ), '[]'::jsonb),
  'changes', coalesce((select jsonb_agg(jsonb_build_object(
      'id', al.id, 'action', al.action, 'entityId', al.entity_id,
      'before', al.before_data, 'after', al.after_data, 'createdAt', al.created_at,
      'actor', (select pr.name from public.profiles pr where pr.id = al.actor_id)
    ) order by al.created_at desc)
    from (select * from public.audit_logs
          where action like 'commission%' order by created_at desc limit 50) al
  ), '[]'::jsonb)
);
$$;

-- The dispatch board: open deliveries, the rider on each, and the fleet's state.
create or replace function public.admin_logistics_board()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Guarded first: this body reads across store boundaries as the function
  -- owner, so RLS cannot be the only check.
  select public.admin_require_admin('read the dispatch board');
select jsonb_build_object(
  'fleet', coalesce((select jsonb_agg(jsonb_build_object(
      'id', vr.id, 'name', vr.full_name, 'phone', vr.phone, 'vehicle', vr.vehicle_type,
      'status', vr.status,
      'active', coalesce((select count(*) from public.deliveries d
                          where d.rider_id = vr.id and d.status in ('assigned', 'picked_up', 'in_transit', 'out_for_delivery'))::int, 0),
      'completed', coalesce((select count(*) from public.deliveries d
                             where d.rider_id = vr.id and d.status = 'delivered')::int, 0)
    ) order by vr.full_name)
    from public.rider_profiles vr), '[]'::jsonb),
  'queue', coalesce((select jsonb_agg(jsonb_build_object(
      'id', so.id, 'status', so.status, 'type', so.type,
      'storeName', (select vp.store_name from public.vendor_profiles vp where vp.id = so.seller_id),
      'gross', (so.subtotal + so.shipping_fee)::numeric,
      'carrierName', so.carrier_name, 'trackingNumber', so.tracking_number,
      'riderId', so.rider_id, 'createdAt', so.created_at, 'updatedAt', so.updated_at,
      'delivery', (select jsonb_build_object('id', d.id, 'status', d.status, 'riderId', d.rider_id,
                     'assignedAt', d.assigned_at, 'pickedUpAt', d.picked_up_at, 'deliveredAt', d.delivered_at)
                   from public.deliveries d where d.sub_order_id = so.id),
      'address', (select o.shipping_address from public.orders o where o.id = so.order_group_id)
    ) order by so.created_at)
    from (select * from public.sub_orders
          where status in ('packed', 'ready_for_pickup', 'shipped', 'out_for_delivery', 'delivery_failed')
          order by created_at limit 100) so), '[]'::jsonb),
  'counts', jsonb_build_object(
    'awaitingPickup', (select count(*) from public.sub_orders where status = 'ready_for_pickup'),
    'inTransit', (select count(*) from public.sub_orders where status in ('shipped', 'out_for_delivery')),
    'failed', (select count(*) from public.sub_orders where status = 'delivery_failed'),
    'delivered', (select count(*) from public.sub_orders where status = 'delivered'),
    'ridersAvailable', (select count(*) from public.rider_profiles where status = 'available')
  )
);
$$;

-- ----------------------------------------------------------------------------
-- 5. Write RPCs: every governance decision, audited in the same transaction.
-- ----------------------------------------------------------------------------

-- Whose queue a listing sits in is separate from who decided its fate: the
-- console assigns work before it happens, then records the decision.
alter table public.products
  add column if not exists assigned_moderator_id uuid references auth.users(id) on delete set null;

-- Merchant status. Suspending a store stops it selling; it does not delete its
-- history, and it does not touch payouts already booked.
create or replace function public.admin_set_vendor_status(
  p_vendor_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_user uuid;
begin
  perform public.admin_require_admin('change a store’s status');
  if p_status not in ('active', 'suspended') then
    raise exception 'A store is either active or suspended';
  end if;

  select jsonb_build_object('status', vp.status, 'storeName', vp.store_name), vp.user_id
    into v_before, v_user
    from public.vendor_profiles vp where vp.id = p_vendor_id;
  if v_before is null then
    raise exception 'Store not found';
  end if;

  update public.vendor_profiles set status = p_status::public.vendor_state where id = p_vendor_id;

  -- The account's own standing follows, so signing in cannot land a suspended
  -- store back in its workspace. Reactivating only lifts a suspension - it never
  -- promotes an account that was never approved.
  if v_user is not null then
    if p_status = 'suspended' then
      update public.profiles set vendor_status = 'suspended'::public.vendor_status where id = v_user;
    else
      update public.profiles set vendor_status = 'approved'::public.vendor_status
       where id = v_user and vendor_status = 'suspended';
    end if;
  end if;

  perform public.admin_audit(
    'vendor.' || p_status, 'vendor', p_vendor_id::text, v_before,
    jsonb_build_object('status', p_status, 'note', p_note)
  );

  return jsonb_build_object('id', p_vendor_id, 'status', p_status);
end;
$$;

-- Commission is a rate between 0 and 50%, stored both on the row the pricing
-- function reads and in the config map the settings screens list.
create or replace function public.admin_set_vendor_commission(p_vendor_id uuid, p_rate numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before numeric;
  v_name text;
begin
  perform public.admin_require_admin('change a store’s commission');
  if p_rate is not null and (p_rate < 0 or p_rate > 0.5) then
    raise exception 'Commission must be between 0%% and 50%%';
  end if;

  select commission_rate_override, store_name into v_before, v_name
    from public.vendor_profiles where id = p_vendor_id;
  if v_name is null then
    raise exception 'Store not found';
  end if;

  update public.vendor_profiles set commission_rate_override = p_rate where id = p_vendor_id;

  update public.commission_config
     set vendor_overrides = case when p_rate is null
                                 then vendor_overrides - p_vendor_id::text
                                 else jsonb_set(vendor_overrides, array[p_vendor_id::text], to_jsonb(p_rate))
                            end,
         updated_at = now()
   where id = true;

  perform public.admin_audit(
    'commission.vendor.set', 'vendor', p_vendor_id::text,
    jsonb_build_object('rate', v_before), jsonb_build_object('rate', p_rate, 'storeName', v_name)
  );

  return jsonb_build_object('id', p_vendor_id, 'rate', p_rate);
end;
$$;

create or replace function public.admin_set_global_commission(p_rate numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before numeric;
begin
  perform public.admin_require_admin('change the platform commission');
  if p_rate is null or p_rate < 0 or p_rate > 0.5 then
    raise exception 'Commission must be between 0%% and 50%%';
  end if;

  select global_default_rate into v_before from public.commission_config where id = true;
  if v_before is null then
    raise exception 'Commission configuration is missing';
  end if;

  update public.commission_config set global_default_rate = p_rate, updated_at = now() where id = true;

  perform public.admin_audit('commission.global.set', 'commission_config', 'global',
    jsonb_build_object('rate', v_before), jsonb_build_object('rate', p_rate));

  return jsonb_build_object('rate', p_rate);
end;
$$;

create or replace function public.admin_set_category_commission(p_category_id uuid, p_rate numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before numeric;
  v_name text;
begin
  perform public.admin_require_admin('change a category commission');
  if p_rate is not null and (p_rate < 0 or p_rate > 0.5) then
    raise exception 'Commission must be between 0%% and 50%%';
  end if;

  select commission_rate_override, name into v_before, v_name
    from public.categories where id = p_category_id;
  if v_name is null then
    raise exception 'Category not found';
  end if;

  update public.categories set commission_rate_override = p_rate where id = p_category_id;

  update public.commission_config
     set category_overrides = case when p_rate is null
                                   then category_overrides - p_category_id::text
                                   else jsonb_set(category_overrides, array[p_category_id::text], to_jsonb(p_rate))
                              end,
         updated_at = now()
   where id = true;

  perform public.admin_audit('commission.category.set', 'category', p_category_id::text,
    jsonb_build_object('rate', v_before), jsonb_build_object('rate', p_rate, 'name', v_name));

  return jsonb_build_object('id', p_category_id, 'rate', p_rate);
end;
$$;

-- Moderation, one row at a time inside the loop, so a batch reports which rows
-- it decided instead of claiming a whole selection succeeded.
create or replace function public.admin_moderate_products(
  p_product_ids uuid[],
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_current text;
  v_decided uuid[] := '{}';
begin
  perform public.admin_require_admin('moderate listings');
  if p_status not in ('approved', 'rejected', 'archived', 'pending_review') then
    raise exception 'Invalid moderation status';
  end if;
  if p_status = 'rejected' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'A rejected listing needs a reason the seller can read';
  end if;

  foreach v_id in array coalesce(p_product_ids, '{}') loop
    select status::text into v_current from public.products where id = v_id;
    if v_current is null then
      continue;
    end if;
    if v_current = p_status then
      continue;
    end if;

    update public.products
       set status = p_status::public.moderation_status,
           rejection_reason = case when p_status = 'rejected' then p_reason else null end,
           moderated_by = auth.uid(),
           moderated_at = now()
     where id = v_id;

    perform public.admin_audit('product.' || p_status, 'product', v_id::text,
      jsonb_build_object('status', v_current), jsonb_build_object('status', p_status, 'reason', p_reason));

    v_decided := v_decided || v_id;
  end loop;

  return jsonb_build_object('decided', coalesce(array_length(v_decided, 1), 0), 'ids', to_jsonb(v_decided));
end;
$$;

create or replace function public.admin_assign_moderator(p_product_id uuid, p_moderator_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  perform public.admin_require_admin('assign a listing to a moderator');

  select exists (
    select 1 from public.profiles
     where id = p_moderator_id
       and (roles @> array['admin'::public.user_role] or roles @> array['support'::public.user_role])
  ) into v_found;
  if not v_found then
    raise exception 'That account is not staff, so it cannot hold moderation work';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Listing not found';
  end if;

  update public.products set assigned_moderator_id = p_moderator_id where id = p_product_id;

  perform public.admin_audit('product.assign_moderator', 'product', p_product_id::text,
    null, jsonb_build_object('moderatorId', p_moderator_id));

  return jsonb_build_object('id', p_product_id, 'moderatorId', p_moderator_id);
end;
$$;

-- A first-party listing is still a listing: same table, same moderation column,
-- owned by the platform's own store. It cannot be created already invisible.
create or replace function public.admin_create_product_1p(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid;
  v_status text := coalesce(p_input->>'status', 'pending_review');
  v_id uuid;
begin
  perform public.admin_require_admin('publish a first-party listing');

  select id into v_store from public.vendor_profiles where seller_type = 'platform' limit 1;
  if v_store is null then
    raise exception 'The platform has no store record to sell from';
  end if;
  if coalesce(btrim(p_input->>'title'), '') = '' then
    raise exception 'A listing needs a title';
  end if;
  if coalesce((p_input->>'price')::numeric, 0) <= 0 then
    raise exception 'A listing needs a price above zero';
  end if;
  if v_status not in ('draft', 'pending_review', 'approved') then
    raise exception 'A new listing can be a draft, sent for review, or approved';
  end if;

  insert into public.products (
    title, slug, description, category_id, brand, images, price, compare_at_price,
    type, seller_id, variants, stock, shipping_settings, digital_asset_info, status,
    rating, review_count, moderated_by, moderated_at
  )
  values (
    btrim(p_input->>'title'),
    coalesce(nullif(btrim(p_input->>'slug'), ''),
             regexp_replace(lower(btrim(p_input->>'title')), '[^a-z0-9]+', '-', 'g')),
    coalesce(p_input->>'description', ''),
    nullif(p_input->>'categoryId', '')::uuid,
    coalesce(p_input->>'brand', ''),
    coalesce((select array_agg(t) from jsonb_array_elements_text(coalesce(p_input->'images', '[]'::jsonb)) t), '{}'),
    (p_input->>'price')::numeric,
    nullif(p_input->>'compareAtPrice', '')::numeric,
    coalesce(nullif(p_input->>'type', ''), 'physical')::public.product_type,
    v_store,
    coalesce(p_input->'variants', '[]'::jsonb),
    greatest(coalesce((p_input->>'stock')::int, 0), 0),
    coalesce(p_input->'shippingSettings', '{}'::jsonb),
    coalesce(p_input->'digitalAssetInfo', '{}'::jsonb),
    v_status::public.moderation_status,
    0, 0,
    case when v_status = 'approved' then auth.uid() else null end,
    case when v_status = 'approved' then now() else null end
  )
  returning id into v_id;

  perform public.admin_audit('product.create_1p', 'product', v_id::text, null,
    jsonb_build_object('title', p_input->>'title', 'status', v_status, 'price', p_input->>'price'));

  return jsonb_build_object('id', v_id, 'status', v_status, 'sellerId', v_store);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Accounts, risk and money leaving the platform.
-- ----------------------------------------------------------------------------

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before text;
begin
  perform public.admin_require_admin('change an account’s status');
  if p_status not in ('active', 'suspended', 'banned') then
    raise exception 'Unknown account status';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot suspend your own account';
  end if;

  select account_status::text into v_before from public.profiles where id = p_user_id;
  if v_before is null then
    raise exception 'Account not found';
  end if;

  update public.profiles
     set account_status = p_status::public.account_state,
         account_status_reason = p_reason,
         account_status_at = now()
   where id = p_user_id;

  perform public.admin_audit('account.' || p_status, 'user', p_user_id::text,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status, 'reason', p_reason));

  return jsonb_build_object('id', p_user_id, 'status', p_status);
end;
$$;

-- Roles are how the console authorises itself, so an admin cannot re-write their
-- own: the last role removed would be the one that let them remove it.
create or replace function public.admin_set_user_roles(p_user_id uuid, p_roles text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.user_role[];
  v_role text;
begin
  perform public.admin_require_admin('change an account’s roles');
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own roles';
  end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 then
    raise exception 'An account needs at least one role';
  end if;

  foreach v_role in array p_roles loop
    if not exists (select 1 from pg_enum e
                   join pg_type t on t.oid = e.enumtypid
                   where t.typname = 'user_role' and e.enumlabel = v_role) then
      raise exception 'Unknown role %', v_role;
    end if;
  end loop;

  select roles into v_before from public.profiles where id = p_user_id;
  if v_before is null then
    raise exception 'Account not found';
  end if;

  update public.profiles set roles = p_roles::public.user_role[] where id = p_user_id;

  perform public.admin_audit('account.roles', 'user', p_user_id::text,
    jsonb_build_object('roles', to_jsonb(v_before)), jsonb_build_object('roles', to_jsonb(p_roles)));

  return jsonb_build_object('id', p_user_id, 'roles', to_jsonb(p_roles));
end;
$$;

create or replace function public.admin_issue_strike(p_vendor_id uuid, p_reason text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform public.admin_require_admin('record a strike against a store');
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A strike needs a reason';
  end if;
  if not exists (select 1 from public.vendor_profiles where id = p_vendor_id) then
    raise exception 'Store not found';
  end if;

  insert into public.vendor_strikes (vendor_id, reason, note, issued_by)
  values (p_vendor_id, btrim(p_reason), p_note, auth.uid());

  select count(*) into v_count from public.vendor_strikes where vendor_id = p_vendor_id;

  perform public.admin_audit('vendor.strike', 'vendor', p_vendor_id::text, null,
    jsonb_build_object('reason', p_reason, 'note', p_note, 'total', v_count));

  return jsonb_build_object('vendorId', p_vendor_id, 'strikes', v_count);
end;
$$;

-- A refund is a record, not a status flip: how much, against which package, why,
-- and who said so. The gateway call is out of scope for Vendora, so the row says
-- what the platform decided rather than pretending money moved through a PSP.
create or replace function public.admin_refund_sub_order(
  p_sub_order_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg record;
  v_already numeric;
begin
  perform public.admin_require_admin('refund a package');

  select so.id, so.order_group_id, (so.subtotal + so.shipping_fee) as gross, so.status::text, o.customer_email
    into v_pkg
    from public.sub_orders so
    join public.orders o on o.id = so.order_group_id
   where so.id = p_sub_order_id;
  if not found then
    raise exception 'Package not found';
  end if;
  if v_pkg.status = 'refunded' then
    raise exception 'This package has already been refunded';
  end if;

  select coalesce(sum(r.amount), 0) into v_already from public.refunds r where r.sub_order_id = p_sub_order_id;
  if p_amount is null or p_amount <= 0 then
    raise exception 'A refund needs an amount above zero';
  end if;
  if v_already + p_amount > v_pkg.gross then
    raise exception 'Cannot refund more than the buyer was charged for this package';
  end if;

  insert into public.refunds (sub_order_id, order_group_id, amount, reason, processed_by)
  values (p_sub_order_id, v_pkg.order_group_id, p_amount, coalesce(btrim(p_reason), 'Platform administrative refund'), auth.uid());

  update public.sub_orders
     set status = 'refunded'::public.sub_order_status,
         history = history || jsonb_build_array(jsonb_build_object(
           'status', 'refunded', 'timestamp', now(), 'actor', 'Admin',
           'note', format('Refunded %s: %s', p_amount, coalesce(p_reason, 'no reason recorded'))
         ))
   where id = p_sub_order_id;

  -- Only when nothing on the order is left unrefunded does the order itself read
  -- as refunded; a partial refund is still a live sale.
  update public.orders set payment_status = 'refunded'::public.payment_status
   where id = v_pkg.order_group_id
     and not exists (
       select 1 from public.sub_orders so2
       where so2.order_group_id = v_pkg.order_group_id and so2.status <> 'refunded'
     );

  perform public.admin_audit('order.refund', 'sub_order', p_sub_order_id::text,
    jsonb_build_object('status', v_pkg.status, 'refundedSoFar', v_already),
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'gross', v_pkg.gross));

  return jsonb_build_object('subOrderId', p_sub_order_id, 'amount', p_amount, 'reason', p_reason);
end;
$$;

-- Escalation is a hand-off with a reason the next agent can read; the note goes on
-- the case as an internal note rather than vanishing into a toast.
create or replace function public.admin_escalate_dispute(p_dispute_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before text;
  v_name text;
begin
  perform public.admin_require_admin('escalate a dispute');

  select d.status::text, pr.name into v_before, v_name
    from public.disputes d left join public.profiles pr on pr.id = auth.uid()
   where d.id = p_dispute_id;
  if v_before is null then
    raise exception 'Dispute not found';
  end if;

  update public.disputes
     set status = 'escalated'::public.dispute_status,
         urgency = 'urgent'::public.dispute_urgency,
         assigned_agent_id = auth.uid()
   where id = p_dispute_id;

  if coalesce(btrim(p_note), '') <> '' then
    insert into public.dispute_messages (dispute_id, sender_id, sender_role, sender_name, content, is_internal_note)
    values (p_dispute_id, auth.uid(), 'support', coalesce(v_name, 'Staff'), btrim(p_note), true);
  end if;

  perform public.admin_audit('dispute.escalate', 'dispute', p_dispute_id::text,
    jsonb_build_object('status', v_before), jsonb_build_object('status', 'escalated', 'note', p_note));

  return jsonb_build_object('id', p_dispute_id, 'status', 'escalated');
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Taxonomy.
-- ----------------------------------------------------------------------------

create or replace function public.admin_create_category(
  p_name text,
  p_slug text,
  p_parent_id uuid default null,
  p_icon text default null,
  p_image text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.admin_require_admin('create a category');
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A category needs a name';
  end if;
  if coalesce(btrim(p_slug), '') = '' then
    raise exception 'A category needs a slug';
  end if;
  if p_parent_id is not null and not exists (select 1 from public.categories where id = p_parent_id) then
    raise exception 'The parent category does not exist';
  end if;

  insert into public.categories (name, slug, parent_id, icon, image)
  values (btrim(p_name), lower(btrim(p_slug)), p_parent_id, p_icon, p_image)
  returning id into v_id;

  perform public.admin_audit('category.create', 'category', v_id::text, null,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'parentId', p_parent_id));

  return jsonb_build_object('id', v_id, 'name', p_name, 'slug', p_slug);
end;
$$;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text default null,
  p_slug text default null,
  p_parent_id uuid default null,
  p_is_active boolean default null,
  p_icon text default null,
  p_image text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  perform public.admin_require_admin('edit a category');

  select jsonb_build_object('name', name, 'slug', slug, 'parentId', parent_id, 'isActive', is_active)
    into v_before from public.categories where id = p_category_id;
  if v_before is null then
    raise exception 'Category not found';
  end if;
  -- A category cannot sit inside itself; that breaks the tree the page walks.
  if p_parent_id = p_category_id then
    raise exception 'A category cannot be its own parent';
  end if;

  update public.categories
     set name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
         slug = coalesce(nullif(lower(btrim(coalesce(p_slug, ''))), ''), slug),
         parent_id = case when p_parent_id is not null then p_parent_id else parent_id end,
         is_active = coalesce(p_is_active, is_active),
         icon = coalesce(p_icon, icon),
         image = coalesce(p_image, image)
   where id = p_category_id;

  perform public.admin_audit('category.update', 'category', p_category_id::text, v_before,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'parentId', p_parent_id, 'isActive', p_is_active));

  return jsonb_build_object('id', p_category_id);
end;
$$;

-- Deleting is refused while listings point at the category: silently orphaning
-- a shelf of products is the kind of thing an audit trail exists to prevent.
create or replace function public.admin_delete_category(p_category_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_products int;
  v_children int;
begin
  perform public.admin_require_admin('delete a category');

  select count(*) into v_products from public.products where category_id = p_category_id;
  select count(*) into v_children from public.categories where parent_id = p_category_id;
  if v_products > 0 then
    raise exception 'This category still has % listing(s). Re-assign them first', v_products;
  end if;
  if v_children > 0 then
    raise exception 'This category still has % subcategor(y/ies). Move them first', v_children;
  end if;

  delete from public.categories where id = p_category_id;

  perform public.admin_audit('category.delete', 'category', p_category_id::text, null, null);

  return jsonb_build_object('id', p_category_id, 'deleted', true);
end;
$$;

create or replace function public.admin_assign_product_category(p_product_id uuid, p_category_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before uuid;
begin
  perform public.admin_require_admin('move a listing between categories');

  select category_id into v_before from public.products where id = p_product_id;
  if v_before is null and not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Listing not found';
  end if;
  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'Category not found';
  end if;

  update public.products set category_id = p_category_id where id = p_product_id;

  perform public.admin_audit('product.category', 'product', p_product_id::text,
    jsonb_build_object('categoryId', v_before), jsonb_build_object('categoryId', p_category_id));

  return jsonb_build_object('id', p_product_id, 'categoryId', p_category_id);
end;
$$;

-- The keys the settings page actually changes something about. Anything else on
-- that form has no effect on this app, so it is not stored and not claimed.
create or replace function public.admin_save_platform_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  perform public.admin_require_admin('change platform settings');

  select to_jsonb(ps) into v_before from public.platform_settings ps where ps.id = true;

  update public.platform_settings set
    platform_name = coalesce(nullif(btrim(coalesce(p_settings->>'platformName', '')), ''), platform_name),
    support_email = coalesce(nullif(btrim(coalesce(p_settings->>'supportEmail', '')), ''), support_email),
    default_currency = coalesce(nullif(btrim(coalesce(p_settings->>'currency', '')), ''), default_currency),
    payout_schedule = coalesce(nullif(btrim(coalesce(p_settings->>'payoutSchedule', '')), ''), payout_schedule),
    min_payout_floor = coalesce((p_settings->>'minPayoutFloor')::numeric, min_payout_floor),
    reserve_retention_days = coalesce((p_settings->>'reserveRetentionDays')::int, reserve_retention_days),
    new_listing_review = coalesce(nullif(btrim(coalesce(p_settings->>'newListingReview', '')), ''), new_listing_review),
    sla_ceiling_hours = coalesce((p_settings->>'slaCeilingHours')::int, sla_ceiling_hours),
    updated_by = auth.uid(),
    updated_at = now()
  where id = true;

  perform public.admin_audit('settings.update', 'platform_settings', 'global',
    v_before, (select to_jsonb(ps) from public.platform_settings ps where ps.id = true));

  return (select to_jsonb(ps) from public.platform_settings ps where ps.id = true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. RLS and grants.
-- ----------------------------------------------------------------------------

alter table public.platform_settings enable row level security;
alter table public.vendor_strikes enable row level security;
alter table public.refunds enable row level security;

-- Platform settings: staff reads and writes them through the RPCs above, and the
-- storefront needs the currency and payout cadence to render honestly.
create policy platform_settings_read on public.platform_settings
  for select to authenticated, anon using (true);
create policy platform_settings_write_admin on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Strikes belong to the store's record: the platform sees all, the accused store
-- sees its own, and nobody but a staff write path can add one.
create policy strikes_read on public.vendor_strikes
  for select to authenticated
  using (public.is_admin() or public.current_vendor_id() = vendor_id);
create policy strikes_write_admin on public.vendor_strikes
  for insert to authenticated with check (public.is_admin());

-- A buyer may see the money returned on an order they are on; the platform sees
-- every refund. No update policy: a refund is a fact, not a draft.
create policy refunds_read on public.refunds
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_group_id and o.customer_id = auth.uid())
  );
create policy refunds_write_admin on public.refunds
  for insert to authenticated with check (public.is_admin());

-- Console reads that cross store boundaries: the platform is a party to every
-- order and dispute, and staff must be able to list accounts.
create policy orders_select_admin on public.orders
  for select to authenticated using (public.is_admin() or public.has_role('support'));
create policy disputes_select_admin on public.disputes
  for select to authenticated using (public.is_admin() or public.has_role('support'));
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin() or public.has_role('support'));
create policy payouts_select_staff on public.payouts
  for select to authenticated using (public.is_admin() or public.has_role('support'));

-- The new columns ride the policies their table already has.
grant select, insert, update, delete on
  public.platform_settings, public.vendor_strikes, public.refunds
  to authenticated, service_role;
grant select on public.platform_settings to anon;

grant execute on function
  public.admin_require_admin(text),
  public.admin_audit(text, text, text, jsonb, jsonb),
  public.admin_vendor_settled_gmv(uuid, integer),
  public.admin_vendor_tier(uuid, integer),
  public.admin_dashboard(integer),
  public.admin_vendor_queue(text, text, integer, integer),
  public.admin_vendor_detail(uuid),
  public.admin_moderation_queue(text, text, uuid, integer, integer),
  public.admin_order_queue(text, text, text, integer, integer),
  public.admin_order_detail(uuid),
  public.admin_user_queue(text, text, text, integer, integer),
  public.admin_dispute_queue(text, text, integer, integer),
  public.admin_audit_queue(text, text, integer, integer),
  public.admin_report_summary(integer, text),
  public.admin_category_tree(),
  public.admin_commission_overview(integer),
  public.admin_logistics_board(),
  public.admin_set_vendor_status(uuid, text, text),
  public.admin_set_vendor_commission(uuid, numeric),
  public.admin_set_global_commission(numeric),
  public.admin_set_category_commission(uuid, numeric),
  public.admin_moderate_products(uuid[], text, text),
  public.admin_assign_moderator(uuid, uuid),
  public.admin_create_product_1p(jsonb),
  public.admin_set_user_status(uuid, text, text),
  public.admin_set_user_roles(uuid, text[]),
  public.admin_issue_strike(uuid, text, text),
  public.admin_refund_sub_order(uuid, numeric, text),
  public.admin_escalate_dispute(uuid, text),
  public.admin_create_category(text, text, uuid, text, text),
  public.admin_update_category(uuid, text, text, uuid, boolean, text, text),
  public.admin_delete_category(uuid),
  public.admin_assign_product_category(uuid, uuid),
  public.admin_save_platform_settings(jsonb)
to authenticated, service_role;

revoke execute on function
  public.admin_audit(text, text, text, jsonb, jsonb),
  public.admin_vendor_detail(uuid),
  public.admin_vendor_queue(text, text, integer, integer),
  public.admin_moderation_queue(text, text, uuid, integer, integer),
  public.admin_order_queue(text, text, text, integer, integer),
  public.admin_order_detail(uuid),
  public.admin_user_queue(text, text, text, integer, integer),
  public.admin_dispute_queue(text, text, integer, integer),
  public.admin_audit_queue(text, text, integer, integer),
  public.admin_report_summary(integer, text),
  public.admin_category_tree(),
  public.admin_commission_overview(integer),
  public.admin_logistics_board(),
  public.admin_set_vendor_status(uuid, text, text),
  public.admin_set_vendor_commission(uuid, numeric),
  public.admin_set_global_commission(numeric),
  public.admin_set_category_commission(uuid, numeric),
  public.admin_moderate_products(uuid[], text, text),
  public.admin_assign_moderator(uuid, uuid),
  public.admin_create_product_1p(jsonb),
  public.admin_set_user_status(uuid, text, text),
  public.admin_set_user_roles(uuid, text[]),
  public.admin_issue_strike(uuid, text, text),
  public.admin_refund_sub_order(uuid, numeric, text),
  public.admin_escalate_dispute(uuid, text),
  public.admin_create_category(text, text, uuid, text, text),
  public.admin_update_category(uuid, text, text, uuid, boolean, text, text),
  public.admin_delete_category(uuid),
  public.admin_assign_product_category(uuid, uuid),
  public.admin_save_platform_settings(jsonb)
from anon;

