-- ============================================================================
-- Batch 77 — Rider self-serve onboarding (20261017040000)
--
-- Until now a signed-in account holding the rider role but no rider_profiles
-- row hit a dead end: the board refused it ('Not a rider') and the only way a
-- row came to exist was an admin creating one by hand. This migration opens
-- the front door and keeps the desk in charge of who walks through it:
--
--   * `apply_as_rider(...)` — the applicant's own write path. Validates the
--     four things dispatch needs (vehicle, phone, city, plate), files the row
--     as status 'pending', grants the 'rider' role the way approvals already
--     do (the dedup union from `review_vendor_application`), and is safe to
--     re-run: while pending it updates the details, once the rider is active
--     it is a no-op success.
--   * `admin_set_rider_approval(user, approve)` — the desk's decision.
--     Approve promotes the row to 'available' (the fleet's working state);
--     reject deletes the application row, so a refused applicant can apply
--     again from a clean slate. Both write an audit row. The applicant's
--     roles are deliberately left alone on rejection: the role may predate
--     the application (the desk grants it directly), and a role with no row
--     is exactly the state the apply form exists for.
--   * 'pending' joins the `rider_availability` enum: it is a lifecycle state,
--     never an availability a rider can pick. Two guards keep it that way —
--     `rider_delivery_board` refuses a pending row with the same 42501
--     'Not a rider' refusal a missing row gets (the client already maps it),
--     and a trigger stops the rider's own row update (`riders_update_self`,
--     the availability write path) from flipping a row into or out of
--     'pending'; only an admin context can. `assign_rider` likewise refuses
--     a pending row, so an application can never be handed a parcel.
--
-- The application details the desk reviews — city and vehicle plate — had no
-- columns; they are added here as plain text with empty defaults, so every
-- row the fleet already holds stays valid.
-- ============================================================================

-- The lifecycle value. Added on its own: nothing in this file uses it inside
-- this transaction (the function bodies below only meet it at run time).
alter type public.rider_availability add value if not exists 'pending';

alter table public.rider_profiles
  add column if not exists city text not null default '',
  add column if not exists vehicle_plate text not null default '';

