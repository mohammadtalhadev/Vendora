-- ============================================================================
-- Vendora 0004: Trust-critical RPCs, storage buckets + policies, realtime.
-- These SECURITY DEFINER functions are the only path for pricing, moderation,
-- status transitions, refunds and payouts. Clients never write these directly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Shared helpers
-- ----------------------------------------------------------------------------
create or replace function public.hash_delivery_code(raw text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  -- Demo-grade pepper; real deployments should move the secret out of SQL.
  select encode(digest(coalesce(raw, '') || ':vendora-demo-pepper', 'sha256'), 'hex');
$$;

create or replace function public.commission_rate_for(seller uuid, category uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    vp.commission_rate_override,
    c.commission_rate_override,
    cc.global_default_rate,
    0.10
  )
  from (select 1) d
  left join public.vendor_profiles vp on vp.id = seller
  left join public.categories c on c.id = category
  cross join public.commission_config cc
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- place_order: transactional checkout.
-- The client sends only product/variant ids and quantities; prices, seller
-- splits, commission and shipping are computed from database rows.
-- ----------------------------------------------------------------------------
create or replace function public.place_order(
  p_address jsonb,
  p_payment_method text,
  p_delivery_option text default 'standard',
  p_coupon_code text default null,
  p_customer_notes text default null
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
  g record;
  line record;
  v_sub_orders jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_sub_order_id uuid;
  v_group_items jsonb;
  v_group_subtotal numeric(12,2);
  v_group_shipping numeric(12,2);
  v_grand_subtotal numeric(12,2) := 0;
  v_rate numeric;
  v_commission numeric(12,2);
  v_discount numeric(12,2) := 0;
  v_coupon public.promotions%rowtype;
  v_net numeric(12,2);
  v_code text;
  v_license text;
  v_ptype text;
  v_pstatus text;
  v_stock integer;
  v_so_status public.sub_order_status;
  v_history jsonb;
  v_has_physical boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select email into v_email from public.profiles where id = v_uid;

  if p_payment_method not in ('card','cod') then
    raise exception 'Invalid payment method';
  end if;
  if p_delivery_option not in ('standard','express') then
    raise exception 'Invalid delivery option';
  end if;

  -- Cart comes from the caller's server-side cart_items rows only.
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', ci.product_id,
    'variant_id', ci.variant_id,
    'quantity', ci.quantity
  )), '[]'::jsonb) into v_lines
  from public.cart_items ci
  where ci.user_id = v_uid;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Validate every line against live product rows (approved + in stock).
  for line in
    select
      i ->> 'product_id' as product_id,
      i ->> 'variant_id' as variant_id,
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

  -- Optional coupon validation (server-side).
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
  end if;

  insert into public.orders (customer_id, customer_email, shipping_address, payment_method, payment_status)
  values (v_uid, coalesce(v_email, ''), p_address, p_payment_method::public.payment_method,
          case when p_payment_method = 'card' then 'succeeded' else 'pending' end::public.payment_status)
  returning id into v_order_id;

  -- One sub-order per seller, priced from DB rows.
  for g in
    select p.seller_id
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    group by p.seller_id
  loop
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
        'sellerName', coalesce(vpf.store_name, 'Vendora')
      ))
    into v_group_subtotal, v_group_items
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    left join public.vendor_profiles vpf on vpf.id = p.seller_id
    left join lateral jsonb_to_recordset(
      case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end
    ) as vat(id text, price numeric)
      on vat.id = i ->> 'variant_id'
    where p.seller_id = g.seller_id;

    -- shipping from the seller's per-product settings
    select coalesce(sum(
      case
        when p.type = 'digital' then 0
        when coalesce((p.shipping_settings ->> 'freeShipping')::boolean, false) then 0
        else coalesce((p.shipping_settings ->> 'standardFee')::numeric, 0)
      end
    ), 0)
    into v_group_shipping
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    where p.seller_id = g.seller_id;

    if p_delivery_option = 'express' then
      v_group_shipping := v_group_shipping + 15.00;
    end if;

    v_rate := public.commission_rate_for(g.seller_id, null);

    -- coupon applies once, to the first qualifying seller group (demo rule)
    v_discount := 0;
    if v_coupon.code is not null and v_group_subtotal >= v_coupon.minimum_order then
      v_discount := case
        when v_coupon.discount_type = 'percentage'
          then round(v_group_subtotal * v_coupon.discount_value / 100.0, 2)
        else v_coupon.discount_value
      end;
      if v_coupon.max_discount is not null then
        v_discount := least(v_discount, v_coupon.max_discount);
      end if;
      v_discount := least(v_discount, v_group_subtotal);
      update public.promotions set usage_count = usage_count + 1 where id = v_coupon.id;
      v_coupon := null; -- consume coupon
    end if;

    v_group_subtotal := v_group_subtotal - v_discount;
    v_commission := round(v_group_subtotal * v_rate, 2);
    v_net := round(v_group_subtotal - v_commission, 2);
    v_grand_subtotal := v_grand_subtotal + v_group_subtotal;

    -- physical: random 4-digit delivery code, stored hashed, returned once.
    -- digital: license key, immediately available.
    select bool_or(p.type = 'physical') into v_has_physical
    from jsonb_array_elements(v_lines) i
    join public.products p on p.id = (i ->> 'product_id')::uuid
    where p.seller_id = g.seller_id;

    v_license := null;
    if v_has_physical then
      v_ptype := 'physical';
      v_so_status := 'placed';
      v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    else
      v_ptype := 'digital';
      v_so_status := 'available';
      v_code := null;
      v_license := 'VEND-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
    end if;

    v_history := jsonb_build_array(jsonb_build_object(
      'status', v_so_status,
      'timestamp', now(),
      'actor', 'Customer',
      'note', 'Order placed via checkout'
    ));

    insert into public.sub_orders (
      order_group_id, seller_id, type, items, subtotal, shipping_fee,
      commission_rate, commission_amount, net_payout, status,
      delivery_code_hash, license_key, history, customer_notes
    )
    values (
      v_order_id, g.seller_id, v_ptype::public.product_type, v_group_items,
      v_group_subtotal, v_group_shipping, v_rate, v_commission, v_net,
      v_so_status,
      case when v_has_physical then public.hash_delivery_code(v_code) else null end,
      v_license, v_history, p_customer_notes
    )
    returning id into v_sub_order_id;

    if v_has_physical then
      insert into public.deliveries (sub_order_id, status, pickup_details, dropoff_details, handover_code_hash)
      values (
        v_sub_order_id, 'pending',
        jsonb_build_object('seller_id', g.seller_id),
        p_address,
        public.hash_delivery_code(v_code)
      );
    end if;

    v_sub_orders := v_sub_orders || jsonb_build_array(jsonb_build_object(
      'id', v_sub_order_id,
      'sellerId', g.seller_id,
      'type', v_ptype,
      'subtotal', v_group_subtotal,
      'shippingFee', v_group_shipping,
      'commissionAmount', v_commission,
      'netPayout', v_net,
      'status', v_so_status,
      'deliveryCode', v_code,
      'licenseKey', v_license
    ));

    -- decrement stock for physical items in this group
    update public.products p
    set stock = p.stock - agg.qty
    from (
      select (i ->> 'product_id')::uuid as pid, sum((i ->> 'quantity')::int) as qty
      from jsonb_array_elements(v_lines) i
      join public.products p2 on p2.id = (i ->> 'product_id')::uuid
      where p2.seller_id = g.seller_id and p2.type = 'physical'
      group by 1
    ) agg
    where p.id = agg.pid;
  end loop;

  -- clear the server-side cart
  delete from public.cart_items where user_id = v_uid;

  insert into public.notifications (user_id, type, title, message, href)
  values (
    v_uid, 'order_status', 'Order placed',
    'Your order #' || left(v_order_id::text, 8) || ' has been received.',
    '/orders/' || v_order_id::text
  );

  return jsonb_build_object(
    'orderId', v_order_id,
    'subOrders', v_sub_orders,
    'grandSubtotal', v_grand_subtotal
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- advance_sub_order_status: server-side order state machine, mirroring
-- src/lib/order-state-machine.ts. Rejects invalid transitions and actors.
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

  select * into v_so from public.sub_orders where id = p_sub_order_id
  for update;
  if not found then
    raise exception 'Sub-order not found';
  end if;
  if v_so.status::text = p_next then
    raise exception 'Sub-order is already in this status';
  end if;

  -- Determine acting role (first matching privilege wins).
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

  if v_actor_role = 'admin' then
    -- Admin may apply any valid graph transition.
    null;
  end if;

  -- Valid transition graph (physical + digital).
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
    when v_so.status::text = 'return_requested' then array['return_approved']
    when v_so.status::text = 'return_approved' then array['refunded']
    when v_so.status::text = 'paid' then array['available','refunded']
    when v_so.status::text = 'available' then array['refunded']
    else array[]::text[]
  end;

  if not (p_next = any (v_transitions)) then
    raise exception 'Invalid state transition from % to %', v_so.status, p_next;
  end if;

  -- Actor permissions for the specific transition.
  if not (
    v_actor_role = 'admin'
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

  -- Keep delivery record in sync with logistics milestones.
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
-- moderate_product: the only way a product reaches 'approved'/'rejected'.
-- ----------------------------------------------------------------------------
create or replace function public.moderate_product(
  p_product_id uuid,
  p_status text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can moderate products' using errcode = '42501';
  end if;
  if p_status not in ('approved','rejected','archived','pending_review') then
    raise exception 'Invalid moderation status';
  end if;

  update public.products
  set status = p_status::public.moderation_status,
      rejection_reason = case when p_status = 'rejected' then p_reason else null end
  where id = p_product_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (
    auth.uid(), 'Super Admin',
    'product.' || p_status, 'product', p_product_id::text,
    jsonb_build_object('reason', p_reason)
  );
  return found;
end;
$$;

-- ----------------------------------------------------------------------------
-- review_vendor_application: approve creates the vendor store + role.
-- ----------------------------------------------------------------------------
create or replace function public.review_vendor_application(
  p_application_id uuid,
  p_decision text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.vendor_applications%rowtype;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_decision not in ('approved','rejected','under_review') then
    raise exception 'Invalid decision';
  end if;

  select * into v_app from public.vendor_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;

  update public.vendor_applications
  set status = p_decision::public.application_status,
      review_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id;

  if p_decision = 'approved' and v_app.user_id is not null then
    insert into public.vendor_profiles (user_id, store_name, slug, description)
    values (v_app.user_id, v_app.proposed_store_name, v_app.proposed_slug, v_app.description)
    on conflict (user_id) do update set store_name = excluded.store_name;

    update public.profiles
    set roles = roles + array['vendor'::public.user_role],
        vendor_status = 'approved',
        rejection_reason = null
    where id = v_app.user_id;
  elsif p_decision = 'rejected' and v_app.user_id is not null then
    update public.profiles
    set vendor_status = 'rejected',
        rejection_reason = p_note
    where id = v_app.user_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id)
  values (auth.uid(), 'Super Admin', 'application.' || p_decision, 'vendor_application', p_application_id::text);

  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- resolve_dispute: staff-only; refund path marks the sub-order refunded.
-- ----------------------------------------------------------------------------
create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_outcome text,
  p_note text default null,
  p_amount numeric default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.disputes%rowtype;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_outcome not in ('resolved_refund','resolved_denied') then
    raise exception 'Invalid outcome';
  end if;

  select * into v_d from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Dispute not found';
  end if;

  update public.disputes
  set status = p_outcome::public.dispute_status,
      resolution_note = p_note,
      resolution_amount = case when p_outcome = 'resolved_refund' then p_amount else null end
  where id = p_dispute_id;

  if p_outcome = 'resolved_refund' and v_d.sub_order_id is not null then
    update public.sub_orders
    set status = 'refunded',
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'refunded',
          'timestamp', now(),
          'actor', 'Support',
          'note', coalesce(p_note, 'Refund issued from dispute resolution')
        ))
    where id = v_d.sub_order_id;
  end if;

  insert into public.dispute_messages (dispute_id, sender_id, sender_role, sender_name, content)
  select p_dispute_id, auth.uid(), 'support', p.name, coalesce(p_note, 'Dispute ' || p_outcome)
  from public.profiles p where p.id = auth.uid();

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Support', 'dispute.' || p_outcome, 'dispute', p_dispute_id::text,
          jsonb_build_object('amount', p_amount));

  return true;
