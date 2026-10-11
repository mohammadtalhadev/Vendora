-- ============================================================================
-- Vendora Phase 5: the vendor workspace.
--
-- The seller pages used to compute their own money: `available balance` was
-- 70% of a mocked payout figure, commission fell back to 5% when a row had no
-- frozen fee, and returns/restock lived in a Zustand reducer. All of that is
-- decided here instead, on the same rows checkout already wrote.
--
--   1. the return lifecycle, kept on sub_orders (one truth per package)
--   2. the store settings the Settings/Shipping pages edit
--   3. media library + product Q&A
--   4. money and counts computed by Postgres (balance, earnings, dashboard)
--   5. seller write paths RLS deliberately forbids (tracking, returns, listing)
--   6. the promotion redemption counter, protected from its owner
--   7. grants
--
-- New enum literals are only ever referenced inside function bodies: a value
-- added by ALTER TYPE cannot be used by a statement in the same transaction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. returns: a package is returned, rejected or restocked - not a parallel
--    `returns` table that could disagree with the order it belongs to.
-- ----------------------------------------------------------------------------
alter type public.sub_order_status add value if not exists 'return_rejected';
alter type public.sub_order_status add value if not exists 'returned';

alter table public.sub_orders
  add column if not exists rma_code text,
  add column if not exists refund_amount numeric(12,2),
  add column if not exists return_decided_at timestamptz,
  add column if not exists return_reject_reason text;

-- The seller decides on their own package, but the order it belongs to is the
-- buyer's record: without this policy the vendor queue cannot name the buyer.
-- The check runs through a SECURITY DEFINER helper because sub_orders' own
-- customer policy reads orders - two policies reading each other's rows under
-- RLS is infinite recursion, not a slow query.
create or replace function public.order_has_vendor_package(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sub_orders so
    where so.order_group_id = p_order
      and so.seller_id = public.current_vendor_id()
  );
$$;

drop policy if exists orders_select_vendor on public.orders;
create policy orders_select_vendor on public.orders
  for select to authenticated
  using (public.order_has_vendor_package(orders.id));

-- ----------------------------------------------------------------------------
-- 2. store settings
-- ----------------------------------------------------------------------------
alter table public.vendor_profiles
  add column if not exists tagline text not null default '',
  add column if not exists support_email text,
  add column if not exists support_phone text,
  add column if not exists vacation_mode boolean not null default false,
  add column if not exists vacation_message text not null default '',
  add column if not exists free_shipping_threshold numeric(12,2),
  add column if not exists return_window_days integer not null default 30
    check (return_window_days between 0 and 365),
  add column if not exists restocking_fee numeric(12,2) not null default 0
    check (restocking_fee >= 0),
  add column if not exists return_shipping_payer text not null default 'buyer'
    check (return_shipping_payer in ('buyer','seller')),
  add column if not exists warranty_period text not null default '',
  add column if not exists auto_approve_returns boolean not null default false,
  add column if not exists payout_schedule text not null default 'weekly'
    check (payout_schedule in ('daily','weekly','biweekly')),
  add column if not exists payout_reserve_pct numeric(4,3) not null default 0
    check (payout_reserve_pct between 0 and 1),
  add column if not exists carriers jsonb not null default '{}'::jsonb;

-- Bank accounts: the UI collects these, and a payout needs to say which
-- account it went to. Only masked identifiers are stored, never full numbers.
alter table public.bank_accounts
  add column if not exists account_type text not null default 'checking'
    check (account_type in ('checking','savings')),
  add column if not exists masked_routing text;

