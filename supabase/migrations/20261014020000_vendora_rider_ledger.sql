-- ============================================================================
-- Vendora Batch 37: the rider's delivered ledger.
--
-- The rider earnings screen needs one fact no rider-readable table holds:
-- `orders.payment_method`. The `orders` policies admit the buyer, the vendor
-- on the package, and admin/support staff - never the rider - so a direct
-- client read returns zero rows and a cash-on-delivery total computed from it
-- would silently read as zero. This function follows the
-- `rider_delivery_board` pattern instead: SECURITY DEFINER, scoped by the
-- caller's own `rider_profiles` row, refusing anyone who is not a rider.
--
-- It returns delivered parcels only, with the parcel's booked value
-- (`sub_orders.subtotal + shipping_fee`, the same gross the board shows) and
-- the order's payment method. No per-delivery fee or rider pay rate is
-- computed here, because no table records one.
-- ============================================================================

create or replace function public.rider_delivery_ledger()
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

  return coalesce((select jsonb_agg(jsonb_build_object(
      'deliveryId', d.id,
      'deliveredAt', d.delivered_at,
      'gross', (so.subtotal + so.shipping_fee)::numeric,
      'paymentMethod', o.payment_method::text
    ) order by d.delivered_at desc)
    from public.deliveries d
    join public.sub_orders so on so.id = d.sub_order_id
    join public.orders o on o.id = so.order_group_id
    where d.rider_id = v_rider and d.status = 'delivered'), '[]'::jsonb);
end;
$$;

grant execute on function public.rider_delivery_ledger() to authenticated;
revoke execute on function public.rider_delivery_ledger() from anon;