end;
$$;

-- ----------------------------------------------------------------------------
-- request_payout: vendor-only, validated against real accrued balance.
-- ----------------------------------------------------------------------------
create or replace function public.request_payout(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_balance numeric(12,2);
  v_payout_id uuid;
  v_ref text;
begin
  if v_vendor is null then
    raise exception 'No vendor store for this account' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'Payout amount must be positive';
  end if;

  -- Accrued = delivered/available sub-orders minus commission, minus prior payouts.
  select
    coalesce(sum(so.net_payout), 0) - coalesce(sum(pa.amount), 0)
  into v_balance
  from (
    select coalesce(sum(net_payout), 0) as net_payout
    from public.sub_orders
    where seller_id = v_vendor and status in ('delivered','available')
  ) so
  cross join (
    select coalesce(sum(amount), 0) as amount
    from public.payouts
    where vendor_id = v_vendor
  ) pa;

  if p_amount > v_balance then
    raise exception 'Payout exceeds available balance of %', v_balance;
  end if;

  v_ref := 'FAST-' || (floor(10000000 + random() * 90000000))::int::text;

  insert into public.payouts (vendor_id, amount, status, payment_reference, metadata)
  values (v_vendor, p_amount, 'processing', v_ref, jsonb_build_object('type', 'instant'))
  returning id into v_payout_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Vendor', 'payout.requested', 'payout', v_payout_id::text,
          jsonb_build_object('amount', p_amount));

  return jsonb_build_object('payoutId', v_payout_id, 'reference', v_ref, 'amount', p_amount);