-- One row per store: pickup origin, handling SLA and the rates the vendor
-- quotes. Product-level `shipping_settings` still decide the customer's bill;
-- these are the store's logistics and the defaults offered to new listings.
create table if not exists public.vendor_shipping_settings (
  vendor_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  free_shipping_enabled boolean not null default false,
  free_shipping_threshold numeric(12,2) not null default 0 check (free_shipping_threshold >= 0),
  standard_rate numeric(12,2) not null default 0 check (standard_rate >= 0),
  express_rate numeric(12,2) not null default 0 check (express_rate >= 0),
  warehouse_name text not null default '',
  street text not null default '',
  city text not null default '',
  state text not null default '',
  zip_code text not null default '',
  phone text not null default '',
  operating_hours text not null default '',
  gate_code text not null default '',
  sla_window text not null default '48h' check (sla_window in ('24h','48h','custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-store notification switches. A jsonb bag, because these are preferences
-- rather than something Postgres needs to reason about.
create table if not exists public.vendor_notification_prefs (
  vendor_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_vendor_shipping_updated before update on public.vendor_shipping_settings
  for each row execute function public.set_updated_at();
create trigger trg_vendor_notif_updated before update on public.vendor_notification_prefs
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. media library + product Q&A
-- ----------------------------------------------------------------------------
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  name text not null,
  folder text not null default 'uploads',
  object_path text not null default '',
  cdn_url text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  width integer,
  height integer,
  status text not null default 'pending' check (status in ('approved','pending','flagged')),
  created_at timestamptz not null default now()
);
create index if not exists media_items_vendor_idx on public.media_items (vendor_id, folder, created_at desc);

create table if not exists public.product_qa (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null default '',
  question text not null,
  answer text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists product_qa_vendor_idx on public.product_qa (vendor_id, published, created_at desc);
create index if not exists product_qa_product_idx on public.product_qa (product_id) where published;

-- ----------------------------------------------------------------------------
-- RLS for the new tables. Grants arrive from the defaults set in 20261011000400.
-- ----------------------------------------------------------------------------
alter table public.vendor_shipping_settings enable row level security;
alter table public.vendor_notification_prefs enable row level security;
alter table public.media_items enable row level security;
alter table public.product_qa enable row level security;

drop policy if exists shipping_select_owner on public.vendor_shipping_settings;
create policy shipping_select_owner on public.vendor_shipping_settings
  for select to authenticated
  using (vendor_id = public.current_vendor_id() or public.is_admin());

drop policy if exists shipping_write_owner on public.vendor_shipping_settings;
create policy shipping_write_owner on public.vendor_shipping_settings
  for all to authenticated
  using (vendor_id = public.current_vendor_id() or public.is_admin())
  with check (vendor_id = public.current_vendor_id() or public.is_admin());

drop policy if exists notif_prefs_select_owner on public.vendor_notification_prefs;
create policy notif_prefs_select_owner on public.vendor_notification_prefs
  for select to authenticated
  using (vendor_id = public.current_vendor_id() or public.is_admin());

drop policy if exists notif_prefs_write_owner on public.vendor_notification_prefs;
create policy notif_prefs_write_owner on public.vendor_notification_prefs
  for all to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

-- The media library is an internal workspace: never readable by anon.
drop policy if exists media_select_owner on public.media_items;
create policy media_select_owner on public.media_items
  for select to authenticated
  using (vendor_id = public.current_vendor_id() or public.is_admin() or public.has_role('support'));

-- A seller uploads and renames their own assets; only the platform can change
-- an asset's moderation status.
drop policy if exists media_write_owner on public.media_items;
create policy media_insert_owner on public.media_items
  for insert to authenticated
  with check (vendor_id = public.current_vendor_id() and status = 'pending');

create policy media_update_owner on public.media_items
  for update to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (
    vendor_id = public.current_vendor_id()
    and status = (select old_m.status from public.media_items old_m where old_m.id = media_items.id)
  );

create policy media_delete_owner on public.media_items
  for delete to authenticated
  using (vendor_id = public.current_vendor_id());

drop policy if exists media_update_admin on public.media_items;
create policy media_moderate_admin on public.media_items
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Q&A is public once answered, but a question is only visible to the people in
-- the thread until then.
drop policy if exists qa_select on public.product_qa;
create policy qa_select on public.product_qa
  for select to authenticated
  using (
    published
    or vendor_id = public.current_vendor_id()
    or customer_id = (select auth.uid())
    or public.is_admin()
    or public.has_role('support')
  );

drop policy if exists qa_select_public on public.product_qa;
create policy qa_select_public on public.product_qa
  for select using (published and answer is not null);

drop policy if exists qa_insert on public.product_qa;
create policy qa_insert on public.product_qa
  for insert to authenticated
  with check (
    -- a customer may ask about a live product, and cannot pre-answer it
    customer_id = (select auth.uid())
    and answer is null
    and not published
    and vendor_id = (select p.seller_id from public.products p where p.id = product_id)
  );

-- The seller answers and publishes; the question itself is immutable to them.
-- The immutability check cannot subquery product_qa from a product_qa policy:
-- RLS expands the sub-query, which expands the policy again, and Postgres calls
-- that infinite recursion. So the comparison lives in a definer helper, whose
-- body is planned on its own.
create or replace function public.qa_question_is_untouched(
  p_id uuid,
  p_question text,
  p_product_id uuid,
  p_customer_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.product_qa q
    where q.id = p_id
      and q.question = p_question
      and q.product_id = p_product_id
      and q.customer_name = p_customer_name
  );
$$;

drop policy if exists qa_update_vendor on public.product_qa;
create policy qa_update_vendor on public.product_qa
  for update to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (
    vendor_id = public.current_vendor_id()
    and public.qa_question_is_untouched(id, question, product_id, customer_name)
  );

-- ----------------------------------------------------------------------------
-- 6. promotion redemption counts belong to the platform, not the code's owner.
--    promos_update_vendor let a seller rewrite `usage_count`, which is how a
--    limited campaign reports the number of times it was actually claimed.
-- ----------------------------------------------------------------------------
drop policy if exists promos_update_vendor on public.promotions;
create policy promos_update_vendor on public.promotions
  for update to authenticated
  using (vendor_id = public.current_vendor_id())
  with check (
    vendor_id = public.current_vendor_id()
    and usage_count = (select old_p.usage_count from public.promotions old_p where old_p.id = promotions.id)
  );

-- promos_update_admin also covered the seller (`is_admin() or vendor_id = ...`),
-- and permissive policies are OR-ed: a guarded update simply passed through the
-- admin policy's with check instead. It now means what its name says, leaving
-- the vendor path to the single guarded policy above.
drop policy if exists promos_update_admin on public.promotions;
create policy promos_update_admin on public.promotions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. money, in SQL.
-- ----------------------------------------------------------------------------

-- What the platform owes the store: every package the buyer received (or every
-- digital licence handed out), at the commission frozen when it was booked.
create or replace function public.vendor_earned_net_payout(p_vendor uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(so.net_payout), 0)
  from public.sub_orders so
  where so.seller_id = p_vendor
    and so.status in ('delivered','available');
$$;

-- Everything already paid out that is not a failed transfer.
create or replace function public.vendor_paid_out(p_vendor uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(p.amount), 0)
  from public.payouts p
  where p.vendor_id = p_vendor
    and p.status <> 'failed';
$$;

create or replace function public.vendor_reserve(p_vendor uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select round(
    public.vendor_earned_net_payout(p_vendor) * coalesce(vp.payout_reserve_pct, 0),
    2
  )
  from public.vendor_profiles vp
  where vp.id = p_vendor;
$$;

create or replace function public.vendor_available_balance(p_vendor uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select greatest(
    0,
    coalesce(public.vendor_earned_net_payout(p_vendor), 0)
    - coalesce(public.vendor_paid_out(p_vendor), 0)
    - coalesce(public.vendor_reserve(p_vendor), 0)
  );
$$;

-- The store's own balance, for the Payouts page.
create or replace function public.vendor_balance()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_earned numeric;
  v_paid numeric;
  v_reserve numeric;
  v_pending numeric;
begin
  if v_vendor is null then
    raise exception 'No vendor store is linked to this account' using errcode = '42501';
  end if;

  select public.vendor_earned_net_payout(v_vendor) into v_earned;
  select public.vendor_paid_out(v_vendor) into v_paid;
  select public.vendor_reserve(v_vendor) into v_reserve;
  select coalesce(sum(amount), 0) into v_pending
  from public.payouts where vendor_id = v_vendor and status = 'processing';

  return jsonb_build_object(
    'vendorId', v_vendor,
    'lifetimeNet', round(v_earned, 2),
    'paidOut', round(v_paid, 2),
    'reserve', round(v_reserve, 2),
    'available', round(greatest(0, v_earned - v_paid - v_reserve), 2),
    'pendingPayouts', round(v_pending, 2)
  );
end;
$$;

-- The ledger and the monthly series, from the same columns a payout is
-- settled against. `gross` is what the buyer was charged for this package,
-- `fees` the commission frozen at booking, `net` what reaches the store. Note
-- the commission is taken on the goods, not the freight, so the identity the
-- pages rely on is `net = subtotal - fees`; `shipping` is reported separately
-- because it rides along in `gross` but never enters the payout.
create or replace function public.vendor_earnings(p_months integer default 6)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_window int := greatest(1, least(coalesce(p_months, 6), 24));
  v_out jsonb;
begin
  if v_vendor is null then
    raise exception 'No vendor store is linked to this account' using errcode = '42501';
  end if;

  with booked as (
    select
      so.id,
      so.status,
      so.type,
      so.subtotal,
      so.shipping_fee as shipping,
      (so.subtotal + so.shipping_fee) as gross,
      so.commission_amount as fees,
      so.net_payout as net,
      -- a physical package settles when the courier closes it out; the digital
      -- row has no delivery, so its last status change is the handover date.
      coalesce(
        (select d.delivered_at from public.deliveries d where d.sub_order_id = so.id),
        so.updated_at
      ) as settled_at
    from public.sub_orders so
    where so.seller_id = v_vendor
      and so.status <> 'cancelled'
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'gross', round(coalesce(sum(gross), 0), 2),
      'subtotal', round(coalesce(sum(subtotal), 0), 2),
      'shipping', round(coalesce(sum(shipping), 0), 2),
      'fees', round(coalesce(sum(fees), 0), 2),
      'net', round(coalesce(sum(net), 0), 2),
      'packages', count(*),
      'settled', round(coalesce(sum(net) filter (where status in ('delivered','available')), 0), 2),
      'processing', round(coalesce(sum(net) filter (where status not in ('delivered','available','refunded','return_rejected','returned')), 0), 2)
    ),
    'months', coalesce((
      select jsonb_agg(m.row order by (m.row ->> 'month'))
      from (
        select jsonb_build_object(
          'month', to_char(mo.month_start, 'YYYY-MM'),
          'gross', round(coalesce(sum(b.gross), 0), 2),
          'net', round(coalesce(sum(b.net), 0), 2),
          'packages', count(b.id)
        ) as row
        from generate_series(
          date_trunc('month', now()) - make_interval(months => v_window - 1),
          date_trunc('month', now()),
          interval '1 month'
        ) as mo(month_start)
        left join booked b on date_trunc('month', b.settled_at) = mo.month_start
        group by mo.month_start
      ) m
    ), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'status', x.status,
        'type', x.type,
        'subtotal', x.subtotal,
        'shipping', x.shipping,
        'gross', x.gross,
        'fees', x.fees,
        'net', x.net,
        'settledAt', x.settled_at
      ) order by x.settled_at desc)
      from (select * from booked order by settled_at desc limit 40) x
    ), '[]'::jsonb)
  )
  into v_out
  from booked;

  return v_out;
end;
$$;

-- Everything the dashboard tiles show, so the browser adds up nothing.
create or replace function public.vendor_dashboard(p_low_stock integer default 5)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_store record;
  v_out jsonb;
begin
  if v_vendor is null then
    raise exception 'No vendor store is linked to this account' using errcode = '42501';
  end if;

  select * into v_store from public.vendor_profiles where id = v_vendor;

  with so as (
    select
      so0.id,
      so0.status,
      so0.type,
      so0.subtotal,
      so0.net_payout,
      so0.commission_amount,
      so0.created_at,
      coalesce(
        (select d.delivered_at from public.deliveries d where d.sub_order_id = so0.id),
        so0.updated_at
      ) as settled_at
    from public.sub_orders so0
    where so0.seller_id = v_vendor
  ),
  pr as (
    select p.id, p.title, p.price, p.stock, p.status, p.type
    from public.products p
    where p.seller_id = v_vendor
  )
  select jsonb_build_object(
    'store', jsonb_build_object(
      'id', v_store.id,
      'storeName', v_store.store_name,
      'slug', v_store.slug,
      'sellerType', v_store.seller_type,
      'status', v_store.status,
      'rating', v_store.rating,
      'reviewCount', v_store.review_count,
      'vacationMode', v_store.vacation_mode
    ),
    'kpis', jsonb_build_object(
      'grossBooked', round(coalesce(sum(so.subtotal) filter (where so.status <> 'cancelled'), 0), 2),
      'commission', round(coalesce(sum(so.commission_amount) filter (where so.status <> 'cancelled'), 0), 2),
      'netPayout', round(coalesce(sum(so.net_payout) filter (where so.status <> 'cancelled'), 0), 2),
      'physicalSales', round(coalesce(sum(so.subtotal) filter (where so.type = 'physical' and so.status <> 'cancelled'), 0), 2),
      'digitalSales', round(coalesce(sum(so.subtotal) filter (where so.type = 'digital' and so.status <> 'cancelled'), 0), 2),
      'revenue7d', round(coalesce(sum(so.net_payout) filter (where so.status in ('delivered','available') and so.settled_at >= now() - interval '7 days'), 0), 2),
      'revenue30d', round(coalesce(sum(so.net_payout) filter (where so.status in ('delivered','available') and so.settled_at >= now() - interval '30 days'), 0), 2),
      'orders7d', count(*) filter (where so.created_at >= now() - interval '7 days'),
      'balance', public.vendor_available_balance(v_vendor)
    ),
    'stages', jsonb_build_object(
      'placed', count(*) filter (where so.status = 'placed'),
      'confirmed', count(*) filter (where so.status = 'confirmed'),
      'packed', count(*) filter (where so.status in ('packed','ready_for_pickup')),
      'inTransit', count(*) filter (where so.status in ('shipped','out_for_delivery')),
      'delivered', count(*) filter (where so.status in ('delivered','available')),
      'returns', count(*) filter (where so.status in ('return_requested','return_approved','returned')),
      'cancelled', count(*) filter (where so.status in ('cancelled','refunded','return_rejected'))
    ),
    'catalog', jsonb_build_object(
      'approved', (select count(*) from pr where pr.status = 'approved'),
      'pendingReview', (select count(*) from pr where pr.status = 'pending_review'),
      'rejected', (select count(*) from pr where pr.status = 'rejected'),
      'draft', (select count(*) from pr where pr.status = 'draft'),
      'archived', (select count(*) from pr where pr.status = 'archived'),
      'lowStock', (select count(*) from pr where pr.stock > 0 and pr.stock <= greatest(1, coalesce(p_low_stock, 5))),
      'outOfStock', (select count(*) from pr where pr.stock = 0),
      'units', (select coalesce(sum(pr.stock), 0) from pr),
      'valuation', round(coalesce((select sum(pr.stock * pr.price) from pr), 0), 2)
    ),
    'engagement', jsonb_build_object(
      'openThreads', (
        select count(*) from public.message_threads t
        where t.vendor_id = v_vendor and t.status in ('open','pending','urgent')
      ),
      'unreadMessages', (
        select count(*) from public.messages m
        join public.message_threads t on t.id = m.thread_id
        where t.vendor_id = v_vendor and m.read = false and m.sender_role = 'customer'
      ),
      'activePromotions', (
        select count(*) from public.promotions p
        where p.vendor_id = v_vendor and p.active
      ),
      'unansweredQuestions', (
        select count(*) from public.product_qa q
        where q.vendor_id = v_vendor and q.answer is null
      )
    ),
    'topProducts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', t.product_id,
        'title', t.title,
        'units', t.units,
        'revenue', round(t.revenue, 2)
      ) order by t.units desc, t.revenue desc)
      from (
        select
          (i ->> 'productId')::uuid as product_id,
          max(p.title) as title,
          sum((i ->> 'quantity')::int) as units,
          sum((i ->> 'price')::numeric * (i ->> 'quantity')::int) as revenue
        from public.sub_orders so2
        join lateral jsonb_array_elements(so2.items) i on true
        join public.products p on p.id = (i ->> 'productId')::uuid
        where so2.seller_id = v_vendor and so2.status in ('delivered','available')
        group by 1
        order by units desc, revenue desc
        limit 5
      ) t
    ), '[]'::jsonb),
    'recentPackages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'type', r.type,
        'net', r.net_payout,
        'buyerEmail', r.customer_email,
        'createdAt', r.created_at
      ) order by r.created_at desc)
      from (
        select so3.id, so3.status, so3.type, so3.net_payout, so3.created_at, o.customer_email
        from public.sub_orders so3
        join public.orders o on o.id = so3.order_group_id
        where so3.seller_id = v_vendor
        order by so3.created_at desc
        limit 6
      ) r
    ), '[]'::jsonb)
  )
  into v_out
  from so;

  return v_out;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. seller write paths that RLS keeps away from the table itself.
