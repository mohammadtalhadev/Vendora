-- ============================================================================
-- Vendora Batch 44A: Security Phases 9-11 (Fix Guide) + upload limits +
-- error_logs.
--
-- Phase 9: a user must not be able to change their own vendor_status /
--          account_status (self-approve / self-unban), and a non-active
--          vendor store must not resolve through current_vendor_id().
-- Phase 10: riders read only their assigned sub-orders; a rider acting
--          directly (API role `authenticated`) cannot rewrite a delivery's
--          handover code hash; only the buyer or staff can (re-)issue a
--          delivery code; the delivery-code pepper moves to a database
--          setting.
-- Phase 11: actor guards on support_lookup_orders / notify_user /
--          cart_lines_for / checkout_pricing / admin_audit, and the default
--          PUBLIC execute grant is revoked from every SECURITY DEFINER
--          function in schema public.
--
-- DELIVERY-CODE PEPPER (owner action, do this BEFORE real traffic):
--   alter database postgres set app.delivery_code_pepper = '<a long random secret>';
--   (then reconnect / restart the API so new sessions pick it up)
-- Until it is set, hashing falls back to the historical demo pepper, so all
-- hashes written before this migration keep verifying. HONEST WARNING: once
-- a real pepper is set, delivery codes issued BEFORE the change will stop
-- verifying (their stored hashes were made with the old pepper). Set it
-- before real orders exist, or expect in-flight deliveries to need a fresh
-- code issued by the buyer/staff after the change.
--
-- VERIFY ON THE HOSTED DB (owner, after applying): anon must NOT be able to
-- execute definer functions, authenticated/service_role must:
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as anon_can,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_can,
--          has_function_privilege('service_role', p.oid, 'execute') as svc_can
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prosecdef
--   order by p.proname;
-- Every row should read anon_can = false.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P9a: profiles_update_self — pin vendor_status and account_status to their
-- old values, exactly like roles already is (subquery reads the OLD row).
-- ----------------------------------------------------------------------------
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and roles = (select old_p.roles from public.profiles old_p where old_p.id = profiles.id)
    and vendor_status = (select old_p.vendor_status from public.profiles old_p where old_p.id = profiles.id)
    and account_status = (select old_p.account_status from public.profiles old_p where old_p.id = profiles.id)
  );

-- ----------------------------------------------------------------------------
-- P9b: current_vendor_id() — only an ACTIVE store resolves. Copied verbatim
-- from 20261011000000_vendora_core_schema.sql plus the status predicate.
-- ----------------------------------------------------------------------------
create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vp.id
  from public.vendor_profiles vp
  where vp.user_id = auth.uid()
    and vp.status = 'active'
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- P10a: sub_orders reads — the old sub_orders_select_staff policy let ANY
-- rider read ALL sub-orders. It is replaced by an admin/support policy and
-- a rider policy scoped to packages assigned to that rider. (Checked every
-- other sub_orders / deliveries policy: sub_orders_select_own_order and
-- sub_orders_select_vendor are already scoped to the customer / the vendor's
-- own store; deliveries_select_rider is already scoped by rider_id, and
-- deliveries_select_staff is admin/support only — no other blanket rider
-- read exists.)
-- ----------------------------------------------------------------------------
drop policy if exists sub_orders_select_staff on public.sub_orders;

create policy sub_orders_select_admin_support on public.sub_orders
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

create policy sub_orders_select_rider_assigned on public.sub_orders
  for select to authenticated
  using (
    exists (
      select 1 from public.rider_profiles rp
      where rp.user_id = (select auth.uid())
        and rp.id = sub_orders.rider_id
    )
  );

-- ----------------------------------------------------------------------------
-- P10b: deliveries write pin — a rider acting DIRECTLY through the API must
-- never rewrite handover_code_hash (that would let them mint a code only
-- they know and "verify" their own delivery).
--
-- Guard reasoning: this trigger function is NOT security definer, so inside
-- it current_user is the role actually performing the UPDATE. A direct
-- PostgREST write runs as `authenticated`. The legitimate writers of this
-- column (place_order, issue_delivery_code, verify/advance flows) are
-- SECURITY DEFINER functions owned by postgres: while they run, the
-- effective current_user is the function owner, not `authenticated`, so
-- their updates pass untouched. Service-role writes likewise bypass the
-- pin. Only a direct authenticated session whose profile is a rider (and
-- who is not an admin) is blocked, and only when the hash actually changes.
-- ----------------------------------------------------------------------------
create or replace function public.guard_delivery_handover_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new; -- definer RPC / service-role / direct-SQL path: not a rider API write
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.handover_code_hash is distinct from old.handover_code_hash
     and exists (
       select 1 from public.rider_profiles rp where rp.user_id = auth.uid()
     ) then
    raise exception 'Riders cannot change the handover code' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deliveries_handover_code_pin on public.deliveries;
