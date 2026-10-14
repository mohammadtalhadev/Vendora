-- ============================================================================
-- Vendora Batch 42: rider delivery upgrades.
--
-- Four closures, all server-side so no client can talk its way around them:
--
-- 1. Handover-code lockout (the client half of the Phase 10 redesign):
--    `verify_delivery` counted nothing - a 4-digit code could be brute-forced
--    from the doorstep. Wrong attempts are now counted on the delivery row,
--    and the tenth locks verification for fifteen minutes.
-- 2. Live rider location: a new `rider_locations` row per delivery, written
--    only by the assigned rider while the parcel is moving, and readable by
--    that rider, the order's customer and staff - nobody else.
-- 3. Photo proof of delivery: a private `delivery-proofs` bucket whose folder
--    is the delivery id; only the assigned rider writes there, and the row is
--    stamped through `set_delivery_proof_photo`, never a direct table write.
-- 4. A formal COD cash trail on `deliveries`: the rider records the cash they
--    collected at the door (`cod_collected_*`), an admin confirms the cash
--    was handed over (`cod_handed_over_*`). Until both stamps exist the money
--    is visibly still on the road.
--
-- Customers hold no `deliveries` read policy at all (only the assigned rider,
-- staff and admins do), so the customer-facing tracking read is the narrow
-- SECURITY DEFINER `get_order_delivery_live` below: it answers for one order
-- the caller owns, is staff on, or is riding - and for any other caller it
-- returns no rows rather than an error, leaking nothing about the order.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. deliveries: lockout counter, photo proof pointer, COD cash trail.
-- ----------------------------------------------------------------------------
alter table public.deliveries
  add column if not exists code_attempts int not null default 0,
  add column if not exists code_locked_until timestamptz,
  add column if not exists proof_photo_url text,
  add column if not exists cod_collected_amount numeric,
  add column if not exists cod_collected_at timestamptz,
  add column if not exists cod_handed_over_at timestamptz,
  add column if not exists cod_handed_over_by uuid;

-- ----------------------------------------------------------------------------
-- 2. verify_delivery v2 - copied from 20261011000300 (the only definition)
--    with the lockout added. One structural note: the wrong-code branch no
--    longer RAISES after writing. An unhandled raise aborts the RPC's whole
--    transaction, which would roll the attempt counter (and the audit row)
--    back with it - the counter could never reach ten and the lock could
--    never engage. Instead the branch writes the counter + audit and returns
--    an `invalid_code` payload, which commits; the client turns that payload
--    into the same 'Invalid handover code' refusal the rider saw before.
--    The lock check and the auth/not-assigned refusals still raise, as they
--    happen before any write.
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
  v_attempts int;
begin
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  select * into v_d from public.deliveries where id = p_delivery_id and rider_id = v_rider for update;
  if not found then
    raise exception 'Delivery not assigned to this rider';
  end if;

  -- The lockout is checked before the code, so even the right code cannot
  -- reopen a delivery whose window a string of wrong guesses closed.
  if v_d.code_locked_until is not null and v_d.code_locked_until > now() then
    raise exception 'Too many failed attempts - verification is locked for this delivery, try again later';
  end if;

  if v_d.handover_code_hash is distinct from public.hash_delivery_code(p_code) then
    v_attempts := coalesce(v_d.code_attempts, 0) + 1;
    if v_attempts >= 10 then
      update public.deliveries
      set code_attempts = 0,
          code_locked_until = now() + interval '15 minutes'
      where id = p_delivery_id;
    else
      update public.deliveries
      set code_attempts = v_attempts
      where id = p_delivery_id;
    end if;
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id)
    values (auth.uid(), 'Rider', 'delivery.code_failed', 'delivery', p_delivery_id::text);
    -- Returned, not raised - see the note above. The payload is the refusal:
    -- the client throws 'Invalid handover code' for any non-delivered status.
    return jsonb_build_object(
      'deliveryId', p_delivery_id,
      'status', 'invalid_code',
      'attempts', case when v_attempts >= 10 then 0 else v_attempts end
    );
  end if;

  update public.deliveries
  set status = 'delivered',
      delivered_at = now(),
      code_attempts = 0,
      code_locked_until = null,
      proof_of_delivery = jsonb_build_object('verified_by', auth.uid(), 'at', now())
  where id = p_delivery_id;

  perform public.advance_sub_order_status(v_d.sub_order_id, 'delivered', 'Delivered, handover code verified');

  return jsonb_build_object('deliveryId', p_delivery_id, 'status', 'delivered');
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. rider_locations: one live position per delivery.
-- ----------------------------------------------------------------------------
create table if not exists public.rider_locations (
  delivery_id uuid primary key references public.deliveries(id) on delete cascade,
  rider_id uuid not null references public.rider_profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  updated_at timestamptz not null default now()
);

