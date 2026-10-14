-- ============================================================================
-- Vendora Batch 44B: schema v2 + money safety.
--
-- * product_variants: variants graduate from products.variants jsonb to a
--   real table (per-variant SKU / price / stock). The jsonb stays the write
--   path during the transition; a sync trigger mirrors it into the table.
--   Variant element shape (src/types/domain.ts Variant + seed_products.sql):
--   { id, name, sku, price, stock, attributes } — some rows carry `options`
--   instead of `attributes`; the backfill maps both defensively.
-- * orders gain discount_total / coupon_code / gift_card_amount /
--   idempotency_key, with a unique partial index making (customer, key) a
--   true idempotency boundary in the database, not just in the RPC.
-- * order_items: one durable row per ordered line, backfilled from
--   sub_orders.items (keys: productId / variantId / title / price /
--   quantity, as written by checkout_pricing's groups).
-- * place_order v2: copied verbatim from
--   20261011000800_vendora_checkout_pricing.sql (the latest definition) and
--   amended ONLY as marked inline: appended idempotency/gift-card params,
--   idempotent replay, product-row locking for stock, discount/coupon
--   stored on the order, order_items written per package, and a guarded
--   gift-card application that works whether or not the gift-card batch
--   (public.apply_gift_card) has landed yet.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- product_variants
-- ----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  name text,
  attributes jsonb not null default '{}'::jsonb,
  price numeric(12,2),
  stock integer,
  position integer not null default 0
);

create unique index if not exists product_variants_product_sku_uniq
  on public.product_variants (product_id, sku) where sku is not null;
create index if not exists product_variants_product_idx
  on public.product_variants (product_id, position);

-- Backfill from the jsonb arrays. Defensive field mapping: every read goes
-- through ->> with coalesce, and non-object attributes/options become {}.
insert into public.product_variants (product_id, sku, name, attributes, price, stock, position)
select
  p.id,
  nullif(elem ->> 'sku', ''),
  coalesce(elem ->> 'name', elem ->> 'title'),
  coalesce(
    case when jsonb_typeof(elem -> 'attributes') = 'object' then elem -> 'attributes' end,
    case when jsonb_typeof(elem -> 'options') = 'object' then elem -> 'options' end,
    '{}'::jsonb
  ),
  (elem ->> 'price')::numeric,
  (elem ->> 'stock')::integer,
  (ord - 1)::integer
from public.products p
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end
) with ordinality as t(elem, ord)
on conflict do nothing;

-- Sync trigger: while jsonb remains the write path, mirror any change to a
-- product's variants into the table (delete + re-insert for that product).
create or replace function public.sync_product_variants_from_jsonb()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.product_variants where product_id = new.id;
  insert into public.product_variants (product_id, sku, name, attributes, price, stock, position)
  select
    new.id,
    nullif(elem ->> 'sku', ''),
    coalesce(elem ->> 'name', elem ->> 'title'),
    coalesce(
      case when jsonb_typeof(elem -> 'attributes') = 'object' then elem -> 'attributes' end,
      case when jsonb_typeof(elem -> 'options') = 'object' then elem -> 'options' end,
      '{}'::jsonb
    ),
    (elem ->> 'price')::numeric,
    (elem ->> 'stock')::integer,
    (ord - 1)::integer
  from jsonb_array_elements(
    case when jsonb_typeof(new.variants) = 'array' then new.variants else '[]'::jsonb end
  ) with ordinality as t(elem, ord)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_products_sync_variants on public.products;
create trigger trg_products_sync_variants
  after update of variants on public.products
  for each row
  when (new.variants is distinct from old.variants)
  execute function public.sync_product_variants_from_jsonb();

alter table public.product_variants enable row level security;

drop policy if exists product_variants_select_public on public.product_variants;
create policy product_variants_select_public on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.status = 'approved'
    )
  );

drop policy if exists product_variants_vendor_all on public.product_variants;
create policy product_variants_vendor_all on public.product_variants
  for all to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.seller_id = public.current_vendor_id()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.seller_id = public.current_vendor_id()
    )
  );