-- ----------------------------------------------------------------------------

-- sub_orders has no UPDATE policy for anyone: carrier and tracking numbers are
-- recorded here so the history trail stays consistent with the status changes.
create or replace function public.update_sub_order_tracking(
  p_sub_order_id uuid,
  p_carrier_name text,
  p_tracking_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Package not found';
  end if;
  if v_so.type <> 'physical' then
    raise exception 'Digital packages have nothing to track';
  end if;

  if not (
    public.is_admin()
    or public.has_role('support')
    or coalesce(v_so.seller_id = public.current_vendor_id(), false)
  ) then
    raise exception 'This package is not yours to update' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_tracking_number, '')), '') is null then
    raise exception 'A tracking number is required';
  end if;

  update public.sub_orders
  set carrier_name = nullif(btrim(coalesce(p_carrier_name, '')), ''),
      tracking_number = btrim(p_tracking_number),
      history = history || jsonb_build_array(jsonb_build_object(
        'status', v_so.status,
        'timestamp', now(),
        'actor', case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
        'note', 'Tracking ' || btrim(p_tracking_number) ||
                ' added via ' || coalesce(nullif(btrim(coalesce(p_carrier_name, '')), ''), 'the seller carrier')
      ))
  where id = p_sub_order_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (
    v_uid,
    case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
    'shipment.tracking_updated', 'sub_order', p_sub_order_id::text,
    jsonb_build_object('carrier', p_carrier_name, 'trackingNumber', p_tracking_number)
  );

  return jsonb_build_object(
    'id', p_sub_order_id,
    'carrierName', nullif(btrim(coalesce(p_carrier_name, '')), ''),
    'trackingNumber', btrim(p_tracking_number)
  );
