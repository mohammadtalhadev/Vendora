-- ============================================================================
-- Vendora 0009: One pricing truth for checkout.
--
-- The old flow kept two copies of the pricing rules: the screen estimated
-- shipping from hard-coded numbers ($8.50 per vendor, free over $100, $18
-- express) while place_order charged something else entirely (each product's own
-- shipping_settings plus a flat $15 express surcharge). The customer saw one
-- total and paid another. The quote screen and place_order now read the same
-- function, so a quoted total is the charged total.
--
-- Also: every order recorded payment_details from the column default
-- ("Visa •••• 4242") because place_order never accepted the card the customer
-- typed. It now takes a brand and last four digits and stores only those - the
-- full card number never reaches the database.
-- ============================================================================

-- One sub-order remembers which service its package was priced with.
alter table public.sub_orders
  add column if not exists delivery_option text not null default 'standard'
  check (delivery_option in ('standard', 'express'));

-- No order may inherit a card that nobody entered.
alter table public.orders
  alter column payment_details set default '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- The flat express surcharge, defined once.
-- ----------------------------------------------------------------------------
create or replace function public.express_shipping_fee()
returns numeric
language sql
immutable
set search_path = public
as $$
  select 15.00;
$$;

-- ----------------------------------------------------------------------------
-- The caller's cart, normalised the way every checkout calculation wants it.
-- ----------------------------------------------------------------------------
create or replace function public.cart_lines_for(p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'product_id', ci.product_id,
      'variant_id', ci.variant_id,
      'quantity', ci.quantity
    ) order by ci.created_at, ci.product_id),
    '[]'::jsonb
  )
  from public.cart_items ci
  where ci.user_id = p_uid;
$$;

