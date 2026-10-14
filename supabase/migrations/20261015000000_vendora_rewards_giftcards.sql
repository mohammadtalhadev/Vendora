-- ============================================================================
-- Vendora Batch 39: Gift cards, loyalty points, referrals, vendor rating
-- rollup, and the order-level gift-card ledger column.
--
-- Everything here is real against Postgres: a gift card is a row whose raw
-- code is never stored (only its sha256 hash and last 4 characters), loyalty
-- is a ledger with an account balance derived from signed transactions, a
-- referral pays the referrer exactly once when the referee's first package
-- is delivered, and a vendor's rating is recomputed from the reviews that
-- actually exist for that vendor's products.
--
-- Payment honesty: the owner has deferred a real payment gateway, so
-- purchasing a gift card is booked as paid under the project's existing
-- simulated-card model (the same model checkout uses today). No function
-- here claims a card was charged by a PSP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Orders carry how much of their total a gift card already covered.
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists gift_card_amount numeric(12,2) not null default 0;

-- ----------------------------------------------------------------------------
-- 1. Gift cards + their transaction ledger.
-- ----------------------------------------------------------------------------
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_last4 text not null,
  purchaser_id uuid references auth.users(id) on delete set null,
  recipient_email text not null default '',
  message text,
  initial_amount numeric(12,2) not null check (initial_amount > 0),
  balance numeric(12,2) not null check (balance >= 0),
  status text not null default 'active' check (status in ('active', 'depleted', 'void')),
  expires_at timestamptz not null default (now() + interval '1 year'),
  created_at timestamptz not null default now()
);

create index if not exists gift_cards_purchaser_idx on public.gift_cards (purchaser_id);

create table if not exists public.gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.gift_cards(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('purchase', 'apply')),
  amount numeric(12,2) not null check (amount > 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create index if not exists gift_card_transactions_card_idx on public.gift_card_transactions (card_id);
create index if not exists gift_card_transactions_order_idx on public.gift_card_transactions (order_id);

alter table public.gift_cards enable row level security;
alter table public.gift_card_transactions enable row level security;

drop policy if exists gift_cards_select_purchaser on public.gift_cards;
create policy gift_cards_select_purchaser on public.gift_cards
  for select to authenticated
  using (purchaser_id = (select auth.uid()));

drop policy if exists gift_card_transactions_select_party on public.gift_card_transactions;
create policy gift_card_transactions_select_party on public.gift_card_transactions
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or exists (
      select 1 from public.gift_cards gc
      where gc.id = gift_card_transactions.card_id
        and gc.purchaser_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Loyalty accounts + ledger. The unique partial index is the idempotency
--    guard: one 'earn' per sub-order ref and one 'referral' per referee ref
--    can ever be recorded, no matter how many times a trigger fires.
-- ----------------------------------------------------------------------------
create table if not exists public.loyalty_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('earn', 'redeem', 'referral')),
  points integer not null check (points <> 0),
  ref text,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_transactions_user_idx on public.loyalty_transactions (user_id, created_at desc);

create unique index if not exists loyalty_transactions_earn_referral_once
  on public.loyalty_transactions (kind, ref)
  where ref is not null and kind in ('earn', 'referral');

drop trigger if exists trg_loyalty_accounts_updated on public.loyalty_accounts;
create trigger trg_loyalty_accounts_updated before update on public.loyalty_accounts
  for each row execute function public.set_updated_at();

alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;

drop policy if exists loyalty_accounts_select_own on public.loyalty_accounts;
create policy loyalty_accounts_select_own on public.loyalty_accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists loyalty_transactions_select_own on public.loyalty_transactions;
create policy loyalty_transactions_select_own on public.loyalty_transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. Referrals. Every profile carries a short public referral code.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text unique;

update public.profiles
set referral_code = 'VDR-' || upper(substr(md5(id::text), 1, 6))
where referral_code is null;

create or replace function public.fill_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  if new.referral_code is not null and btrim(new.referral_code) <> '' then
    return new;
  end if;
  loop
    v_attempt := v_attempt + 1;
    v_code := 'VDR-' || upper(substr(md5(new.id::text || ':' || v_attempt::text || ':' || random()::text), 1, 6));
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = v_code and p.id <> new.id
    );
    if v_attempt >= 10 then
      raise exception 'Could not allocate a referral code';
    end if;
  end loop;
  new.referral_code := v_code;
  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code
  before insert on public.profiles
  for each row execute function public.fill_referral_code();

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