end;
$$;

-- The return decision. Approving mints the RMA the buyer quotes; declining
-- keeps the reason, so the package never silently disappears from the queue.
create or replace function public.decide_return(
  p_sub_order_id uuid,
  p_decision text,
  p_refund_amount numeric default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_next public.sub_order_status;
  v_rma text;
begin
  if p_decision not in ('approve','decline') then
    raise exception 'Decision must be approve or decline';
  end if;

  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Package not found';
  end if;
  if not (
    public.is_admin()
    or public.has_role('support')
    or coalesce(v_so.seller_id = public.current_vendor_id(), false)
  ) then
    raise exception 'This return is not yours to decide' using errcode = '42501';
  end if;

  if v_so.status = 'return_approved' and p_decision = 'approve' then
    raise exception 'This return is already approved';
  end if;
  if v_so.status <> 'return_requested' then
    raise exception 'Nothing to decide: this package is %', v_so.status;
  end if;

  if p_decision = 'approve' then
    v_rma := 'RMA-' || upper(substr(md5(random()::text || p_sub_order_id::text), 1, 8));
    update public.sub_orders
    set status = 'return_approved',
        rma_code = v_rma,
        refund_amount = coalesce(p_refund_amount, round(v_so.subtotal, 2)),
        return_decided_at = now(),
        return_reject_reason = null,
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'return_approved',
          'timestamp', now(),
          'actor', case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
          'note', 'Return approved · RMA ' || v_rma
        ))
    where id = p_sub_order_id;
  else
    if nullif(btrim(coalesce(p_reason, '')), '') is null then
      raise exception 'Tell the buyer why the return was declined';
    end if;
    update public.sub_orders
    set status = 'return_rejected',
        return_decided_at = now(),
        return_reject_reason = btrim(p_reason),
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'return_rejected',
          'timestamp', now(),
          'actor', case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
          'note', btrim(p_reason)
        ))
    where id = p_sub_order_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (
    auth.uid(),
    case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
    'return.' || p_decision, 'sub_order', p_sub_order_id::text,
    jsonb_build_object('decision', p_decision, 'refundAmount', p_refund_amount, 'reason', p_reason)
  );

  return jsonb_build_object(
    'id', p_sub_order_id,
    'decision', p_decision,
    'status', case when p_decision = 'approve' then 'return_approved' else 'return_rejected' end,
    'rmaCode', case when p_decision = 'approve' then v_rma else null end,
    'refundAmount', case when p_decision = 'approve' then coalesce(p_refund_amount, v_so.subtotal) else null end
  );
