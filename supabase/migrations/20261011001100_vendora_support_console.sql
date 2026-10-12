-- ============================================================================
-- Vendora Phase 7: support & rider workspaces.
--
-- The support console had zero data layer before this file: `SupportDashboardPage.tsx` (361 lines)
-- read only from `useMarketplaceStore`, local seed arrays, and localStorage. Every number was made up:
-- customer trust scores ('98% High Trust'), fake SLA timers, invented agent names, hard-coded case
-- contents with fabricated addresses/tracking numbers/timelines. The "resolve refund" action wrote
-- to local state and then swallowed database errors with `.catch(console.warn)`. Riders had a
-- dashboard screen but it too used mocks.
--
-- This migration adds what's needed for staff to actually do their jobs without fabrications:
--
--   1. A `canned_responses` table (support-only, staff can create/use templates)
--   2. New RPCs that accept `has_role('support')`: assign_dispute, support_refund_sub_order,
--      escalate_to_support, add_dispute_message, support_lookup_orders, send_support_notification -
--      these are missing from the admin migration which only granted actions to admins - plus
--      `support_dispute_queue` (the console's queue read, by a support name) and
--      `support_staff_directory` (the accounts a case can be handed to).
--   3. `add_dispute_message`, a definer RPC for staff replies. The existing `dispute_messages_insert`
--      policy is limited to `is_dispute_party()` - the customer or the named vendor - and that stays
--      true: staff write through the RPC, which checks the role itself and stamps the sender.
--   4. `rider_profiles.sla_ceiling_hours`: the per-rider handling window the fleet screen quotes.
--      The global `sla_ceiling_hours` in `platform_settings` is a platform figure, not each rider's.
--   5. Rider RPCs: `rider_delivery_board` (this rider's load and nothing else). Riders move a
--      parcel with the existing `advance_sub_order_status`, which owns the transition graph and
--      keeps `deliveries` in sync - a second write path would fork those rules, so none is added.
--   6. `advance_sub_order_status` is redefined to close a hole: a rider could previously take a
--      package straight to `delivered`, skipping the handover code. `delivered` now requires the
--      delivery row `verify_delivery` stamps, and the rider's table policy refuses a rider-written
--      `delivered` on `deliveries`, so the code stays the only path to a closed parcel.
--   7. Return decisions are NOT duplicated here: `decide_return` / `complete_return` already accept
--      `has_role('support')`, mint the RMA code and restock - forking them here would split the rules.
--
-- Money rules stay unchanged: `place_order` booked what the buyer paid and what the seller earns;
-- `support_refund_sub_order` records a refund row against that amount, capped by it. No tax providers or
-- webhook knobs are added because the platform simulates payments server-side via `place_order` - there
-- is no real PSP account to configure.
--
-- Nothing is applied to the remote until you approve a push. Until then, `npm run db:check` will
-- verify the SQL compiles and smoke-tests pass locally.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Canned responses: a simple template library for support agents.
-- ----------------------------------------------------------------------------
-- A template is the text an agent pastes into a reply, so it is stored as the text it is.
-- A jsonb "rich text" document would need a renderer nothing has.
create table if not exists public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references auth.users(id) on delete cascade not null,
  subject text not null check (char_length(subject) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  category text,
  created_at timestamptz not null default now()
);

create index on public.canned_responses(agent_id);
create index on public.canned_responses(category);

-- RLS is off by default on a new table, and the project-wide default privileges already hand
-- `authenticated` insert/update/delete on it - so without this the whole template library would be
-- writable by any signed-in account, including a vendor's.
alter table public.canned_responses enable row level security;

-- Staff browse every template so the picker can offer shared ones; only the author edits theirs.
create policy canned_select_staff on public.canned_responses
  for select to authenticated using (public.is_admin() or public.has_role('support'));
create policy canned_insert_own on public.canned_responses
  for insert to authenticated with check (agent_id = auth.uid() and (public.is_admin() or public.has_role('support')));
create policy canned_update_own on public.canned_responses
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy canned_delete_own on public.canned_responses
  for delete to authenticated using (agent_id = auth.uid());

-- A support agent closing a refund has to see what was already returned on the case. The admin
-- migration opened `refunds` to admins and to the buyer on the order; this adds the staff side.
-- Reads only: the insert policy stays admin-only and refunds are written through the RPC.
create policy refunds_read_staff on public.refunds
  for select to authenticated using (public.has_role('support'));

-- ----------------------------------------------------------------------------
-- 2. Add rider-level sla ceiling to profile. The global exists in platform_settings but each rider
--    needs an individual threshold to track their own performance.
-- ----------------------------------------------------------------------------
alter table public.rider_profiles
  add column if not exists sla_ceiling_hours numeric(4,1) not null default 4.0 check (sla_ceiling_hours > 0);

-- ----------------------------------------------------------------------------
-- 3. Support-specific RPCs: these require staff permissions that were missing from the admin migration.
-- ----------------------------------------------------------------------------

-- Assign a ticket to an agent. The assignment writes assigned_agent_id and audited the change.
create or replace function public.assign_dispute(p_dispute_id uuid, p_agent_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned boolean;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Only staff can assign disputes';
  end if;
  if p_agent_id = auth.uid() then
    raise exception 'You cannot assign a dispute to yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_agent_id and roles @> array['support']::public.user_role[]) then
    raise exception 'That account does not have support access';
  end if;

  update public.disputes
     set assigned_agent_id = p_agent_id
   where id = p_dispute_id
     and (exists (select 1 from public.profiles where id = auth.uid() and roles @> array['admin']::public.user_role[])
          or public.has_role('support'));

  select count(*) > 0 into v_assigned from public.disputes where id = p_dispute_id and assigned_agent_id = p_agent_id;
  if not v_assigned then
    raise exception 'Dispute not found';
  end if;

  perform public.admin_audit('dispute.assign', 'dispute', p_dispute_id::text, null, jsonb_build_object('agentId', p_agent_id));
  return jsonb_build_object('id', p_dispute_id, 'assignedAgentId', p_agent_id);
end;
$$;

-- Support-issued refund. Unlike `admin_refund_sub_order` it takes a support actor and a partial
-- amount. Each call writes one `refunds` row against the gross `place_order` booked; the package
-- only becomes `refunded` - and the order's `payment_status` only follows - when the whole gross
-- has come back, so a goodwill partial never hides a balance that is still owed.
create or replace function public.support_refund_sub_order(p_sub_order_id uuid, p_amount numeric, p_reason text, p_actor_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg record;
  v_already numeric;
  v_fully boolean;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Only staff can issue refunds';
  end if;
  if p_amount <= 0 then
    raise exception 'A refund needs an amount above zero';
  end if;

  select so.*, coalesce(so.subtotal + so.shipping_fee, 0)::numeric as gross
    into v_pkg from public.sub_orders so
   where so.id = p_sub_order_id for update;
  if not found then
    raise exception 'Sub-order not found';
  end if;
  if v_pkg.status = 'refunded' then
    raise exception 'This package has already been fully refunded';
  end if;

  select coalesce(sum(r.amount), 0) into v_already from public.refunds r where r.sub_order_id = p_sub_order_id;
  if v_already + p_amount > v_pkg.gross then
    raise exception 'Cannot refund more than the buyer was charged ($%.2g)', v_pkg.gross;
  end if;
  v_fully := v_already + p_amount >= v_pkg.gross;

  insert into public.refunds (sub_order_id, order_group_id, amount, reason, processed_by)
  values (p_sub_order_id, v_pkg.order_group_id, p_amount, p_reason, auth.uid());

  -- Only a refund of the whole gross closes the package. A partial goodwill refund is a
  -- transaction on a package that is still live, so its remaining balance stays refundable.
  update public.sub_orders
     set status = case when v_fully then 'refunded'::public.sub_order_status else status end,
         history = history || jsonb_build_array(jsonb_build_object(
           'status', case when v_fully then 'refunded' else 'partial_refund' end,
           'timestamp', now(),
           'actor', coalesce(nullif(trim(p_actor_role), ''), 'Staff'),
           'note', format('%s %s: %s', case when v_fully then 'Refunded' else 'Partial refund of' end,
                          p_amount, p_reason)))
   where id = p_sub_order_id;

  if v_fully then
    update public.orders o set payment_status = 'refunded'::public.payment_status
     where o.id = v_pkg.order_group_id
       and not exists (
         select 1 from public.sub_orders so2
          where so2.order_group_id = o.id and so2.status <> 'refunded'
       );
  end if;

  perform public.admin_audit('order.refund', 'sub_order', p_sub_order_id::text,
    jsonb_build_object('gross', v_pkg.gross, 'alreadyRefunded', v_already),
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'fullyRefunded', v_fully));

  return jsonb_build_object('subOrderId', p_sub_order_id, 'amount', p_amount,
    'remainingGross', v_pkg.gross - v_already - p_amount, 'fullyRefunded', v_fully);
end;
$$;

-- Escalation to support tier: sets escalated, marks urgent, assigns current user. Admin escalation
-- did not allow support actors; this one closes that gap.
create or replace function public.escalate_to_support(p_dispute_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d record;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Only staff can escalate disputes';
  end if;

  select d.* into v_d from public.disputes d where d.id = p_dispute_id for update;
  if not found then
    raise exception 'Dispute not found';
  end if;
  if v_d.status in ('resolved_refund', 'resolved_denied') then
    raise exception 'Resolved disputes cannot be escalated';
  end if;

  update public.disputes
     set status = case when v_d.status != 'escalated' then 'escalated' else v_d.status end,
         urgency = case when v_d.urgency != 'urgent' then 'urgent' else v_d.urgency end,
         assigned_agent_id = auth.uid()
   where id = p_dispute_id;

  if coalesce(btrim(p_note), '') <> '' then
    insert into public.dispute_messages (dispute_id, sender_id, sender_role, sender_name, content, is_internal_note)
    values (p_dispute_id, auth.uid(), 'support',
            (select pr.name from public.profiles pr where pr.id = auth.uid()), p_note, true);
  end if;

  perform public.admin_audit('dispute.escalate', 'dispute', p_dispute_id::text,
    jsonb_build_object('status', v_d.status, 'urgency', v_d.urgency),
    jsonb_build_object('status', 'escalated', 'urgency', 'urgent', 'assignedTo', auth.uid()));

  return jsonb_build_object('id', p_dispute_id, 'status', 'escalated');
end;
$$;

-- Generic message writer for support staff: they can now append to disputes. The old policy only
-- let customers/vendors insert; admins could via admin_escalate_dispute but support had no path.
create or replace function public.add_dispute_message(p_dispute_id uuid, p_content text, p_is_internal_note boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Only staff can post messages to disputes';
  end if;
  if coalesce(btrim(p_content), '') = '' then
    raise exception 'Message content is required';
  end if;

  insert into public.dispute_messages (dispute_id, sender_id, sender_role, sender_name, content, is_internal_note)
  values (p_dispute_id, auth.uid(), 'support',
          (select pr.name from public.profiles pr where pr.id = auth.uid()), btrim(p_content), p_is_internal_note)
  returning id into v_id;

  return v_id;
end;
$$;

-- Support-callable order lookup. The admin queue/order-detail RPCs exist but are admin-only.
-- Support often needs to look up orders by customer email without seeing the full admin queue.
create or replace function public.support_lookup_orders(p_customer_email text, p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
) o;
$$;

-- Support notification dispatch: send a message to a customer/vendor about an order/dispute.
-- The existing notifications insert policy blocks support (only admin/auth uid allowed); this RPC
-- relaxes that for support-issued system messages.
create or replace function public.send_support_notification(p_user_id uuid, p_title text, p_message text, p_href text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (public.is_admin() or public.has_role('support')) then
    raise exception 'Only staff can send notifications';
  end if;
  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Notification title is required';
  end if;

  insert into public.notifications (user_id, type, title, message, href, created_at)
  values (p_user_id, 'dispute', btrim(p_title), btrim(p_message), p_href, now())
  returning id into v_id;

  return v_id;
end;
$$;

-- The dispute queue is one read for both desks. The support layer calls it by a support name
-- instead of carrying a second copy of the joining, filtering and paging rules, so a case can
-- never show a different urgency to the platform than to the desk working it.
create or replace function public.support_dispute_queue(
  p_status text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 12,
  p_unassigned boolean default false,
  p_assigned_to uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.require_staff('read the dispute queue');
  select public.admin_dispute_queue(p_status, p_search, p_page, p_page_size, p_unassigned, p_assigned_to);
$$;

-- Handing a case over needs real accounts with support access; the queue row only carries who
-- holds it now. Without this the desk would have to invent an agent list.
create or replace function public.support_staff_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_staff('read the agent directory');
  return jsonb_build_object('agents', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', coalesce(nullif(btrim(p.name), ''), p.email),
      'email', p.email,
      'isMe', p.id = auth.uid(),
      'openCases', (select count(*)::int from public.disputes d
                    where d.assigned_agent_id = p.id
                      and d.status in ('open','under_review','escalated'))
    ) order by p.name)
    from public.profiles p
    where p.roles @> array['support']::public.user_role[]
  ), '[]'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. The rider side: this rider's load, and their own progress on it.
-- ----------------------------------------------------------------------------
-- The rider's board. Every figure comes from rows the rider is a party to: their profile,
-- the deliveries assigned to them, and the package/order behind each one. Nothing is
-- estimated: earnings and ratings are absent because no table records rider payout.
create or replace function public.rider_delivery_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rider uuid;
begin
  -- The board is scoped by the caller's rider profile, so a caller without one has no
  -- board to read. Returning an empty payload would let a customer probe this RPC.
  select rp.id into v_rider from public.rider_profiles rp where rp.user_id = auth.uid();
  if v_rider is null then
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
-- 5. Closing the delivery hole: `delivered` is only reachable through the handover code.
-- ----------------------------------------------------------------------------

-- A rider updates their own parcel rows, but a rider-written `delivered` would close a job the
-- buyer never confirmed. `verify_delivery` runs as the function owner and is unaffected; the
-- transition check below is what reads this stamp.
drop policy if exists deliveries_update_rider on public.deliveries;
create policy deliveries_update_rider on public.deliveries
  for update to authenticated
  using (
    exists (
      select 1 from public.rider_profiles rp
      where rp.id = deliveries.rider_id and rp.user_id = (select auth.uid())
    )
  )
  with check (
    status <> 'delivered'
    and exists (
      select 1 from public.rider_profiles rp
      where rp.id = deliveries.rider_id and rp.user_id = (select auth.uid())
    )
  );

-- Redefined from 20261011000900 (the current version, return states included) with one change:
-- `delivered` is dropped from the rider's open transitions and is only allowed once the delivery
-- row is verified. Everything else - the graph, the history entry, the delivery sync - is
-- unchanged, so the state machine stays in the one function that already owns it.
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

  -- Actor permissions for the specific transition.
  if not (
    v_actor_role = 'admin'
    or (v_actor_role = 'support' and p_next = any (array['return_requested']))
    or (v_actor_role = 'vendor' and v_so.seller_id = public.current_vendor_id()
        and p_next in ('confirmed','packed','ready_for_pickup','cancelled','paid','available'))
    or (v_actor_role = 'rider' and p_next in ('shipped','out_for_delivery','delivery_failed'))
    or (v_actor_role = 'customer' and p_next in ('cancelled','return_requested'))
    -- A rider never closes a parcel on their own say-so. `verify_delivery` marks the delivery row
    -- with the buyer's code as the function owner and then brings the package here, so this is
    -- the only way a rider reaches `delivered`.
    or (v_actor_role = 'rider' and p_next = 'delivered' and exists (
          select 1 from public.deliveries d
           where d.sub_order_id = v_so.id
             and d.status = 'delivered'
             and d.proof_of_delivery is not null))
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
-- 6. Grants for the new RPCs.
-- ----------------------------------------------------------------------------
grant execute on function
  public.assign_dispute(uuid, uuid),
  public.support_refund_sub_order(uuid, numeric, text, text),
  public.escalate_to_support(uuid, text),
  public.add_dispute_message(uuid, text, boolean),
  public.support_lookup_orders(text, integer),
  public.send_support_notification(uuid, text, text, text),
  public.support_dispute_queue(text, text, integer, integer, boolean, uuid),
  public.support_staff_directory(),
  public.rider_delivery_board()
to authenticated;

revoke execute on function
  public.support_refund_sub_order(uuid, numeric, text, text),
  public.support_lookup_orders(text, integer),
  public.support_dispute_queue(text, text, integer, integer, boolean, uuid),
  public.support_staff_directory(),
  public.rider_delivery_board()
from anon;

-- No new rider policy: `riders_select_self` / `riders_update_self` already exist in the RLS
-- migration, and `deliveries_select_rider` scopes the parcel list to the assigned rider.