create trigger trg_deliveries_handover_code_pin
  before update on public.deliveries
  for each row execute function public.guard_delivery_handover_code();

-- ----------------------------------------------------------------------------
-- P10c: issue_delivery_code — copied verbatim from
-- 20261011000800_vendora_checkout_pricing.sql (the latest definition) with
-- ONE change: the assigned-rider branch is removed. Only the buyer or staff
-- (admin/support) can (re-)issue a code; a rider caller now falls through to
-- the existing 42501 error.
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
  end into v_actor;

  if v_actor is null then
    raise exception 'Only the buyer or staff can issue this code'
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
-- P10d: hash_delivery_code — copied from
-- 20261011000300_vendora_rpc_storage_realtime.sql with the pepper sourced
-- from app.delivery_code_pepper (fallback: the historical demo pepper).
-- current_setting() is STABLE, not IMMUTABLE, so the function's volatility
-- changes from immutable to stable; Postgres accepts that via CREATE OR
-- REPLACE.
-- ----------------------------------------------------------------------------
create or replace function public.hash_delivery_code(raw text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  -- Pepper comes from the app.delivery_code_pepper database setting when the
  -- owner has set one; otherwise the historical demo pepper is used so hashes
  -- written before this migration keep verifying (see migration header).
  select encode(digest(coalesce(raw, '') || ':' || coalesce(nullif(current_setting('app.delivery_code_pepper', true), ''), 'vendora-demo-pepper'), 'sha256'), 'hex');
$$;

-- ----------------------------------------------------------------------------
-- P11a: actor guards. Each function below is copied verbatim from its latest
-- definition and amended only by adding the guard as its first statement
-- (cart_lines_for and support_lookup_orders were LANGUAGE SQL; a guard
-- cannot be a statement there, so they are re-declared as plpgsql with the
-- original query returned unchanged).
-- ----------------------------------------------------------------------------

-- support_lookup_orders: latest in 20261011001100_vendora_support_console.sql.
-- Guard: has_role('support') or is_admin().
create or replace function public.support_lookup_orders(p_customer_email text, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Batch 44 (Phase 11): order lookup by email is a staff tool, not a public
  -- oracle for anyone who knows a customer's address.
  if not (public.has_role('support') or public.is_admin()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return (
with params as (select greatest(coalesce(p_days, 30), 1) as days)
select jsonb_agg(o) as rows
from (
  select o.id, o.customer_email, o.payment_method, o.payment_status, o.created_at,
         jsonb_agg(jsonb_build_object(
           'id', so.id, 'sellerId', so.seller_id, 'status', so.status, 'type', so.type,
           'gross', (so.subtotal + so.shipping_fee)::numeric, 'commission', so.commission_amount, 'net', so.net_payout, 'carrierName', so.carrier_name, 'trackingNumber', so.tracking_number
         ) order by so.created_at desc) as packages,
         coalesce(bool_or(so.return_reason is not null), false) as has_open_return
  from public.orders o left join public.sub_orders so on so.order_group_id = o.id
  , params pm
  where o.customer_email = p_customer_email
    and o.created_at >= now() - make_interval(days => pm.days)
  group by o.id, o.customer_email, o.payment_method, o.payment_status, o.created_at
  order by o.created_at desc
) o
  );
end;
$$;

-- notify_user: latest in 20261011001200_vendora_notification_fanout.sql.
-- Guard: staff OR p_user_id = auth.uid() for direct RPC calls (see the
-- in-body comment for why internal definer fan-out callers are identified
-- by request path — a blanket guard would break every notification the
-- triggers in that same migration send on behalf of another actor).
create or replace function public.notify_user(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Batch 44 (Phase 11): a direct RPC call may only notify the caller
  -- themselves, unless the caller is staff (admin/support). Internal fan-out
  -- callers (the SECURITY DEFINER notify_on_* triggers and RPCs in migration
  -- 20261011001200) reach this function while serving another RPC, so their
  -- request path names that RPC, not /rpc/notify_user; refusing them would
  -- break every order/dispute notification in the product. A null-recipient
  -- call still falls through to the skip below, and a session with no
  -- auth.uid() (service role / direct SQL) is a trusted system context --
  -- anon cannot execute this function at all after the Phase 11 grant sweep.
  if p_user_id is not null
     and auth.uid() is not null
     and coalesce(current_setting('request.path', true), '') = '/rpc/notify_user'
     and p_user_id is distinct from auth.uid()
     and not (public.has_role('admin') or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- Nobody to tell: a courier parcel with no logged-in buyer, a store that was
  -- created without an owner row. Skipping is correct; writing a null row is not.
  if p_user_id is null then
    return null;
  end if;

  insert into public.notifications (user_id, role_target, type, title, message, href, created_at)
  values (
    p_user_id,
    coalesce(nullif(btrim(p_type::text), ''), 'system'),
    p_type,
    left(btrim(coalesce(p_title, '')), 120),
    left(btrim(coalesce(p_message, '')), 500),
    p_href,
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- cart_lines_for: latest in 20261011000800_vendora_checkout_pricing.sql.
-- Guard: p_uid = auth.uid() OR staff.
create or replace function public.cart_lines_for(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Batch 44 (Phase 11): this definer read crosses accounts if misused, so a
  -- caller may only price their own cart; staff (admin/support) keep access.
  if p_uid is distinct from auth.uid()
     and not (public.has_role('admin') or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return (
select coalesce(
    jsonb_agg(jsonb_build_object(
      'product_id', ci.product_id,
      'variant_id', ci.variant_id,
      'quantity', ci.quantity
    ) order by ci.created_at, ci.product_id),
    '[]'::jsonb
  )
  from public.cart_items ci
  where ci.user_id = p_uid
  );
end;
$$;

-- checkout_pricing: latest in 20261011000800_vendora_checkout_pricing.sql.
-- Guard: p_uid = auth.uid() OR staff.
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
  -- Batch 44 (Phase 11): only the cart owner or staff may price a cart.
  if p_uid is distinct from auth.uid()
     and not (public.has_role('admin') or public.has_role('support')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

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

-- admin_audit: latest in 20261011001000_vendora_admin_console.sql.
-- Guard: is_admin() only for direct RPC calls (internal definer callers in
-- admin/support RPCs keep writing their own transactions' audit rows — see
-- the in-body comment).
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
  -- Batch 44 (Phase 11): direct RPC calls are admin-only. Internal callers
  -- (SECURITY DEFINER admin/support functions such as assign_dispute and
  -- support_refund_sub_order, which write the audit row for their own
  -- transaction) reach this function with a request path naming *their* RPC,
  -- not /rpc/admin_audit, so they keep working; a direct call to
  -- /rpc/admin_audit by a non-admin is refused. Local/SQL contexts have no
  -- request path and are treated like internal callers.
  if coalesce(current_setting('request.path', true), '') = '/rpc/admin_audit'
     and not public.is_admin() then
    raise exception 'Only admins can write audit entries directly' using errcode = '42501';
  end if;

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

-- ----------------------------------------------------------------------------
-- P11b: grant sweep — Postgres grants EXECUTE to PUBLIC by default, which
-- silently re-opens every SECURITY DEFINER function to anon. Revoke that
-- default from every definer function in schema public, then grant execute
-- explicitly to authenticated and service_role. Trigger functions (return
-- type trigger, or names starting trg_) are revoked too but not granted:
-- they are never RPC-called, and granting them would be meaningless noise.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prorettype = 'pg_trigger'::regtype as is_trigger_fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke execute on function public.%I(%s) from public', r.proname, r.args);
    if not r.is_trigger_fn and r.proname not like 'trg\_%' then
      execute format('grant execute on function public.%I(%s) to authenticated, service_role', r.proname, r.args);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Upload limits (storage.buckets) + error_logs.
-- The bucket rows were created in 20261011000300. Real Supabase storage.
-- buckets carries file_size_limit (bytes) and allowed_mime_types (text[]);
-- the DO block checks the columns exist first so local PGlite validation
-- (whose stub storage.buckets lacks them) skips instead of failing, while
-- hosted Supabase applies the limits for real.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets'
      and column_name in ('file_size_limit', 'allowed_mime_types')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    update storage.buckets
      set file_size_limit = 5242880,
          allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
      where id in ('product-images', 'vendor-assets');
    update storage.buckets
      set file_size_limit = 2097152,
          allowed_mime_types = array['image/png','image/jpeg','image/webp']
      where id = 'user-avatars';
    update storage.buckets
      set file_size_limit = 10485760,
          allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
      where id = 'dispute-evidence';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- error_logs: client-side error sink (src/lib/error-reporter.ts). Anyone may
-- report; only admins may read. Reports are telemetry, not user data.
-- ----------------------------------------------------------------------------
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null default '',
  stack text,
  route text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists error_logs_insert_any on public.error_logs;
create policy error_logs_insert_any on public.error_logs
  for insert to anon, authenticated
  with check (true);

drop policy if exists error_logs_select_admin on public.error_logs;
create policy error_logs_select_admin on public.error_logs
  for select to authenticated
  using (public.is_admin());