end;
$$;

-- Restocking is the part a reducer could fake and a database cannot: the units
-- go back on the shelf in the same transaction the return is closed.
create or replace function public.complete_return(p_sub_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_line record;
  v_stock integer;
  v_restocked jsonb := '[]'::jsonb;
begin
  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Package not found';
  end if;
  if not (
    public.is_admin()
    or public.has_role('support')
    or coalesce(v_so.seller_id = public.current_vendor_id(), false)
  ) then
    raise exception 'This return is not yours to close' using errcode = '42501';
  end if;
  if v_so.status <> 'return_approved' then
    raise exception 'Only an approved return can be restocked (this one is %)', v_so.status;
  end if;
  if v_so.type <> 'physical' then
    raise exception 'Digital packages are refunded, not restocked';
  end if;

  update public.sub_orders
  set status = 'returned',
      history = history || jsonb_build_array(jsonb_build_object(
        'status', 'returned',
        'timestamp', now(),
        'actor', case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
        'note', 'Returned stock received and put back on the shelf'
      ))
  where id = p_sub_order_id;

  for v_line in
    -- sub_orders.items is written by place_order with camelCase keys; reading
    -- product_id here would silently match nothing and the stock would stay down.
    select (i ->> 'productId')::uuid as product_id, (i ->> 'quantity')::int as qty
    from jsonb_array_elements(v_so.items) i
  loop
    update public.products
    set stock = stock + v_line.qty
    where id = v_line.product_id
      and seller_id = v_so.seller_id
    returning stock into v_stock;

    v_restocked := v_restocked || jsonb_build_object(
      'productId', v_line.product_id,
      'returned', v_line.qty,
      'stock', v_stock
    );
  end loop;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (
    auth.uid(),
    case when v_so.seller_id = public.current_vendor_id() then 'Vendor' else 'Staff' end,
    'return.restocked', 'sub_order', p_sub_order_id::text, v_restocked
  );

  return jsonb_build_object('id', p_sub_order_id, 'status', 'returned', 'restocked', v_restocked);
end;
$$;

-- Withdraw a listing or send it back for review. Approval itself stays in
-- moderate_product: a seller cannot mark their own work approved.
create or replace function public.set_vendor_product_listing(p_product_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.products%rowtype;
  v_next text;
begin
  if p_action not in ('submit','withdraw') then
    raise exception 'Action must be submit or withdraw';
  end if;

  select * into v_p from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;
  if not coalesce(v_p.seller_id = public.current_vendor_id(), false) and not public.is_admin() then
    raise exception 'This listing is not yours' using errcode = '42501';
  end if;

  if p_action = 'submit' then
    if v_p.status not in ('draft','rejected') then
      raise exception 'A % listing does not need to be submitted', v_p.status;
    end if;
    v_next := 'pending_review';
  else
    if v_p.status not in ('draft','pending_review','rejected') then
      raise exception 'Approved listings are withdrawn by the platform, not by the seller';
    end if;
    v_next := 'draft';
  end if;

  update public.products
  set status = v_next::public.moderation_status,
      rejection_reason = case when p_action = 'submit' then null else rejection_reason end
  where id = p_product_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), 'Vendor', 'product.' || p_action, 'product', p_product_id::text,
    jsonb_build_object('status', v_p.status), jsonb_build_object('status', v_next)
  );

  return jsonb_build_object('id', p_product_id, 'status', v_next);
