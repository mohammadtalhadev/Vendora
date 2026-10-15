-- Batch 83: rider + support panel fixes.
--
-- Rider delivery reads come in two shapes. The board (dashboard, deliveries
-- and the focused parcel route) reads through the SECURITY DEFINER
-- rider_delivery_board(), which keys assignment off deliveries.rider_id.
-- The history read (fetchRiderHistory) reads the deliveries and sub_orders
-- tables directly, and the only policy that ever let a rider read a
-- sub-order — sub_orders_select_rider_assigned (20261015040000 P10a) — keys
-- off the sub_orders.rider_id stamp instead. Both stamps are written by
-- assign_rider today, but the read path must not silently return nothing
-- (history showed Rs 0 and no store) for a parcel the rider is verifiably
-- assigned to on the deliveries row, which is the assignment record the
-- board itself trusts. This migration re-keys the rider policy on a
-- SECURITY DEFINER helper that accepts EITHER stamp, so the two rider
-- delivery surfaces can never disagree about what is assigned to the rider.
-- The helper is SECURITY DEFINER for the same reason current_vendor_id()
-- is: a policy on sub_orders that subqueries deliveries would evaluate
-- deliveries' own policies (one of which reads sub_orders back) and risk
-- the recursive-policy failure class Batch 55 removed.
--
-- Support side: no schema change. The triage dashboard's queue
-- (support_dispute_queue) and the working tickets queue
-- (support_ticket_queue) are both guarded by require_staff() —
-- is_admin() OR has_role('support') — and both are executable by
-- authenticated; the [batch 83] assertions in scripts/smoke-rpcs.ts lock
-- that staff model in (support reads both queues, customers are refused
-- by both, non-riders are refused by the rider board) so a future
-- migration cannot silently re-guard one desk surface admin-only.

create or replace function public.rider_assigned_to_sub_order(p_sub_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.rider_profiles rp
      where rp.user_id = (select auth.uid())
        and (
          rp.id = (select so.rider_id from public.sub_orders so where so.id = p_sub_order_id)
          or exists (
            select 1
            from public.deliveries d
            where d.sub_order_id = p_sub_order_id
              and d.rider_id = rp.id
          )
        )
    );
$$;

revoke all on function public.rider_assigned_to_sub_order(uuid) from public;
grant execute on function public.rider_assigned_to_sub_order(uuid) to authenticated;

drop policy if exists sub_orders_select_rider_assigned on public.sub_orders;

create policy sub_orders_select_rider_assigned on public.sub_orders
  for select to authenticated
  using (public.rider_assigned_to_sub_order(id));