drop policy if exists product_variants_admin_all on public.product_variants;
create policy product_variants_admin_all on public.product_variants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- orders: money + idempotency columns
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists discount_total numeric(12,2) not null default 0,
  add column if not exists coupon_code text,
  add column if not exists gift_card_amount numeric(12,2) not null default 0,
  add column if not exists idempotency_key text;

create unique index if not exists orders_customer_idempotency_uniq
  on public.orders (customer_id, idempotency_key) where idempotency_key is not null;

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sub_order_id uuid not null references public.sub_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_sku text,
  product_name text not null default '',
  quantity integer not null default 0,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_sub_order_idx on public.order_items (sub_order_id);

-- Backfill from the frozen package snapshots. product_id resolves through a
-- text comparison so a snapshot naming a since-deleted product yields NULL
-- (the FK's set-null semantics) instead of aborting the migration; the
-- variant SKU falls back to a lookup in the product's jsonb variants by the
-- line's variantId, because the snapshots themselves carry no sku key.
insert into public.order_items (
  order_id, sub_order_id, product_id, variant_sku,
  product_name, quantity, unit_price, line_total
)
select
  so.order_group_id,
  so.id,
  pr.id,
  coalesce(
    item ->> 'variant_sku',
    item ->> 'sku',
    (
      select v ->> 'sku'
      from jsonb_array_elements(
        case when jsonb_typeof(coalesce(pr.variants, '[]'::jsonb)) = 'array'
             then pr.variants else '[]'::jsonb end
      ) v
      where v ->> 'id' = item ->> 'variantId'
      limit 1
    )
  ),
  coalesce(item ->> 'name', item ->> 'title', ''),
  coalesce((item ->> 'quantity')::integer, 0),
  coalesce((item ->> 'price')::numeric, 0),
  coalesce((item ->> 'quantity')::integer, 0) * coalesce((item ->> 'price')::numeric, 0)
from public.sub_orders so
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(so.items) = 'array' then so.items else '[]'::jsonb end
) as item
left join public.products pr on pr.id::text = coalesce(item ->> 'productId', item ->> 'product_id');

alter table public.order_items enable row level security;

drop policy if exists order_items_select_customer on public.order_items;
create policy order_items_select_customer on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = (select auth.uid())
    )
  );

drop policy if exists order_items_select_vendor on public.order_items;
create policy order_items_select_vendor on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.sub_orders so
      where so.id = order_items.sub_order_id
        and so.seller_id = public.current_vendor_id()
    )
  );

drop policy if exists order_items_select_staff on public.order_items;
create policy order_items_select_staff on public.order_items
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

-- ----------------------------------------------------------------------------
-- place_order v2. The previous 8-argument signature is dropped first (as
-- 20261011000800 did to its predecessor): CREATE OR REPLACE alone would
-- leave it behind as an overload and make defaulted calls ambiguous. The
-- two new parameters are appended AFTER the existing ones and both default
-- to null, so every existing caller stays valid unchanged.
-- ----------------------------------------------------------------------------
drop function if exists public.place_order(jsonb, text, text, text, text, jsonb, text, text);