drop policy if exists referrals_select_party on public.referrals;
create policy referrals_select_party on public.referrals
  for select to authenticated
  using (referrer_id = (select auth.uid()) or referee_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Gift-card helpers + RPCs.
-- ----------------------------------------------------------------------------
create or replace function public.gift_card_hash(p_code text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest('vendora-gift:' || coalesce(p_code, ''), 'sha256'), 'hex');
$$;

create or replace function public.generate_gift_card_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_groups text[] := array['', '', ''];
  v_g integer;
  v_i integer;
  v_ch text;
begin
  for v_g in 1..3 loop
    for v_i in 1..4 loop
      v_ch := substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
      v_groups[v_g] := v_groups[v_g] || v_ch;
    end loop;
  end loop;
  return 'VGC-' || v_groups[1] || '-' || v_groups[2] || '-' || v_groups[3];
end;
$$;

create or replace function public.purchase_gift_card(
  p_recipient_email text,
  p_amount numeric,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_hash text;
  v_card public.gift_cards%rowtype;
  v_attempt integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_recipient_email is null or position('@' in btrim(p_recipient_email)) < 2 then
    raise exception 'A valid recipient email is required';
  end if;
  if p_amount is null or p_amount < 100 or p_amount > 500000 then
    raise exception 'Gift card amount must be between Rs 100 and Rs 500,000';
  end if;

  -- Booked as paid under the project's existing simulated-card model; the
  -- owner has deferred a real payment gateway, so no PSP charge is claimed.
  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_gift_card_code();
    v_hash := public.gift_card_hash(v_code);
    exit when not exists (select 1 from public.gift_cards gc where gc.code_hash = v_hash);
    if v_attempt >= 10 then
      raise exception 'Could not generate a gift card code';
    end if;
  end loop;

  insert into public.gift_cards (
    code_hash, code_last4, purchaser_id, recipient_email, message,
    initial_amount, balance, status, expires_at
  ) values (
    v_hash, right(v_code, 4), v_uid, lower(btrim(p_recipient_email)),
    nullif(btrim(coalesce(p_message, '')), ''),
    round(p_amount, 2), round(p_amount, 2), 'active', now() + interval '1 year'
  )
  returning * into v_card;

  insert into public.gift_card_transactions (card_id, actor_id, order_id, kind, amount, balance_after)
  values (v_card.id, v_uid, null, 'purchase', v_card.initial_amount, v_card.balance);

  return jsonb_build_object(
    'id', v_card.id,
    'code', v_code,
    'balance', v_card.balance,
    'expiresAt', v_card.expires_at
  );
end;
$$;

create or replace function public.check_gift_card(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gift_cards%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select * into v_card from public.gift_cards
  where code_hash = public.gift_card_hash(upper(btrim(coalesce(p_code, ''))));
  if not found then
    return jsonb_build_object('found', false);
  end if;
  return jsonb_build_object(
    'found', true,
    'balance', v_card.balance,
    'status', v_card.status,
    'expiresAt', v_card.expires_at
  );
end;
$$;

create or replace function public.get_my_gift_cards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cards jsonb;
  v_transactions jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gc.id,
    'codeLast4', gc.code_last4,
    'recipientEmail', gc.recipient_email,
    'message', gc.message,
    'initialAmount', gc.initial_amount,
    'balance', gc.balance,
    'status', gc.status,
    'expiresAt', gc.expires_at,
    'createdAt', gc.created_at
  ) order by gc.created_at desc), '[]'::jsonb)
  into v_cards
  from public.gift_cards gc
  where gc.purchaser_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'cardId', t.card_id,
    'codeLast4', gc.code_last4,
    'kind', t.kind,
    'amount', t.amount,
    'balanceAfter', t.balance_after,
    'orderId', t.order_id,
    'createdAt', t.created_at
  ) order by t.created_at desc), '[]'::jsonb)
  into v_transactions
  from public.gift_card_transactions t
  join public.gift_cards gc on gc.id = t.card_id
  where gc.purchaser_id = v_uid or t.actor_id = v_uid;

  return jsonb_build_object('cards', v_cards, 'transactions', v_transactions);