-- ----------------------------------------------------------------------------
-- checkout_pricing: the single source of checkout arithmetic. Pure read - no
-- stock, coupon usage or order rows are touched. Packages are walked in
-- seller-id order so a promotion lands on the same package every time.
-- ----------------------------------------------------------------------------
create or replace function public.checkout_pricing(
  p_uid uuid,
  p_delivery_options jsonb default '{}'::jsonb,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lines jsonb;
  g record;
  v_store_name text;
  v_store_type text;
  v_seller_name text;
  v_seller_type text;
  v_has_physical boolean;
  v_items jsonb;
  v_subtotal numeric(12,2);
  v_standard_fee numeric(12,2);
  v_express_fee numeric(12,2) := public.express_shipping_fee();
  v_option text;
  v_shipping numeric(12,2);
  v_discount numeric(12,2);
  v_net_subtotal numeric(12,2);
  v_rate numeric;
  v_commission numeric(12,2);
  v_net numeric(12,2);
  v_coupon public.promotions%rowtype;
  v_coupon_found boolean := false;
  v_coupon_used boolean := false;
  v_groups jsonb := '[]'::jsonb;
  v_subtotal_all numeric(12,2) := 0;
  v_discount_all numeric(12,2) := 0;
  v_shipping_all numeric(12,2) := 0;
  v_net_all numeric(12,2) := 0;
begin
  if p_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_lines := public.cart_lines_for(p_uid);
  if jsonb_array_length(v_lines) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select pr.* into v_coupon
    from public.promotions pr
    where pr.code = upper(btrim(p_coupon_code))
      and pr.active
      and pr.usage_count < pr.usage_limit
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.ends_at is null or pr.ends_at >= now())
    limit 1;

    if v_coupon.code is null then
      raise exception 'Invalid or expired coupon code';
    end if;
    v_coupon_found := true;
  end if;

  for g in
    select p.seller_id
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    group by p.seller_id
    order by p.seller_id
  loop
    v_store_name := null;
    v_store_type := null;
    select vp.store_name, vp.seller_type::text into v_store_name, v_store_type
    from public.vendor_profiles vp
    where vp.id = g.seller_id;

    v_seller_name := coalesce(nullif(btrim(coalesce(v_store_name, '')), ''), 'Vendora');
    v_seller_type := coalesce(v_store_type, 'vendor');

    select coalesce(bool_or(p.type = 'physical'), false) into v_has_physical
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    where p.seller_id = g.seller_id;

    select
      sum(coalesce(vat.price, p.price) * (i ->> 'quantity')::int),
      jsonb_agg(jsonb_build_object(
        'productId', p.id,
        'variantId', i ->> 'variant_id',
        'title', p.title,
        'price', coalesce(vat.price, p.price),
        'quantity', (i ->> 'quantity')::int,
        'image', p.images[1],
        'sellerId', p.seller_id,
        'sellerName', v_seller_name
      ))
    into v_subtotal, v_items
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    left join lateral jsonb_to_recordset(
      case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end
    ) as vat(id text, price numeric)
      on vat.id = i ->> 'variant_id'
    where p.seller_id = g.seller_id;

    v_subtotal := round(coalesce(v_subtotal, 0), 2);

    -- Standard shipping is whatever each product's own settings say, per line.
    select coalesce(sum(
      case
        when p.type = 'digital' then 0
        when coalesce((p.shipping_settings ->> 'freeShipping')::boolean, false) then 0
        else coalesce((p.shipping_settings ->> 'standardFee')::numeric, 0)
      end
    ), 0) into v_standard_fee
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    where p.seller_id = g.seller_id;
    v_standard_fee := round(v_standard_fee, 2);

    v_option := coalesce(p_delivery_options ->> g.seller_id::text, 'standard');
    if v_option not in ('standard', 'express') then
      v_option := 'standard';
    end if;
    -- Nothing ships, so nothing can upgrade to express.
    if not v_has_physical then
      v_option := 'standard';
    end if;

    v_shipping := case
      when v_has_physical and v_option = 'express' then round(v_standard_fee + v_express_fee, 2)
      else v_standard_fee
    end;

    v_discount := 0;
    if v_coupon_found and not v_coupon_used
       and (v_coupon.vendor_id is null or v_coupon.vendor_id = g.seller_id)
       and v_subtotal >= v_coupon.minimum_order then
      v_discount := case
        when v_coupon.discount_type = 'percentage'
          then round(v_subtotal * v_coupon.discount_value / 100.0, 2)
        else v_coupon.discount_value
      end;
      if v_coupon.max_discount is not null then
        v_discount := least(v_discount, v_coupon.max_discount);
      end if;
      v_discount := round(least(v_discount, v_subtotal), 2);
      v_coupon_used := true;
    end if;

    v_net_subtotal := round(v_subtotal - v_discount, 2);
    v_rate := public.commission_rate_for(g.seller_id, null);
    v_commission := round(v_net_subtotal * v_rate, 2);
    v_net := round(v_net_subtotal - v_commission, 2);

    v_subtotal_all := v_subtotal_all + v_subtotal;
    v_discount_all := v_discount_all + v_discount;
    v_shipping_all := v_shipping_all + v_shipping;
    v_net_all := v_net_all + v_net_subtotal;

    v_groups := v_groups || jsonb_build_array(jsonb_build_object(
      'sellerId', g.seller_id,
      'sellerName', v_seller_name,
      'sellerType', v_seller_type,
      'hasPhysical', v_has_physical,
      'items', v_items,
      'subtotal', v_subtotal,
      'discount', v_discount,
      'netSubtotal', v_net_subtotal,
      'deliveryOption', v_option,
      'shippingStandard', v_standard_fee,
      'shippingExpress', case when v_has_physical then round(v_standard_fee + v_express_fee, 2) else 0 end,
      'shippingFee', v_shipping,
      'commissionRate', v_rate,
      'commissionAmount', v_commission,
      'netPayout', v_net,
      'couponCode', case when v_discount > 0 then v_coupon.code else null end,
      'couponId', case when v_discount > 0 then v_coupon.id else null end
    ));
  end loop;

  return jsonb_build_object(
    'groups', v_groups,
    'subtotal', round(v_subtotal_all, 2),
    'discountTotal', round(v_discount_all, 2),
    'shippingTotal', round(v_shipping_all, 2),
    'grandTotal', round(v_net_all + v_shipping_all, 2),
    'couponCode', case when v_coupon_found then v_coupon.code else null end,
    'couponConsumed', v_coupon_used,
    'expressFee', v_express_fee
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- checkout_quote: what the review step shows, priced from the server's copy of
-- the cart. Read-only, so a customer can refresh it as often as they like.
-- ----------------------------------------------------------------------------
create or replace function public.checkout_quote(
  p_delivery_options jsonb default '{}'::jsonb,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  return public.checkout_pricing(auth.uid(), coalesce(p_delivery_options, '{}'::jsonb), p_coupon_code);
end;
$$;

-- ----------------------------------------------------------------------------
-- place_order: re-prices through checkout_pricing, then writes. Because both
-- paths call the same function, the number on the screen is the number booked.
-- ----------------------------------------------------------------------------
drop function if exists public.place_order(jsonb, text, text, text, text);

create or replace function public.place_order(
  p_address jsonb,
  p_payment_method text,
  p_delivery_option text default 'standard',
  p_coupon_code text default null,
  p_customer_notes text default null,
  p_delivery_options jsonb default null,
  p_card_brand text default null,
  p_card_last4 text default null
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
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
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
    select p.status, p.type, p.stock into v_pstatus, v_ptype, v_stock
    from public.products p
    where p.id = line.product_id::uuid;

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
    payment_method, payment_details, payment_status
  )
  values (
    v_uid, coalesce(v_email, ''), p_address,
    p_payment_method::public.payment_method, v_payment_details, v_payment_status
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

  return jsonb_build_object(
    'orderId', v_order_id,
    'subOrders', v_out,
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

-- ----------------------------------------------------------------------------
-- issue_delivery_code: the handover code is returned once at checkout and only
-- its hash is stored, so an owner who needs it again gets a NEW code rather
-- than a read of something the database deliberately cannot show again.
-- ----------------------------------------------------------------------------
create or replace function public.issue_delivery_code(p_sub_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_so public.sub_orders%rowtype;
  v_actor text;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Sub-order not found';
  end if;
  if v_so.delivery_code_hash is null then
    raise exception 'This package has no handover code';
  end if;
  if v_so.status::text not in ('placed', 'confirmed', 'packed', 'ready_for_pickup', 'shipped', 'out_for_delivery') then
    raise exception 'This delivery is already closed';
  end if;

  select case
    when public.is_admin() or public.has_role('support') then 'Admin'
    when exists (
      select 1 from public.orders o
      where o.id = v_so.order_group_id and o.customer_id = v_uid
    ) then 'Customer'
    when exists (
      select 1 from public.rider_profiles rp
      where rp.user_id = v_uid and rp.id = v_so.rider_id
    ) then 'Rider'
  end into v_actor;

  if v_actor is null then
    raise exception 'Only the buyer, the assigned rider or staff can issue this code'
      using errcode = '42501';
  end if;

  v_code := lpad((floor(random() * 10000))::int::text, 4, '0');

  update public.sub_orders
  set delivery_code_hash = public.hash_delivery_code(v_code),
      history = history || jsonb_build_array(jsonb_build_object(
        'status', v_so.status,
        'timestamp', now(),
        'actor', v_actor,
        'note', 'Handover code re-issued'
      ))
  where id = p_sub_order_id;

  update public.deliveries
  set handover_code_hash = public.hash_delivery_code(v_code)
  where sub_order_id = p_sub_order_id;

  return jsonb_build_object('subOrderId', p_sub_order_id, 'code', v_code);
end;
$$;

-- ----------------------------------------------------------------------------
-- Privileges. These read across sellers and promotions, so they run definer;
-- they must not be reachable unauthenticated.
-- ----------------------------------------------------------------------------
grant execute on function
  public.express_shipping_fee(),
  public.cart_lines_for(uuid),
  public.checkout_pricing(uuid, jsonb, text),
  public.checkout_quote(jsonb, text),
  public.place_order(jsonb, text, text, text, text, jsonb, text, text),
  public.issue_delivery_code(uuid)
to authenticated;

revoke execute on function
  public.cart_lines_for(uuid),
  public.checkout_pricing(uuid, jsonb, text),
  public.checkout_quote(jsonb, text),
  public.place_order(jsonb, text, text, text, text, jsonb, text, text),
  public.issue_delivery_code(uuid)
from anon, public;