end;
$$;

-- Payouts: the balance rule now lives with the balance. Instant transfers carry
-- the fee the Payouts page advertises, and it is recorded, not implied.
-- The one-argument version is dropped rather than overloaded: two signatures
-- with different balance rules would be two answers to "what can I withdraw".
drop function if exists public.request_payout(numeric);
create or replace function public.request_payout(p_amount numeric, p_method text default 'instant')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_available numeric;
  v_fee numeric;
  v_payout_id uuid;
  v_ref text;
begin
  if v_vendor is null then
    raise exception 'No vendor store for this account' using errcode = '42501';
  end if;
  if p_method not in ('instant','standard') then
    raise exception 'Payout method must be instant or standard';
  end if;
  if p_amount <= 0 then
    raise exception 'Payout amount must be positive';
  end if;

  v_available := public.vendor_available_balance(v_vendor);
  if p_amount > v_available then
    raise exception 'Payout exceeds available balance of %', v_available;
  end if;

  v_fee := case when p_method = 'instant' then round(p_amount * 0.015, 2) else 0 end;
  v_ref := 'FAST-' || (floor(10000000 + random() * 90000000))::int::text;

  insert into public.payouts (vendor_id, amount, status, payment_method, payment_reference, metadata)
  values (
    v_vendor,
    p_amount,
    'processing',
    case when p_method = 'instant' then 'ACH Instant Direct Transfer' else 'ACH Standard Transfer' end,
    v_ref,
    jsonb_build_object(
      'type', p_method,
      'fee', v_fee,
      'deposit', round(p_amount - v_fee, 2),
      'balanceAfter', round(v_available - p_amount, 2)
    )
  )
  returning id into v_payout_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Vendor', 'payout.requested', 'payout', v_payout_id::text,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'fee', v_fee));

  return jsonb_build_object(
    'payoutId', v_payout_id,
    'reference', v_ref,
    'amount', p_amount,
    'fee', v_fee,
    'deposit', round(p_amount - v_fee, 2)
  );