alter table public.rider_locations enable row level security;

-- The assigned rider writes their own position rows, and only theirs.
drop policy if exists rider_locations_write_rider on public.rider_locations;
create policy rider_locations_write_rider on public.rider_locations
  for all to authenticated
  using (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = rider_locations.rider_id and rp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = rider_locations.rider_id and rp.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.deliveries d
      where d.id = rider_locations.delivery_id and d.rider_id = rider_locations.rider_id
    )
  );

-- The order's customer reads the position of a parcel coming to them.
drop policy if exists rider_locations_select_customer on public.rider_locations;
create policy rider_locations_select_customer on public.rider_locations
  for select to authenticated
  using (
    exists (
      select 1
      from public.deliveries d
      join public.sub_orders so on so.id = d.sub_order_id
      join public.orders o on o.id = so.order_group_id
      where d.id = rider_locations.delivery_id
        and o.customer_id = (select auth.uid())
    )
  );

drop policy if exists rider_locations_select_staff on public.rider_locations;
create policy rider_locations_select_staff on public.rider_locations
  for select to authenticated
  using (public.has_role('admin') or public.has_role('support'));

-- ----------------------------------------------------------------------------
-- update_rider_location: the only write path the rider app uses. The rider is
-- resolved from the session (never a parameter), the delivery must be theirs
-- and actually moving - a parked or closed parcel takes no position fixes.
-- ----------------------------------------------------------------------------
create or replace function public.update_rider_location(
  p_delivery_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider uuid;
  v_d public.deliveries%rowtype;
begin
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Invalid coordinates';
  end if;

  select * into v_d from public.deliveries where id = p_delivery_id and rider_id = v_rider;
  if not found then
    raise exception 'Delivery not assigned to this rider';
  end if;

  if v_d.status not in ('picked_up', 'in_transit', 'out_for_delivery') then
    raise exception 'Location can only be shared while the parcel is on the road';
  end if;

  insert into public.rider_locations (delivery_id, rider_id, lat, lng, accuracy_m, updated_at)
  values (p_delivery_id, v_rider, p_lat, p_lng, p_accuracy, now())
  on conflict (delivery_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        accuracy_m = excluded.accuracy_m,
        updated_at = excluded.updated_at;

  return jsonb_build_object('deliveryId', p_delivery_id, 'updatedAt', now());
end;
$$;

grant execute on function public.update_rider_location(uuid, double precision, double precision, double precision)
  to authenticated, service_role;
revoke execute on function public.update_rider_location(uuid, double precision, double precision, double precision)
  from anon;

-- ----------------------------------------------------------------------------
-- get_order_delivery_live: the customer/staff tracking read. One row per
-- delivery on the order, carrying the live position when one exists and the
-- photo-proof path once the drop is closed. A caller with no stake in the
-- order (not its customer, not staff, not its rider) gets zero rows.
-- ----------------------------------------------------------------------------
create or replace function public.get_order_delivery_live(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  select
    exists (select 1 from public.orders o where o.id = p_order_id and o.customer_id = v_uid)
    or public.has_role('admin')
    or public.has_role('support')
    or exists (
      select 1
      from public.deliveries d
      join public.sub_orders so on so.id = d.sub_order_id
      join public.rider_profiles rp on rp.id = d.rider_id
      where so.order_group_id = p_order_id and rp.user_id = v_uid
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'deliveryId', d.id,
      'subOrderId', d.sub_order_id,
      'status', d.status::text,
      'riderFirstName', case
        when rp.full_name is null or btrim(rp.full_name) = '' then null
        else split_part(btrim(rp.full_name), ' ', 1)
      end,
      'lat', rl.lat,
      'lng', rl.lng,
      'accuracyM', rl.accuracy_m,
      'locationUpdatedAt', rl.updated_at,
      'proofPhotoUrl', d.proof_photo_url
    ) order by d.created_at)
    from public.deliveries d
    join public.sub_orders so on so.id = d.sub_order_id
    left join public.rider_profiles rp on rp.id = d.rider_id
    left join public.rider_locations rl on rl.delivery_id = d.id
    where so.order_group_id = p_order_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_order_delivery_live(uuid) to authenticated, service_role;
revoke execute on function public.get_order_delivery_live(uuid) from anon;

-- ----------------------------------------------------------------------------
-- 4. Photo proof: private bucket + policies + the stamping RPC.
--    Object path is `<delivery_id>/<file>` - the folder check below is what
--    ties an upload to a delivery this rider actually holds.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', false)
on conflict (id) do nothing;

drop policy if exists "delivery_proofs_rider_upload" on storage.objects;
create policy "delivery_proofs_rider_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1
      from public.deliveries d
      join public.rider_profiles rp on rp.id = d.rider_id
      where d.id::text = (storage.foldername(name))[1]
        and rp.user_id = auth.uid()
    )
  );