-- ----------------------------------------------------------------------------
-- apply_as_rider: file or refresh your own rider application.
-- ----------------------------------------------------------------------------
create or replace function public.apply_as_rider(
  p_vehicle_type text,
  p_phone text,
  p_city text,
  p_vehicle_plate text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.rider_profiles%rowtype;
  v_existing boolean := false;
  v_name text := '';
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if coalesce(btrim(p_vehicle_type), '') = '' then
    raise exception 'Tell us what you ride or drive — pick a vehicle type.';
  end if;
  if coalesce(btrim(p_phone), '') = '' then
    raise exception 'Enter a phone number dispatch can reach you on.';
  end if;
  if coalesce(btrim(p_city), '') = '' then
    raise exception 'Enter the city you will deliver in.';
  end if;
  if coalesce(btrim(p_vehicle_plate), '') = '' then
    raise exception 'Enter your vehicle plate number.';
  end if;

  -- The role comes first, mirroring `review_vendor_application`'s approval
  -- grant (a dedup union, never a bare append): the applicant needs it to
  -- reach the rider workspace where the application's state is shown, and
  -- the board still refuses until the desk approves.
  update public.profiles
  set roles = (select coalesce(array_agg(distinct r), '{}'::public.user_role[])
                 from unnest(roles || array['rider'::public.user_role]) as r)
  where id = v_uid
    and not (roles @> array['rider'::public.user_role]);

  select * into v_row from public.rider_profiles where user_id = v_uid for update;
  v_existing := found;

  if v_existing and v_row.status <> 'pending' then
    -- Already a working rider: applying again changes nothing.
    return to_jsonb(v_row);
  end if;

  select coalesce(nullif(btrim(name), ''), '') into v_name
  from public.profiles where id = v_uid;

  if v_existing then
    -- Still waiting on the desk: the details can be corrected in place.
    update public.rider_profiles
    set vehicle_type = btrim(p_vehicle_type),
        phone = btrim(p_phone),
        city = btrim(p_city),
        vehicle_plate = btrim(p_vehicle_plate),
        full_name = coalesce(nullif(full_name, ''), v_name)
    where user_id = v_uid
    returning * into v_row;
  else
    insert into public.rider_profiles
      (user_id, full_name, phone, vehicle_type, city, vehicle_plate, status)
    values
      (v_uid, v_name, btrim(p_phone), btrim(p_vehicle_type),
       btrim(p_city), btrim(p_vehicle_plate), 'pending')
    returning * into v_row;
  end if;

  return to_jsonb(v_row);
end;
$$;

-- ----------------------------------------------------------------------------
-- admin_set_rider_approval: the desk approves or refuses an application.
-- ----------------------------------------------------------------------------
create or replace function public.admin_set_rider_approval(
  p_user_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rider_profiles%rowtype;
begin
  perform public.admin_require_admin('review rider applications');

  if p_user_id is null then
    raise exception 'Which application? The applicant is missing.';
  end if;

  select * into v_row from public.rider_profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'No rider profile exists for that account.';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'That application has already been decided.';
  end if;

  if p_approve then
    update public.rider_profiles
    set status = 'available'
    where id = v_row.id
    returning * into v_row;

    perform public.admin_audit(
      'rider_application.approved', 'rider_profile', v_row.id::text,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'available', 'user_id', p_user_id)
    );

    return jsonb_build_object('userId', p_user_id, 'status', 'available');
  end if;

  delete from public.rider_profiles where id = v_row.id;

  perform public.admin_audit(
    'rider_application.rejected', 'rider_profile', v_row.id::text,
    jsonb_build_object('status', 'pending', 'user_id', p_user_id,
                       'vehicle_type', v_row.vehicle_type, 'city', v_row.city),
    null
  );

  return jsonb_build_object('userId', p_user_id, 'status', 'rejected');
end;
$$;

-- ----------------------------------------------------------------------------
-- 'pending' is the desk's state, not the rider's: the availability write path
-- (`riders_update_self`) must never move a row into or out of it. Only an
-- admin context may; unsigned contexts (SQL, service role) are the desk's
-- own tooling and keep the freedom they have always had.
-- ----------------------------------------------------------------------------
create or replace function public.guard_rider_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and (old.status = 'pending' or new.status = 'pending')
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Rider approval status is set by the Vendora team'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rider_profiles_guard_status on public.rider_profiles;
create trigger trg_rider_profiles_guard_status
  before update of status on public.rider_profiles
  for each row execute function public.guard_rider_status_transition();

-- ----------------------------------------------------------------------------
-- rider_delivery_board, redefined from 20261011001100 with one change: a
-- 'pending' row is refused with the same 'Not a rider' refusal as no row.
-- ----------------------------------------------------------------------------
create or replace function public.rider_delivery_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider uuid;
  v_status public.rider_availability;
begin
  -- The board is scoped by the caller's rider profile, so a caller without one has no
  -- board to read. Returning an empty payload would let a customer probe this RPC.
  -- Batch 77: an applicant whose row is still 'pending' has no board either - the
  -- refusal is the same one, so the client shows the application state it already
  -- knows how to render instead of a route the rider has not been approved for.
  select rp.id, rp.status into v_rider, v_status
  from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null or v_status = 'pending' then
    raise exception 'Not a rider' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'rider', (select to_jsonb(rp) from (
      select rp2.id, rp2.full_name, rp2.phone, rp2.vehicle_type, rp2.status, rp2.sla_ceiling_hours
      from public.rider_profiles rp2 where rp2.id = v_rider
    ) rp),
    'deliveries', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'subOrderId', d.sub_order_id, 'status', d.status::text,
      'assignedAt', d.assigned_at, 'pickedUpAt', d.picked_up_at, 'deliveredAt', d.delivered_at,
      'needsHandoverCode', d.handover_code_hash is not null,
      'gross', (so.subtotal + so.shipping_fee)::numeric,
      'customerNotes', so.customer_notes,
      'address', o.shipping_address, 'customerEmail', o.customer_email, 'storeName', vp.store_name
    ) order by coalesce(d.assigned_at, d.created_at))
      from public.deliveries d
      join public.sub_orders so on so.id = d.sub_order_id
      join public.orders o on o.id = so.order_group_id
      join public.vendor_profiles vp on vp.id = so.seller_id
      where d.rider_id = v_rider and d.status <> 'delivered'), '[]'::jsonb),
    'counts', jsonb_build_object(
      'assigned', (select count(*)::int from public.deliveries d where d.rider_id = v_rider and d.status = 'assigned'),
      'inFlight', (select count(*)::int from public.deliveries d where d.rider_id = v_rider
                   and d.status in ('picked_up', 'in_transit', 'out_for_delivery')),
      'deliveredToday', (select count(*)::int from public.deliveries d where d.rider_id = v_rider
                         and d.status = 'delivered' and d.delivered_at >= date_trunc('day', now())),
      'completedAllTime', (select count(*)::int from public.deliveries d where d.rider_id = v_rider
                           and d.status = 'delivered')
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- assign_rider, redefined from 20261011000300 with one change: a 'pending'
-- row is an application, not a courier, and cannot be handed a parcel.
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
  -- Batch 77: a 'pending' row is an application, not a courier - it cannot take
  -- a parcel until an admin approves it into the fleet.
  if exists (select 1 from public.rider_profiles rp where rp.id = p_rider_id and rp.status = 'pending') then
    raise exception 'That rider''s application is still pending approval';
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
-- Grants: the application is the signed-in user's own write; the decision is
-- granted like every other console RPC and guarded again inside the body.
-- ----------------------------------------------------------------------------
revoke execute on function
  public.apply_as_rider(text, text, text, text),
  public.admin_set_rider_approval(uuid, boolean)
from public, anon;

grant execute on function
  public.apply_as_rider(text, text, text, text),
  public.admin_set_rider_approval(uuid, boolean)
to authenticated;