end;
$$;

-- Internal core: locks the card, validates it, deducts, writes the ledger.
create or replace function public.gift_card_apply_core(
  p_code text,
  p_user_id uuid,
  p_amount numeric,
  p_order_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gift_cards%rowtype;
  v_applied numeric(12,2);
  v_new_balance numeric(12,2);
begin
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;
  select * into v_card from public.gift_cards
  where code_hash = public.gift_card_hash(upper(btrim(coalesce(p_code, ''))))
  for update;
  if not found then
    raise exception 'Gift card not found';
  end if;
  if v_card.status <> 'active' then
    raise exception 'Gift card is %', v_card.status;
  end if;
  if v_card.expires_at <= now() then
    raise exception 'Gift card has expired';
  end if;
  if v_card.balance <= 0 then
    raise exception 'Gift card has no balance left';
  end if;

  v_applied := round(least(v_card.balance, p_amount), 2);
  v_new_balance := round(v_card.balance - v_applied, 2);

  update public.gift_cards
  set balance = v_new_balance,
      status = case when v_new_balance = 0 then 'depleted' else 'active' end
  where id = v_card.id;

  insert into public.gift_card_transactions (card_id, actor_id, order_id, kind, amount, balance_after)
  values (v_card.id, coalesce(auth.uid(), p_user_id), p_order_id, 'apply', v_applied, v_new_balance);

  return v_applied;
end;
$$;

create or replace function public.apply_gift_card(
  p_code text,
  p_user_id uuid,
  p_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A signed-in caller may only spend for themselves. A call with no JWT
  -- subject (auth.uid() is null) is the trusted server/service_role path,
  -- the same null-subject pattern the rest of this schema uses.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'You can only apply a gift card to your own order' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'A user is required to apply a gift card';
  end if;
  return public.gift_card_apply_core(p_code, p_user_id, p_amount, null);
end;
$$;

create or replace function public.apply_gift_card_to_order(
  p_code text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_total numeric(12,2);
  v_due numeric(12,2);
  v_applied numeric(12,2);
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from v_uid then
    raise exception 'Order not found';
  end if;
  if v_order.payment_method::text <> 'cod' then
    raise exception 'Gift cards can only be applied to cash-on-delivery orders';
  end if;

  select coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric(12,2)
  into v_total
  from public.sub_orders so
  where so.order_group_id = p_order_id;

  v_due := round(v_total - coalesce(v_order.gift_card_amount, 0), 2);
  if v_due <= 0 then
    return jsonb_build_object('applied', 0, 'amountDue', 0, 'giftCardAmount', v_order.gift_card_amount, 'total', v_total);
  end if;

  v_applied := public.gift_card_apply_core(p_code, v_uid, v_due, p_order_id);

  update public.orders
  set gift_card_amount = coalesce(gift_card_amount, 0) + v_applied
  where id = p_order_id;

  return jsonb_build_object(
    'applied', v_applied,
    'amountDue', round(v_due - v_applied, 2),
    'giftCardAmount', coalesce(v_order.gift_card_amount, 0) + v_applied,
    'total', v_total
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Loyalty award helper, delivery trigger, redemption.
-- ----------------------------------------------------------------------------
create or replace function public.award_loyalty(
  p_user uuid,
  p_points integer,
  p_kind text,
  p_ref text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  if p_user is null or p_points is null or p_points <= 0 then
    return false;
  end if;
  if p_kind not in ('earn', 'referral') then
    return false;
  end if;

  insert into public.loyalty_transactions (user_id, kind, points, ref)
  values (p_user, p_kind, p_points, p_ref)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.loyalty_accounts (user_id, points, lifetime_earned)
  values (p_user, p_points, p_points)
  on conflict (user_id) do update
    set points = public.loyalty_accounts.points + excluded.points,
        lifetime_earned = public.loyalty_accounts.lifetime_earned + excluded.lifetime_earned,
        updated_at = now();
  return true;
end;
$$;

create or replace function public.handle_sub_order_loyalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_points integer;
  v_referral public.referrals%rowtype;
  v_awarded boolean;
begin
  if new.status::text not in ('delivered', 'available') then
    return new;
  end if;
  if old.status::text in ('delivered', 'available') then
    return new;
  end if;

  select o.customer_id into v_customer
  from public.orders o
  where o.id = new.order_group_id;
  if v_customer is null then
    return new;
  end if;

  v_points := floor(coalesce(new.subtotal, 0) / 100)::integer;
  if v_points > 0 then
    perform public.award_loyalty(v_customer, v_points, 'earn', new.id::text);
  end if;

  -- Referral reward: the referee's first delivered/available package pays
  -- the referrer once. The referral row flips to 'rewarded' in the same
  -- transaction and the ledger's unique (kind, ref) index backstops it.
  select * into v_referral from public.referrals
  where referee_id = v_customer and status = 'pending';
  if found then
    v_awarded := public.award_loyalty(v_referral.referrer_id, 250, 'referral', v_customer::text);
    if v_awarded then
      update public.referrals
      set status = 'rewarded', rewarded_at = now()
      where id = v_referral.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sub_orders_loyalty on public.sub_orders;
create trigger trg_sub_orders_loyalty
  after update of status on public.sub_orders
  for each row execute function public.handle_sub_order_loyalty();

create or replace function public.redeem_loyalty_points(p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_account public.loyalty_accounts%rowtype;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i integer;
  v_attempt integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_points is null or p_points < 100 then
    raise exception 'Redeem at least 100 points';
  end if;
  if p_points % 100 <> 0 then
    raise exception 'Points are redeemed in multiples of 100 (100 points = Rs 100)';
  end if;

  select * into v_account from public.loyalty_accounts
  where user_id = v_uid for update;
  if not found or v_account.points < p_points then
    raise exception 'Not enough loyalty points for that redemption';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := 'LOYAL-';
    for v_i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.promotions pr where pr.code = v_code);
    if v_attempt >= 10 then
      raise exception 'Could not generate a coupon code';
    end if;
  end loop;

  -- promotions: discount_type is checked to ('percentage','fixed'),
  -- vendor_id is nullable (null = platform-wide), usage_limit 1 makes
  -- this coupon single-use, and checkout caps a fixed discount at the
  -- subtotal and at max_discount when one is set.
  insert into public.promotions (
    vendor_id, code, title, description, discount_type, discount_value,
    minimum_order, max_discount, usage_limit, usage_count, active,
    starts_at, ends_at
  ) values (
    null, v_code, 'Loyalty points redemption',
    'Generated by redeeming ' || p_points::text || ' Vendora loyalty points.',
    'fixed', p_points, 0, p_points, 1, 0, true,
    now(), now() + interval '30 days'
  );

  update public.loyalty_accounts
  set points = points - p_points, updated_at = now()
  where user_id = v_uid;

  insert into public.loyalty_transactions (user_id, kind, points, ref)
  values (v_uid, 'redeem', -p_points, v_code);

  return jsonb_build_object('code', v_code, 'value', p_points);
end;
$$;

create or replace function public.link_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_code is null or btrim(p_code) = '' then
    return false;
  end if;
  select pr.id into v_referrer from public.profiles pr
  where upper(pr.referral_code) = upper(btrim(p_code));
  if not found or v_referrer = v_uid then
    return false;
  end if;
  if exists (select 1 from public.referrals r where r.referee_id = v_uid) then
    return false;
  end if;
  insert into public.referrals (referrer_id, referee_id, status)
  values (v_referrer, v_uid, 'pending')
  on conflict (referee_id) do nothing;
  return exists (select 1 from public.referrals r where r.referee_id = v_uid and r.referrer_id = v_referrer);
end;
$$;

create or replace function public.get_my_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_account public.loyalty_accounts%rowtype;
  v_code text;
  v_recent jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select * into v_account from public.loyalty_accounts where user_id = v_uid;
  select pr.referral_code into v_code from public.profiles pr where pr.id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'kind', t.kind, 'points', t.points, 'ref', t.ref, 'createdAt', t.created_at
  ) order by t.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select * from public.loyalty_transactions
    where user_id = v_uid
    order by created_at desc
    limit 20
  ) t;

  return jsonb_build_object(
    'points', coalesce(v_account.points, 0),
    'lifetimeEarned', coalesce(v_account.lifetime_earned, 0),
    'referralCode', v_code,
    'referralsRewarded', (select count(*) from public.referrals r where r.referrer_id = v_uid and r.status = 'rewarded'),
    'referralsPending', (select count(*) from public.referrals r where r.referrer_id = v_uid and r.status = 'pending'),
    'recentTransactions', v_recent
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Vendor rating rollup: mirrors refresh_product_rating(), one level up.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_vendor_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_sellers uuid[] := array[]::uuid[];
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select p.seller_id into v_seller from public.products p where p.id = new.product_id;
    if v_seller is not null and not (v_seller = any (v_sellers)) then
      v_sellers := v_sellers || v_seller;
    end if;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    select p.seller_id into v_seller from public.products p where p.id = old.product_id;
    if v_seller is not null and not (v_seller = any (v_sellers)) then
      v_sellers := v_sellers || v_seller;
    end if;
  end if;

  foreach v_seller in array v_sellers loop
    update public.vendor_profiles vp
    set rating = coalesce(agg.avg_rating, 0),
        review_count = coalesce(agg.cnt, 0)
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating, count(*)::integer as cnt
      from public.reviews r
      join public.products p on p.id = r.product_id
      where p.seller_id = v_seller
    ) agg
    where vp.id = v_seller;
  end loop;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_vendor_rating on public.reviews;
create trigger trg_reviews_vendor_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_vendor_rating();

-- One-time backfill so every vendor's stored rating matches its reviews.
update public.vendor_profiles vp
set rating = coalesce(agg.avg_rating, 0),
    review_count = coalesce(agg.cnt, 0)
from (
  select p.seller_id,
         round(avg(r.rating)::numeric, 1) as avg_rating,
         count(*)::integer as cnt
  from public.reviews r
  join public.products p on p.id = r.product_id
  group by p.seller_id
) agg
where agg.seller_id = vp.id;

update public.vendor_profiles vp
set rating = 0, review_count = 0
where not exists (
  select 1 from public.reviews r
  join public.products p on p.id = r.product_id
  where p.seller_id = vp.id
);

-- ----------------------------------------------------------------------------
-- 7. Grants. RPCs are the write path; tables are read-only for their owners
--    under the RLS policies above. Internal helpers stay server-side.
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on
  public.gift_cards, public.gift_card_transactions,
  public.loyalty_accounts, public.loyalty_transactions,
  public.referrals
  to authenticated;

grant select, insert, update, delete, truncate, references, trigger on
  public.gift_cards, public.gift_card_transactions,
  public.loyalty_accounts, public.loyalty_transactions,
  public.referrals
  to service_role;

revoke execute on function public.gift_card_hash(text) from public, anon;
revoke execute on function public.generate_gift_card_code() from public, anon;
revoke execute on function public.gift_card_apply_core(text, uuid, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.award_loyalty(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.fill_referral_code() from public, anon, authenticated;
revoke execute on function public.handle_sub_order_loyalty() from public, anon, authenticated;
revoke execute on function public.refresh_vendor_rating() from public, anon, authenticated;

grant execute on function
  public.purchase_gift_card(text, numeric, text),
  public.check_gift_card(text),
  public.get_my_gift_cards(),
  public.apply_gift_card(text, uuid, numeric),
  public.apply_gift_card_to_order(text, uuid),
  public.redeem_loyalty_points(integer),
  public.link_referral(text),
  public.get_my_rewards(),
  public.award_loyalty(uuid, integer, text, text),
  public.gift_card_apply_core(text, uuid, numeric, uuid)
  to service_role;

grant execute on function
  public.purchase_gift_card(text, numeric, text),
  public.check_gift_card(text),
  public.get_my_gift_cards(),
  public.apply_gift_card(text, uuid, numeric),
  public.apply_gift_card_to_order(text, uuid),
  public.redeem_loyalty_points(integer),
  public.link_referral(text),
  public.get_my_rewards()
  to authenticated;

revoke execute on function
  public.purchase_gift_card(text, numeric, text),
  public.check_gift_card(text),
  public.get_my_gift_cards(),
  public.apply_gift_card(text, uuid, numeric),
  public.apply_gift_card_to_order(text, uuid),
  public.redeem_loyalty_points(integer),
  public.link_referral(text),
  public.get_my_rewards()
  from anon;