create or replace function public.place_order(
  p_address jsonb,
  p_payment_method text,
  p_delivery_option text default 'standard',
  p_coupon_code text default null,
  p_customer_notes text default null,
  p_delivery_options jsonb default null,
  p_card_brand text default null,
  p_card_last4 text default null,
  p_idempotency_key text default null,
  p_gift_card_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_lines jsonb;
  v_opts jsonb;
  v_defaults jsonb;
  v_quote jsonb;
  group_row record;
  grp jsonb;
  line record;
  v_seller uuid;
  v_order_id uuid;
  v_sub_order_id uuid;
  v_pstatus text;
  v_ptype text;
  v_stock integer;
  v_code text;
  v_license text;
  v_so_status public.sub_order_status;
  v_history jsonb;
  v_has_physical boolean;
  v_payment_details jsonb;
  v_payment_status public.payment_status;
  v_out jsonb := '[]'::jsonb;
  v_existing public.orders%rowtype;
  v_gift_fn_exists boolean := false;
  v_gift_applied numeric(12,2) := 0;
  item_row record;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Batch 44: idempotent replay. A double click, a retried request or a
  -- flaky-network resubmit carrying the same key returns the order that was
  -- already booked instead of booking (and charging stock for) a second one.
  -- Best-effort shape parity with a fresh booking: delivery codes are shown
  -- once at booking and are never read back, so replays carry null codes.
  if p_idempotency_key is not null then
    select o.* into v_existing
    from public.orders o
    where o.customer_id = v_uid and o.idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return jsonb_build_object(
        'orderId', v_existing.id,
        'subOrders', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', so.id,
            'sellerId', so.seller_id,
            'type', so.type,
            'subtotal', so.subtotal,
            'shippingFee', so.shipping_fee,
            'status', so.status,
            'deliveryCode', null,
            'licenseKey', so.license_key
          ) order by so.created_at)
          from public.sub_orders so
          where so.order_group_id = v_existing.id
        ), '[]'::jsonb),
        'grandSubtotal', coalesce((select sum(so.subtotal) from public.sub_orders so where so.order_group_id = v_existing.id), 0),
        'subtotal', coalesce((select sum(so.subtotal) from public.sub_orders so where so.order_group_id = v_existing.id), 0),
        'discountTotal', v_existing.discount_total,
        'shippingTotal', coalesce((select sum(so.shipping_fee) from public.sub_orders so where so.order_group_id = v_existing.id), 0),
        'grandTotal', coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so where so.order_group_id = v_existing.id), 0),
        'paymentStatus', v_existing.payment_status::text,
        'paymentDetails', v_existing.payment_details,
        'giftCardApplied', v_existing.gift_card_amount,
        'amountDue', coalesce((select sum(so.subtotal + so.shipping_fee) from public.sub_orders so where so.order_group_id = v_existing.id), 0) - v_existing.gift_card_amount,
        'idempotentReplay', true
      );
    end if;
  end if;

  if jsonb_typeof(p_address) <> 'object' then
    raise exception 'A delivery address is required';
  end if;

  select email into v_email from public.profiles where id = v_uid;

  if p_payment_method not in ('card', 'cod') then
    raise exception 'Invalid payment method';
  end if;
  if p_delivery_option not in ('standard', 'express') then
    raise exception 'Invalid delivery option';
  end if;

  v_lines := public.cart_lines_for(v_uid);
  if jsonb_array_length(v_lines) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Nothing may be bought that just left the marketplace, went out of stock or
  -- arrived as a quantity the browser invented.
  for line in
    select
      i ->> 'product_id' as product_id,
      (i ->> 'quantity')::int as quantity
    from jsonb_array_elements(v_lines) i
  loop
    -- Batch 44: FOR UPDATE holds the product row lock until this transaction
    -- ends, so the stock check here and the bulk decrement below are atomic:
    -- two concurrent checkouts can no longer both pass against the same stock.
    select p.status, p.type, p.stock into v_pstatus, v_ptype, v_stock
    from public.products p
    where p.id = line.product_id::uuid
    for update;

    if not found then
      raise exception 'Product % not found', line.product_id;
    end if;
    if v_pstatus <> 'approved' then
      raise exception 'Product % is not available for purchase', line.product_id;
    end if;
    if line.quantity < 1 then
      raise exception 'Invalid quantity';
    end if;
    if v_ptype = 'physical' and v_stock < line.quantity then
      raise exception 'Insufficient stock for product %', line.product_id;
    end if;
  end loop;

  -- The per-package map wins; the single legacy argument is the fallback.
  v_opts := coalesce(p_delivery_options, '{}'::jsonb);
  if p_delivery_option = 'express' then
    select coalesce(jsonb_object_agg(sellers.sid, 'express'), '{}'::jsonb) into v_defaults
    from (
      select distinct p.seller_id::text as sid
      from jsonb_array_elements(v_lines) i
      join public.products p on p.id = (i ->> 'product_id')::uuid
    ) sellers
    where not jsonb_exists(v_opts, sellers.sid);
    v_opts := v_defaults || v_opts;
  end if;

  -- Payments stay simulated server-side (no PSP in this project): a card order is
  -- booked as captured. The card is recorded the way a merchant may record it -
  -- brand and last four digits, never the number itself.
  if p_payment_method = 'card' then
    if p_card_last4 is null or p_card_last4 !~ '^[0-9]{4}$' then
      raise exception 'Card details incomplete: the last four digits are required';
    end if;
    v_payment_details := jsonb_build_object(
      'brand', case
        when p_card_brand in ('Visa', 'Mastercard', 'Amex', 'Discover', 'Unknown')
          then p_card_brand
        else 'Unknown'
      end,
      'last4', p_card_last4
    );
    v_payment_status := 'succeeded';
  else
    v_payment_details := jsonb_build_object('method', 'cod');
    v_payment_status := 'pending';
  end if;

  v_quote := public.checkout_pricing(v_uid, v_opts, p_coupon_code);

  insert into public.orders (
    customer_id, customer_email, shipping_address,
    payment_method, payment_details, payment_status,
    discount_total, coupon_code, idempotency_key
  )
  values (
    v_uid, coalesce(v_email, ''), p_address,
    p_payment_method::public.payment_method, v_payment_details, v_payment_status,
    coalesce((v_quote ->> 'discountTotal')::numeric, 0),
    nullif(v_quote ->> 'couponCode', ''),
    p_idempotency_key
  )
  returning id into v_order_id;

  for group_row in select value from jsonb_array_elements(v_quote -> 'groups') loop
    grp := group_row.value;
    v_seller := (grp ->> 'sellerId')::uuid;
    v_has_physical := (grp ->> 'hasPhysical')::boolean;

    v_code := null;
    v_license := null;
    if v_has_physical then
      v_ptype := 'physical';
      v_so_status := 'placed';
      v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    else
      v_ptype := 'digital';
      v_so_status := 'available';
      v_license := 'VEND-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
    end if;

    v_history := jsonb_build_array(jsonb_build_object(
      'status', v_so_status,
      'timestamp', now(),
      'actor', 'Customer',
      'note', 'Order placed via checkout'
    ));

    insert into public.sub_orders (
      order_group_id, seller_id, type, items, subtotal, shipping_fee, delivery_option,
      commission_rate, commission_amount, net_payout, status,
      delivery_code_hash, license_key, history, customer_notes
    )
    values (
      v_order_id, v_seller, v_ptype::public.product_type, grp -> 'items',
      (grp ->> 'netSubtotal')::numeric, (grp ->> 'shippingFee')::numeric,
      (grp ->> 'deliveryOption'),
      (grp ->> 'commissionRate')::numeric, (grp ->> 'commissionAmount')::numeric,
      (grp ->> 'netPayout')::numeric, v_so_status,
      case when v_has_physical then public.hash_delivery_code(v_code) else null end,
      v_license, v_history, p_customer_notes
    )
    returning id into v_sub_order_id;

    if v_has_physical then
      insert into public.deliveries (sub_order_id, status, pickup_details, dropoff_details, handover_code_hash)
      values (
        v_sub_order_id, 'pending',
        jsonb_build_object('seller_id', v_seller),
        p_address,
        public.hash_delivery_code(v_code)
      );
    end if;

    -- Batch 44: one durable order_items row per package line (schema v2), so
    -- reporting/refunds no longer have to unpack sub_orders.items jsonb.
    for item_row in
      select value as item from jsonb_array_elements(coalesce(grp -> 'items', '[]'::jsonb))
    loop
      insert into public.order_items (
        order_id, sub_order_id, product_id, variant_sku,
        product_name, quantity, unit_price, line_total
      )
      values (
        v_order_id, v_sub_order_id,
        case when coalesce(item_row.item ->> 'productId', item_row.item ->> 'product_id')
                  ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
             then coalesce(item_row.item ->> 'productId', item_row.item ->> 'product_id')::uuid
             else null end,
        coalesce(item_row.item ->> 'variant_sku', item_row.item ->> 'sku'),
        coalesce(item_row.item ->> 'name', item_row.item ->> 'title', ''),
        coalesce((item_row.item ->> 'quantity')::int, 0),
        coalesce((item_row.item ->> 'price')::numeric, 0),
        coalesce((item_row.item ->> 'quantity')::int, 0) * coalesce((item_row.item ->> 'price')::numeric, 0)
      );
    end loop;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'id', v_sub_order_id,
      'sellerId', v_seller,
      'sellerName', grp ->> 'sellerName',
      'sellerType', grp ->> 'sellerType',
      'type', v_ptype,
      'subtotal', (grp ->> 'netSubtotal')::numeric,
      'discount', (grp ->> 'discount')::numeric,
      'shippingFee', (grp ->> 'shippingFee')::numeric,
      'deliveryOption', grp ->> 'deliveryOption',
      'commissionAmount', (grp ->> 'commissionAmount')::numeric,
      'netPayout', (grp ->> 'netPayout')::numeric,
      'status', v_so_status,
      'deliveryCode', v_code,
      'licenseKey', v_license
    ));
  end loop;

  -- A promotion is spent exactly once per order, on the package that earned it.
  if (v_quote ->> 'couponConsumed')::boolean then
    update public.promotions p
    set usage_count = p.usage_count + 1
    where p.id = (
      select (g.value ->> 'couponId')::uuid
      from jsonb_array_elements(v_quote -> 'groups') g
      where (g.value ->> 'couponId') is not null
      limit 1
    );
  end if;

  update public.products prod
  set stock = prod.stock - agg.qty
  from (
    select (i ->> 'product_id')::uuid as pid, sum((i ->> 'quantity')::int) as qty
    from jsonb_array_elements(v_lines) i
    join public.products p2 on p2.id = (i ->> 'product_id')::uuid
    where p2.type = 'physical'
    group by 1
  ) agg
  where prod.id = agg.pid;

  delete from public.cart_items where user_id = v_uid;

  insert into public.notifications (user_id, type, title, message, href)
  values (
    v_uid, 'order_status', 'Order placed',
    'Your order #' || left(v_order_id::text, 8) || ' has been received.',
    '/orders/' || v_order_id::text
  );

  -- Batch 44: gift card, applied only when the gift-card batch has landed.
  -- plpgsql resolves function names lazily per statement, and the pg_proc
  -- existence check guards this branch, so this migration is safe whether or
  -- not public.apply_gift_card(text, uuid, numeric) exists yet.
  if p_gift_card_code is not null and btrim(p_gift_card_code) <> '' then
    select exists (
      select 1 from pg_proc pr
      join pg_namespace ns on ns.oid = pr.pronamespace
      where ns.nspname = 'public' and pr.proname = 'apply_gift_card'
    ) into v_gift_fn_exists;
    if v_gift_fn_exists then
      v_gift_applied := coalesce(
        public.apply_gift_card(p_gift_card_code, v_uid, (v_quote ->> 'grandTotal')::numeric), 0);
      if v_gift_applied <> 0 then
        update public.orders set gift_card_amount = v_gift_applied where id = v_order_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'orderId', v_order_id,
    'subOrders', v_out,
    'giftCardApplied', v_gift_applied,
    'amountDue', (v_quote ->> 'grandTotal')::numeric - v_gift_applied,
    'grandSubtotal', (v_quote ->> 'grandTotal')::numeric - (v_quote ->> 'shippingTotal')::numeric,
    'subtotal', (v_quote ->> 'subtotal')::numeric,
    'discountTotal', (v_quote ->> 'discountTotal')::numeric,
    'shippingTotal', (v_quote ->> 'shippingTotal')::numeric,
    'grandTotal', (v_quote ->> 'grandTotal')::numeric,
    'paymentStatus', v_payment_status::text,
    'paymentDetails', v_payment_details
  );
end;
$$;

grant execute on function
  public.place_order(jsonb, text, text, text, text, jsonb, text, text, text, text)
to authenticated, service_role;
revoke execute on function
  public.place_order(jsonb, text, text, text, text, jsonb, text, text, text, text)
from public, anon;