end;
$$;

-- ----------------------------------------------------------------------------
-- verify_delivery: rider checks the customer's 4-digit handover code.
-- ----------------------------------------------------------------------------
create or replace function public.verify_delivery(p_delivery_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deliveries%rowtype;
  v_rider uuid;
begin
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  select * into v_d from public.deliveries where id = p_delivery_id and rider_id = v_rider for update;
  if not found then
    raise exception 'Delivery not assigned to this rider';
  end if;

  if v_d.handover_code_hash is distinct from public.hash_delivery_code(p_code) then
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id)
    values (auth.uid(), 'Rider', 'delivery.code_failed', 'delivery', p_delivery_id::text);
    raise exception 'Invalid handover code';
  end if;

  update public.deliveries
  set status = 'delivered',
      delivered_at = now(),
      proof_of_delivery = jsonb_build_object('verified_by', auth.uid(), 'at', now())
  where id = p_delivery_id;

  perform public.advance_sub_order_status(v_d.sub_order_id, 'delivered', 'Delivered, handover code verified');

  return jsonb_build_object('deliveryId', p_delivery_id, 'status', 'delivered');
end;
$$;

-- ----------------------------------------------------------------------------
-- assign_rider: the only way a delivery gets a rider (sub_orders.rider_id feeds
-- the role check in advance_sub_order_status / verify_delivery).
-- ----------------------------------------------------------------------------
create or replace function public.assign_rider(p_sub_order_id uuid, p_rider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign riders' using errcode = '42501';
  end if;

  select * into v_so from public.sub_orders where id = p_sub_order_id for update;
  if not found then
    raise exception 'Sub-order not found';
  end if;
  if not exists (select 1 from public.rider_profiles rp where rp.id = p_rider_id) then
    raise exception 'Rider not found';
  end if;

  update public.sub_orders set rider_id = p_rider_id where id = p_sub_order_id;
  update public.deliveries
  set rider_id = p_rider_id,
      assigned_at = now(),
      status = case when status = 'pending' then 'assigned'::public.delivery_status else status end
  where sub_order_id = p_sub_order_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Admin', 'delivery.rider_assigned', 'sub_order', p_sub_order_id::text,
          jsonb_build_object('rider_id', p_rider_id));

  return jsonb_build_object('subOrderId', p_sub_order_id, 'riderId', p_rider_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- reply_to_review: vendor reply, guarded by ownership.
-- ----------------------------------------------------------------------------
create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.owns_review(p_review_id) then
    raise exception 'Review does not belong to your store' using errcode = '42501';
  end if;
  update public.reviews
  set seller_reply = jsonb_build_object('author', 'Merchant Response', 'timeAgo', 'Just now', 'body', p_reply)
  where id = p_review_id;
  return found;
end;
$$;

-- ----------------------------------------------------------------------------
-- Storage buckets + policies (idempotent)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('vendor-assets', 'vendor-assets', true),
  ('user-avatars', 'user-avatars', true),
  ('dispute-evidence', 'dispute-evidence', false)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_vendor_upload" on storage.objects;
create policy "product_images_vendor_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select vp.slug from public.vendor_profiles vp
      where vp.user_id = auth.uid() or public.is_admin()
    )
  );