drop policy if exists "delivery_proofs_rider_manage" on storage.objects;
create policy "delivery_proofs_rider_manage" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1
      from public.deliveries d
      join public.rider_profiles rp on rp.id = d.rider_id
      where d.id::text = (storage.foldername(name))[1]
        and rp.user_id = auth.uid()
    )
  );

drop policy if exists "delivery_proofs_rider_delete" on storage.objects;
create policy "delivery_proofs_rider_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1
      from public.deliveries d
      join public.rider_profiles rp on rp.id = d.rider_id
      where d.id::text = (storage.foldername(name))[1]
        and rp.user_id = auth.uid()
    )
  );

-- The customer reads the proof photo of a parcel that came to them (signed
-- URLs still pass through this policy), and staff read every proof.
drop policy if exists "delivery_proofs_customer_read" on storage.objects;
create policy "delivery_proofs_customer_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1
      from public.deliveries d
      join public.sub_orders so on so.id = d.sub_order_id
      join public.orders o on o.id = so.order_group_id
      where d.id::text = (storage.foldername(name))[1]
        and o.customer_id = auth.uid()
    )
  );

drop policy if exists "delivery_proofs_staff_read" on storage.objects;
create policy "delivery_proofs_staff_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and (public.is_admin() or public.has_role('support'))
  );

-- set_delivery_proof_photo: the rider stamps the stored path onto the row.
-- The path must live under the delivery's own folder, so a rider cannot point
-- a delivery at somebody else's photo.
create or replace function public.set_delivery_proof_photo(p_delivery_id uuid, p_photo_url text)
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

  if v_d.status not in ('delivered', 'out_for_delivery') then
    raise exception 'Photo proof can only be attached at the door or after delivery';
  end if;

  if p_photo_url is null or split_part(p_photo_url, '/', 1) <> p_delivery_id::text then
    raise exception 'Photo path must belong to this delivery';
  end if;

  update public.deliveries
  set proof_photo_url = p_photo_url,
      proof_of_delivery = coalesce(proof_of_delivery, '{}'::jsonb)
        || jsonb_build_object('photoUrl', p_photo_url, 'photoSetAt', now())
  where id = p_delivery_id;

  return jsonb_build_object('deliveryId', p_delivery_id, 'proofPhotoUrl', p_photo_url);
end;
$$;

grant execute on function public.set_delivery_proof_photo(uuid, text) to authenticated, service_role;
revoke execute on function public.set_delivery_proof_photo(uuid, text) from anon;

