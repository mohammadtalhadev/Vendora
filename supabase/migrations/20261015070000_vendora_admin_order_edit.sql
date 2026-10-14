-- Vendora admin order edit (Batch 50).
--
-- The order detail page could refund or cancel an order but could not correct the
-- two order-level facts that never feed the money ledger: the delivery address
-- snapshot and an unsettled payment status. Both are order-group facts, so both
-- writes live here as audited admin RPCs, modelled on `admin_refund_sub_order`
-- (guard -> lock/read -> validate -> write -> `admin_audit` -> jsonb result).
--
-- Line items, quantities, prices and totals stay frozen: an order is a financial
-- record that refunds, disputes and payouts hang off, and corrections happen by
-- compensating records, never by mutating the original figures. That is also why
-- `admin_set_payment_status` refuses 'refunded' -- an order may only read as
-- refunded when the refund RPCs have written the refund rows that prove it.
--
-- The second RPC closes a concrete gap: `place_order` leaves a COD order at
-- 'pending', and the COD cash trail (`confirm_cod_handover`) records the money
-- against the delivery, never against the order -- so a fully cash-settled COD
-- order read 'pending' forever. This is the desk's way to settle it.

-- ----------------------------------------------------------------------------
-- Delivery address correction.
-- ----------------------------------------------------------------------------

create or replace function public.admin_update_order_address(
  p_order_group_id uuid,
  p_address jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  perform public.admin_require_admin('edit a delivery address');

  select shipping_address into v_before
    from public.orders where id = p_order_group_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- The keys `readShippingAddress` depends on: without a street the snapshot reads
  -- back as a digital order, so a half-blank save would silently unship the order.
  if p_address is null
     or coalesce(btrim(p_address ->> 'street'), '') = ''
     or coalesce(btrim(p_address ->> 'city'), '') = ''
     or coalesce(btrim(p_address ->> 'phone'), '') = '' then
    raise exception 'A delivery address needs a street, a city and a phone number';
  end if;

  update public.orders set shipping_address = p_address
   where id = p_order_group_id;

  perform public.admin_audit('order.address_edit', 'order', p_order_group_id::text,
    v_before, p_address);

  return jsonb_build_object('orderGroupId', p_order_group_id, 'shippingAddress', p_address);
end;
$$;

-- ----------------------------------------------------------------------------
-- Payment status correction (pending -> succeeded | failed only).
-- ----------------------------------------------------------------------------

create or replace function public.admin_set_payment_status(
  p_order_group_id uuid,
  p_status public.payment_status,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.payment_status;
begin
  perform public.admin_require_admin('correct a payment status');

  select payment_status into v_before
    from public.orders where id = p_order_group_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- 'refunded' is refused: refunds must go through `admin_refund_sub_order` so the
  -- refunds rows, the package states and the order status can never disagree.
  if p_status = 'refunded'::public.payment_status then
    raise exception 'Use a package refund to mark an order refunded';
  end if;

  -- Only a correction of an unsettled order: once money is recorded as taken (or
  -- the order refunded), the status is history, not a field to tidy up.
  if v_before <> 'pending'::public.payment_status then
    raise exception 'Only a pending payment can be corrected (this order is %)', v_before;
  end if;
  if p_status not in ('succeeded'::public.payment_status, 'failed'::public.payment_status) then
    raise exception 'A pending payment can only be corrected to succeeded or failed';
  end if;

  update public.orders set payment_status = p_status
   where id = p_order_group_id;

  perform public.admin_audit('order.payment_status', 'order', p_order_group_id::text,
    jsonb_build_object('paymentStatus', v_before),
    jsonb_build_object('paymentStatus', p_status, 'reason', p_reason));

  return jsonb_build_object('orderGroupId', p_order_group_id, 'paymentStatus', p_status);
end;
$$;

grant execute on function
  public.admin_update_order_address(uuid, jsonb),
  public.admin_set_payment_status(uuid, public.payment_status, text)
to authenticated, service_role;

revoke execute on function
  public.admin_update_order_address(uuid, jsonb),
  public.admin_set_payment_status(uuid, public.payment_status, text)
from anon;