drop policy if exists "product_images_vendor_manage" on storage.objects;
create policy "product_images_vendor_manage" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select vp.slug from public.vendor_profiles vp
      where vp.user_id = auth.uid() or public.is_admin()
    )
  );

drop policy if exists "product_images_vendor_delete" on storage.objects;
create policy "product_images_vendor_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select vp.slug from public.vendor_profiles vp where vp.user_id = auth.uid()
      )
    )
  );

drop policy if exists "vendor_assets_public_read" on storage.objects;
create policy "vendor_assets_public_read" on storage.objects
  for select using (bucket_id = 'vendor-assets');

drop policy if exists "vendor_assets_owner_write" on storage.objects;
create policy "vendor_assets_owner_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'vendor-assets'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select vp.slug from public.vendor_profiles vp where vp.user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'vendor-assets'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select vp.slug from public.vendor_profiles vp where vp.user_id = auth.uid()
      )
    )
  );

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'user-avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "evidence_parties_read" on storage.objects;
create policy "evidence_parties_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and (
      public.is_admin() or public.has_role('support')
      or name like auth.uid()::text || '/%'
    )
  );

drop policy if exists "evidence_parties_upload" on storage.objects;
create policy "evidence_parties_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dispute-evidence' and name like auth.uid()::text || '/%');

-- ----------------------------------------------------------------------------
-- Realtime publication (Supabase-managed; additive)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  wanted text[] := array[
    'orders','sub_orders','deliveries','disputes','dispute_messages',
    'notifications','products','vendor_profiles','message_threads','messages'
  ];
begin
  foreach t in array wanted loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