-- ----------------------------------------------------------------------------
-- 5. COD cash workflow.
-- ----------------------------------------------------------------------------

-- mark_cod_collected: the rider records the cash taken at the door. Only a
-- delivered parcel on a COD order can hold cash, and once the desk has taken
-- the handover the figure is frozen.
create or replace function public.mark_cod_collected(p_delivery_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deliveries%rowtype;
  v_rider uuid;
  v_method public.payment_method;
begin
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  select * into v_d from public.deliveries where id = p_delivery_id and rider_id = v_rider for update;
  if not found then
    raise exception 'Delivery not assigned to this rider';
  end if;

  if v_d.status <> 'delivered' then
    raise exception 'Cash can only be recorded once the parcel is delivered';
  end if;

  select o.payment_method into v_method
  from public.sub_orders so
  join public.orders o on o.id = so.order_group_id
  where so.id = v_d.sub_order_id;

  if v_method is distinct from 'cod'::public.payment_method then
    raise exception 'This order was not cash on delivery';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Collected amount must be zero or more';
  end if;

  if v_d.cod_handed_over_at is not null then
    raise exception 'This cash has already been handed over to the desk';
  end if;

  update public.deliveries
  set cod_collected_amount = p_amount,
      cod_collected_at = now()
  where id = p_delivery_id;

  return jsonb_build_object(
    'deliveryId', p_delivery_id,
    'codCollectedAmount', p_amount,
    'codCollectedAt', now()
  );
end;
$$;

grant execute on function public.mark_cod_collected(uuid, numeric) to authenticated, service_role;
revoke execute on function public.mark_cod_collected(uuid, numeric) from anon;

-- confirm_cod_handover: an admin confirms the desk physically received the
-- rider's cash. This is the stamp that closes the money trail.
create or replace function public.confirm_cod_handover(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deliveries%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only admins can confirm a cash handover' using errcode = '42501';
  end if;

  select * into v_d from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'Delivery not found';
  end if;

  if v_d.cod_collected_at is null then
    raise exception 'No collected cash is recorded for this delivery';
  end if;

  if v_d.cod_handed_over_at is not null then
    raise exception 'This cash handover was already confirmed';
  end if;

  update public.deliveries
  set cod_handed_over_at = now(),
      cod_handed_over_by = auth.uid()
  where id = p_delivery_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Admin', 'delivery.cod_handover_confirmed', 'delivery', p_delivery_id::text,
          jsonb_build_object('cod_collected_amount', v_d.cod_collected_amount));

  return jsonb_build_object(
    'deliveryId', p_delivery_id,
    'codHandedOverAt', now(),
    'codCollectedAmount', v_d.cod_collected_amount
  );
end;
$$;

grant execute on function public.confirm_cod_handover(uuid) to authenticated, service_role;
revoke execute on function public.confirm_cod_handover(uuid) from anon;

-- rider_cod_summary: the calling rider's cash position - what they hold for
-- the desk right now, what the desk has already taken, and today's take.
create or replace function public.rider_cod_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider uuid;
begin
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'collectedPending', coalesce((
      select sum(d.cod_collected_amount) from public.deliveries d
      where d.rider_id = v_rider
        and d.cod_collected_at is not null
        and d.cod_handed_over_at is null
    ), 0),
    'pendingCount', (
      select count(*) from public.deliveries d
      where d.rider_id = v_rider
        and d.cod_collected_at is not null
        and d.cod_handed_over_at is null
    ),
    'handedOverTotal', coalesce((
      select sum(d.cod_collected_amount) from public.deliveries d
      where d.rider_id = v_rider and d.cod_handed_over_at is not null
    ), 0),
    'collectedToday', coalesce((
      select sum(d.cod_collected_amount) from public.deliveries d
      where d.rider_id = v_rider
        and d.cod_collected_at >= date_trunc('day', now())
    ), 0)
  );
end;
$$;

grant execute on function public.rider_cod_summary() to authenticated, service_role;
revoke execute on function public.rider_cod_summary() from anon;