end;
$$;

-- Default the bank account the payout would go to; only one per store.
create or replace function public.set_default_bank_account(p_bank_account_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
begin
  if v_vendor is null then
    raise exception 'No vendor store for this account' using errcode = '42501';
  end if;

  update public.bank_accounts set is_default = false
  where vendor_id = v_vendor and id <> p_bank_account_id;

  update public.bank_accounts set is_default = true
  where id = p_bank_account_id and vendor_id = v_vendor;

  if not found then
    raise exception 'That bank account is not yours' using errcode = '42501';
  end if;
  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- The state machine gains the two return outcomes. Vendor, admin and support
-- may approve or decline their own returns; restocking is `complete_return`.
-- ----------------------------------------------------------------------------
create or replace function public.advance_sub_order_status(
  p_sub_order_id uuid,
  p_next text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_transitions text[];
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Sub-order not found';
  end if;
  if v_so.status::text = p_next then
    raise exception 'Sub-order is already in this status';
  end if;

  select case
    when public.is_admin() then 'admin'
    when public.has_role('support') then 'support'
    when v_so.seller_id = public.current_vendor_id() then 'vendor'
    when exists (
      select 1 from public.rider_profiles rp
      where rp.user_id = v_uid and rp.id = v_so.rider_id
    ) then 'rider'
    when exists (
      select 1 from public.orders o
      where o.id = v_so.order_group_id and o.customer_id = v_uid
    ) then 'customer'
    else 'none'
  end into v_actor_role;

  v_transitions := case
    when v_so.status::text = 'placed' then
      array['confirmed','paid','available','cancelled']
    when v_so.status::text = 'confirmed' then array['packed','cancelled']
    when v_so.status::text = 'packed' then array['ready_for_pickup','cancelled']
    when v_so.status::text = 'ready_for_pickup' then array['shipped','cancelled']
    when v_so.status::text = 'shipped' then array['out_for_delivery']
    when v_so.status::text = 'out_for_delivery' then array['delivered','delivery_failed']
    when v_so.status::text = 'delivery_failed' then array['out_for_delivery','cancelled']
    when v_so.status::text = 'delivered' then array['return_requested']
    when v_so.status::text = 'return_requested' then array['return_approved','return_rejected']
    when v_so.status::text = 'return_approved' then array['returned','refunded']
    when v_so.status::text = 'returned' then array['refunded']
    when v_so.status::text = 'paid' then array['available','refunded']
    when v_so.status::text = 'available' then array['refunded']
    else array[]::text[]
  end;

  if not (p_next = any (v_transitions)) then
    raise exception 'Invalid state transition from % to %', v_so.status, p_next;
  end if;

  if not (
    v_actor_role = 'admin'
    or (v_actor_role = 'support' and p_next = any (array['return_requested']))
    or (v_actor_role = 'vendor' and v_so.seller_id = public.current_vendor_id()
        and p_next in ('confirmed','packed','ready_for_pickup','cancelled','paid','available'))
    or (v_actor_role = 'rider' and p_next in ('shipped','out_for_delivery','delivered','delivery_failed'))
    or (v_actor_role = 'customer' and p_next in ('cancelled','return_requested'))
  ) then
    raise exception 'Role % is not authorized for transition % -> %', v_actor_role, v_so.status, p_next
      using errcode = '42501';
  end if;

  update public.sub_orders
  set status = p_next::public.sub_order_status,
      history = history || jsonb_build_array(jsonb_build_object(
        'status', p_next,
        'timestamp', now(),
        'actor', initcap(v_actor_role),
        'note', coalesce(p_note, 'Status updated to ' || p_next)
      ))
  where id = p_sub_order_id;

  update public.deliveries d
  set status = case p_next
        when 'shipped' then 'picked_up'::public.delivery_status
        when 'out_for_delivery' then 'in_transit'::public.delivery_status
        when 'delivered' then 'delivered'::public.delivery_status
        when 'delivery_failed' then 'failed'::public.delivery_status
        else d.status
      end,
      picked_up_at = case when p_next = 'shipped' then now() else d.picked_up_at end,
      delivered_at = case when p_next = 'delivered' then now() else d.delivered_at end
  where d.sub_order_id = p_sub_order_id;

  return jsonb_build_object('id', p_sub_order_id, 'status', p_next);
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. grants (default privileges already cover these; asserted explicitly so a
--    fresh project bootstrapped from this file alone behaves the same).
-- ----------------------------------------------------------------------------
grant execute on function
  public.order_has_vendor_package(uuid),
  public.qa_question_is_untouched(uuid, text, uuid, text),
  public.vendor_earned_net_payout(uuid),
  public.vendor_paid_out(uuid),
  public.vendor_reserve(uuid),
  public.vendor_available_balance(uuid),
  public.vendor_balance(),
  public.vendor_earnings(integer),
  public.vendor_dashboard(integer),
  public.update_sub_order_tracking(uuid, text, text),
  public.decide_return(uuid, text, numeric, text),
  public.complete_return(uuid),
  public.set_vendor_product_listing(uuid, text),
  public.request_payout(numeric, text),
  public.set_default_bank_account(uuid)
to authenticated, service_role;

revoke execute on function
  public.vendor_balance(),
  public.vendor_earnings(integer),
  public.vendor_dashboard(integer),
  public.update_sub_order_tracking(uuid, text, text),
  public.decide_return(uuid, text, numeric, text),
  public.complete_return(uuid),
  public.set_vendor_product_listing(uuid, text),
  public.request_payout(numeric, text),
  public.set_default_bank_account(uuid)
from anon;
