-- ============================================================================
-- Vendora Batch 56: money integrity.
--
-- Five lifecycle gaps where the money state machines were built for the
-- happy path only (mega-QA backend audit, section 3):
--
--   1. Gift cards could be minted for free: `purchase_gift_card` booked a
--      spendable balance with no payment behind it at all. A purchase now
--      records its simulated-card payment as its own row
--      (`gift_card_payments`, exactly one card per payment, unique both
--      ways) inside the same call, demands the same card evidence checkout
--      demands (brand + last four), and is capped per buyer per day. A
--      call with no payment details fails. `apply_gift_card_to_order`
--      additionally refuses orders that are already settled or whose
--      packages have been delivered / cancelled / refunded.
--   2. Cancelling a package leaked stock and skipped money entirely: the
--      units never went back on the shelf, and a card-paid package read
--      `cancelled` with `payment_status` still `succeeded` and no refund
--      row. The cancel transition now settles the package in the same
--      transaction: restock (mirroring `complete_return`), refund the
--      captured gross through the `refunds` ledger with the same cap the
--      refund RPCs use, and follow the order's payment status to
--      `refunded` / `voided` once no live package remains.
--   3. Digital COD orders handed over their license keys at order time,
--      while payment was still `pending`. Keys now mint when the money
--      settles: card orders at booking (unchanged), COD orders when the
--      desk confirms the cash handover, when an admin corrects the
--      payment status to `succeeded`, or when a gift card covers the
--      full amount due.
--   4. `vendor_earned_net_payout` paid vendors for money already refunded:
--      a partial refund left the package `delivered`, so its full net
--      stayed in the vendor's available balance. Refunds are now netted
--      per package (never below zero for a package).
--   5. Loyalty points were never clawed back: a refunded order kept the
--      points it earned. A trigger on the `refunds` ledger now reverses
--      the earned points for the refunded share of the package, in
--      proportion, never driving a balance below zero.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. A cancelled-before-collection COD order needs an honest terminal
--    payment state: nothing was captured and nothing ever will be.
-- ----------------------------------------------------------------------------
alter type public.payment_status add value if not exists 'voided';

-- ----------------------------------------------------------------------------
-- 1a. Gift-card payments: the payment trail a purchase stands on.
--     One payment mints exactly one card (unique gift_card_id), and every
--     card is born linked to the payment that paid for it.
-- ----------------------------------------------------------------------------
create table if not exists public.gift_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'simulated_card' check (method in ('simulated_card')),
  card_brand text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  status text not null default 'succeeded' check (status in ('succeeded')),
  gift_card_id uuid unique references public.gift_cards(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gift_card_payments_user_idx
  on public.gift_card_payments (user_id, created_at desc);

alter table public.gift_card_payments enable row level security;

drop policy if exists gift_card_payments_select_own on public.gift_card_payments;
create policy gift_card_payments_select_own on public.gift_card_payments
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.gift_card_payments to authenticated;
grant select, insert, update, delete, truncate, references, trigger on public.gift_card_payments to service_role;

-- ----------------------------------------------------------------------------
-- 1b. purchase_gift_card: same simulated-card model as checkout, but the
--     payment is now a row of its own, written in the same transaction,
--     and issuance is capped per buyer per rolling day (10 cards and
--     Rs 500,000 in total) so a scripted caller cannot stockpile balance.
--     The old 3-argument signature is dropped: a call that carries no
--     payment details must fail, not fall back to a free mint.
-- ----------------------------------------------------------------------------
drop function if exists public.purchase_gift_card(text, numeric, text);

create or replace function public.purchase_gift_card(
  p_recipient_email text,
  p_amount numeric,
  p_message text default null,
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
  v_code text;
  v_hash text;
  v_card public.gift_cards%rowtype;
  v_payment public.gift_card_payments%rowtype;
  v_brand text;
  v_attempt integer := 0;
  v_day_count integer;
  v_day_total numeric(12,2);
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_recipient_email is null or position('@' in btrim(p_recipient_email)) < 2 then
    raise exception 'A valid recipient email is required';
  end if;
  if p_amount is null or p_amount < 100 or p_amount > 500000 then
    raise exception 'Gift card amount must be between Rs 100 and Rs 500,000';
  end if;

  -- The payment evidence checkout demands (place_order's card path): brand
  -- and last four digits, never the number itself. No details, no mint.
  if p_card_last4 is null or p_card_last4 !~ '^[0-9]{4}$' then
    raise exception 'Card details incomplete: the last four digits are required';
  end if;
  v_brand := case
    when p_card_brand in ('Visa', 'Mastercard', 'Amex', 'Discover', 'Unknown')
      then p_card_brand
    else 'Unknown'
  end;

  select count(*)::integer, coalesce(sum(amount), 0)::numeric(12,2)
  into v_day_count, v_day_total
  from public.gift_card_payments
  where user_id = v_uid and created_at > now() - interval '24 hours';
  if v_day_count >= 10 then
    raise exception 'Daily gift card limit reached: at most 10 cards per day';
  end if;
  if v_day_total + round(p_amount, 2) > 500000 then
    raise exception 'Daily gift card limit reached: at most Rs 500,000 per day';
  end if;

  -- The simulated payment is recorded first and the card is minted against
  -- it; the unique link makes a second card for the same payment impossible.
  insert into public.gift_card_payments (user_id, amount, method, card_brand, card_last4, status)
  values (v_uid, round(p_amount, 2), 'simulated_card', v_brand, p_card_last4, 'succeeded')
  returning * into v_payment;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_gift_card_code();
    v_hash := public.gift_card_hash(v_code);
    exit when not exists (select 1 from public.gift_cards gc where gc.code_hash = v_hash);
    if v_attempt >= 10 then
      raise exception 'Could not generate a gift card code';
    end if;
  end loop;

  insert into public.gift_cards (
    code_hash, code_last4, purchaser_id, recipient_email, message,
    initial_amount, balance, status, expires_at
  ) values (
    v_hash, right(v_code, 4), v_uid, lower(btrim(p_recipient_email)),
    nullif(btrim(coalesce(p_message, '')), ''),
    round(p_amount, 2), round(p_amount, 2), 'active', now() + interval '1 year'
  )
  returning * into v_card;

  update public.gift_card_payments
  set gift_card_id = v_card.id
  where id = v_payment.id;

  insert into public.gift_card_transactions (card_id, actor_id, order_id, kind, amount, balance_after)
  values (v_card.id, v_uid, null, 'purchase', v_card.initial_amount, v_card.balance);

  return jsonb_build_object(
    'id', v_card.id,
    'code', v_code,
    'balance', v_card.balance,
    'expiresAt', v_card.expires_at,
    'paymentId', v_payment.id
  );
end;
$$;

grant execute on function public.purchase_gift_card(text, numeric, text, text, text)
to authenticated, service_role;
revoke execute on function public.purchase_gift_card(text, numeric, text, text, text)
from public, anon;

-- ----------------------------------------------------------------------------
-- 3a. The license mint, in one place. Fills keys only where they are
--     missing and the package is still a live sale, so every settlement
--     path can call it safely and repeatedly.
-- ----------------------------------------------------------------------------
create or replace function public.mint_digital_license_keys(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so record;
  v_count integer := 0;
begin
  for v_so in
    select so.id
    from public.sub_orders so
    where so.order_group_id = p_order_id
      and so.type = 'digital'
      and so.license_key is null
      and so.status::text not in ('cancelled', 'refunded')
    for update
  loop
    update public.sub_orders
    set license_key = 'VEND-' || upper(substr(md5(random()::text || clock_timestamp()::text || v_so.id::text), 1, 12))
    where id = v_so.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.mint_digital_license_keys(uuid) from public, anon, authenticated;
grant execute on function public.mint_digital_license_keys(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 1c. apply_gift_card_to_order: ownership was already checked; the order's
--     state was not. Refuse settled orders and any order with a delivered,
--     cancelled, refunded or returned package — the money trail is closed
--     for all of those. When a card settles a digital order in full, its
--     license keys are released (section 3).
-- ----------------------------------------------------------------------------
create or replace function public.apply_gift_card_to_order(
  p_code text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_total numeric(12,2);
  v_due numeric(12,2);
  v_applied numeric(12,2);
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from v_uid then
    raise exception 'Order not found';
  end if;
  if v_order.payment_method::text <> 'cod' then
    raise exception 'Gift cards can only be applied to cash-on-delivery orders';
  end if;
  if v_order.payment_status::text <> 'pending' then
    raise exception 'This order''s payment is already settled';
  end if;
  if exists (
    select 1 from public.sub_orders so
    where so.order_group_id = p_order_id
      and so.status::text in ('delivered', 'cancelled', 'refunded', 'returned')
  ) then
    raise exception 'Gift cards cannot be applied after a package has been delivered, cancelled or refunded';
  end if;

  select coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric(12,2)
  into v_total
  from public.sub_orders so
  where so.order_group_id = p_order_id;

  v_due := round(v_total - coalesce(v_order.gift_card_amount, 0), 2);
  if v_due <= 0 then
    return jsonb_build_object('applied', 0, 'amountDue', 0, 'giftCardAmount', v_order.gift_card_amount, 'total', v_total);
  end if;

  v_applied := public.gift_card_apply_core(p_code, v_uid, v_due, p_order_id);

  update public.orders
  set gift_card_amount = coalesce(gift_card_amount, 0) + v_applied
  where id = p_order_id;

  -- Fully covered by gift balance: the money has settled, so any digital
  -- packages on the order release their keys now.
  if round(v_due - v_applied, 2) <= 0 then
    perform public.mint_digital_license_keys(p_order_id);
  end if;

  return jsonb_build_object(
    'applied', v_applied,
    'amountDue', round(v_due - v_applied, 2),
    'giftCardAmount', coalesce(v_order.gift_card_amount, 0) + v_applied,
    'total', v_total
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 2a. Cancel settlement. Runs inside the advance_sub_order_status
--     transaction, once the package has become `cancelled` (a terminal
--     state with no outgoing edges, so this can only ever run once per
--     package): restock like the returns flow does, refund a captured
--     payment through the refunds ledger under the refund RPCs' cap, and
--     settle the order's own payment status once nothing live remains.
-- ----------------------------------------------------------------------------
create or replace function public.settle_cancelled_package(
  p_sub_order_id uuid,
  p_actor uuid,
  p_actor_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_line record;
  v_order public.orders%rowtype;
  v_gross numeric(12,2);
  v_refunded numeric(12,2);
  v_refund numeric(12,2);
begin
  select * into v_so from public.sub_orders where id = p_sub_order_id;
  if not found or v_so.status::text <> 'cancelled' then
    return;
  end if;

  -- Restock: the same item walk complete_return performs, so a cancel and
  -- a return put the units back identically. Digital packages hold no stock.
  if v_so.type = 'physical' then
    for v_line in
      select (i ->> 'productId')::uuid as product_id, (i ->> 'quantity')::int as qty
      from jsonb_array_elements(coalesce(v_so.items, '[]'::jsonb)) i
      where (i ->> 'productId') is not null and (i ->> 'quantity') is not null
    loop
      update public.products
      set stock = stock + v_line.qty
      where id = v_line.product_id
        and seller_id = v_so.seller_id;
    end loop;
  end if;

  select * into v_order from public.orders where id = v_so.order_group_id for update;
  if not found then
    return;
  end if;

  -- Refund: only money actually captured can go back. The cap is the
  -- refund RPCs' cap — package gross less what already went back — and the
  -- row lands in the same refunds ledger they write.
  if v_order.payment_status = 'succeeded'::public.payment_status then
    v_gross := round(coalesce(v_so.subtotal, 0) + coalesce(v_so.shipping_fee, 0), 2);
    select coalesce(sum(r.amount), 0) into v_refunded
    from public.refunds r where r.sub_order_id = v_so.id;
    v_refund := round(v_gross - v_refunded, 2);
    if v_refund > 0 then
      insert into public.refunds (sub_order_id, order_group_id, amount, reason, processed_by)
      values (v_so.id, v_so.order_group_id, v_refund,
              'Automatic refund for a cancelled package', p_actor);

      update public.sub_orders
      set history = history || jsonb_build_array(jsonb_build_object(
        'status', 'refund_issued',
        'timestamp', now(),
        'actor', initcap(coalesce(p_actor_role, 'system')),
        'note', 'Refunded ' || v_refund::text || ' for the cancelled package'
      ))
      where id = v_so.id;

      perform public.admin_audit('order.cancel_refund', 'sub_order', v_so.id::text,
        jsonb_build_object('paymentStatus', v_order.payment_status),
        jsonb_build_object('refundAmount', v_refund));
    end if;
  end if;

  -- The order follows its packages, as in the refund RPCs — extended to
  -- cancelled packages: a captured order reads `refunded`, an uncollected
  -- COD order reads `voided` (nothing was taken, nothing ever will be).
  if not exists (
    select 1 from public.sub_orders so2
    where so2.order_group_id = v_so.order_group_id
      and so2.status::text not in ('cancelled', 'refunded')
  ) then
    if v_order.payment_status = 'succeeded'::public.payment_status then
      update public.orders set payment_status = 'refunded'::public.payment_status
      where id = v_order.id;
    elsif v_order.payment_status = 'pending'::public.payment_status then
      update public.orders set payment_status = 'voided'::public.payment_status
      where id = v_order.id;
    end if;
  end if;
end;
$$;

revoke execute on function public.settle_cancelled_package(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.settle_cancelled_package(uuid, uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 2b. advance_sub_order_status (final def was 20261011001100): identical
--     graph, role matrix, history entry and delivery sync — with the
--     cancel transition settling the package before it returns.
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

  -- A cancellation is a money event, not just a status: the units go back
  -- on the shelf and any captured payment goes back through the refunds
  -- ledger, in this same transaction (see settle_cancelled_package).
  if p_next = 'cancelled' then
    perform public.settle_cancelled_package(p_sub_order_id, v_uid, v_actor_role);
  end if;

  return jsonb_build_object('id', p_sub_order_id, 'status', p_next);
end;
$$;

-- ----------------------------------------------------------------------------
-- 3b. place_order (final def was 20261015040100): identical booking, with
--     one change — a digital package only receives its license key when
--     the payment has settled. Card orders settle at booking, so their
--     keys still arrive instantly; COD orders are created keyless and
--     the settlement paths mint the keys later (3c). A gift card that
--     covers the full amount due settles the order on the spot.
-- ----------------------------------------------------------------------------
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
      -- Batch 56: the key is the goods. It is minted only once the money
      -- has settled — at booking that is true for card orders only. A COD
      -- digital package starts keyless; mint_digital_license_keys fills
      -- it in when the cash trail closes (or a gift card settles the bill).
      if v_payment_status = 'succeeded'::public.payment_status then
        v_license := 'VEND-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
      end if;
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
        -- Batch 56: a gift card that covers the whole bill settles the
        -- order, so digital packages release their keys immediately —
        -- and the response reports the keys it just minted.
        if (v_quote ->> 'grandTotal')::numeric - v_gift_applied <= 0 then
          perform public.mint_digital_license_keys(v_order_id);
          select coalesce(jsonb_agg(
            case when elem ->> 'type' = 'digital'
              then elem || jsonb_build_object('licenseKey', (
                select so.license_key from public.sub_orders so
                where so.id = (elem ->> 'id')::uuid))
              else elem end
            order by ord), '[]'::jsonb)
          into v_out
          from jsonb_array_elements(v_out) with ordinality as t(elem, ord);
        end if;
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

-- ----------------------------------------------------------------------------
-- 3c. The COD settlement paths release the keys.
--     admin_set_payment_status (final def was 20261015070000): identical
--     correction rules, plus the mint when the desk records the money as
--     taken. confirm_cod_handover (final def was 20261015050000): the
--     stamp that closes the cash trail now also closes it for any
--     digital packages riding on the same order.
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

  -- Batch 56: money recorded as taken settles the order, so digital
  -- packages that were waiting keyless receive their license keys.
  if p_status = 'succeeded'::public.payment_status then
    perform public.mint_digital_license_keys(p_order_group_id);
  end if;

  perform public.admin_audit('order.payment_status', 'order', p_order_group_id::text,
    jsonb_build_object('paymentStatus', v_before),
    jsonb_build_object('paymentStatus', p_status, 'reason', p_reason));

  return jsonb_build_object('orderGroupId', p_order_group_id, 'paymentStatus', p_status);
end;
$$;

create or replace function public.confirm_cod_handover(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deliveries%rowtype;
  v_order_id uuid;
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

  -- Batch 56: the handover closes the order's cash trail, so digital
  -- packages on the same order — keyless while the COD was outstanding —
  -- receive their license keys.
  select so.order_group_id into v_order_id
  from public.sub_orders so where so.id = v_d.sub_order_id;
  if v_order_id is not null then
    perform public.mint_digital_license_keys(v_order_id);
  end if;

  return jsonb_build_object(
    'deliveryId', p_delivery_id,
    'codHandedOverAt', now(),
    'codCollectedAmount', v_d.cod_collected_amount
  );
end;
$$;

grant execute on function public.confirm_cod_handover(uuid) to authenticated, service_role;
revoke execute on function public.confirm_cod_handover(uuid) from anon;

-- ----------------------------------------------------------------------------
-- 4. vendor_earned_net_payout (final def was 20261011000900): what the
--    platform owes the store, net of the refunds the platform has already
--    handed back on each package. A package's contribution never drops
--    below zero — a refund is capped at the package gross, and one
--    package's refund must not eat another package's earnings.
-- ----------------------------------------------------------------------------
create or replace function public.vendor_earned_net_payout(p_vendor uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(greatest(0, so.net_payout - coalesce(rf.refunded, 0))), 0)
  from public.sub_orders so
  left join (
    select r.sub_order_id, sum(r.amount) as refunded
    from public.refunds r
    group by r.sub_order_id
  ) rf on rf.sub_order_id = so.id
  where so.seller_id = p_vendor
    and so.status in ('delivered','available');
$$;

-- ----------------------------------------------------------------------------
-- 5. Loyalty clawback. The ledger learns a fourth kind, and every refunds
--    row — staff refund, support refund, the cancel settlement above, any
--    future writer — reverses the points its package earned, in the
--    proportion refunded, through this one trigger. The reversal is
--    capped at what the balance still holds: points already spent are
--    gone, and a balance never goes below zero.
-- ----------------------------------------------------------------------------
do $$
declare
  v_con text;
begin
  select con.conname into v_con
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where ns.nspname = 'public'
    and rel.relname = 'loyalty_transactions'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%''earn''%';
  if v_con is not null then
    execute format('alter table public.loyalty_transactions drop constraint %I', v_con);
  end if;
  alter table public.loyalty_transactions
    add constraint loyalty_transactions_kind_check
    check (kind in ('earn', 'redeem', 'referral', 'clawback'));
end $$;

create or replace function public.handle_refund_loyalty_clawback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_so public.sub_orders%rowtype;
  v_customer uuid;
  v_earned integer;
  v_reversed integer;
  v_gross numeric(12,2);
  v_refunded numeric(12,2);
  v_target integer;
  v_delta integer;
  v_balance integer;
  v_applied integer;
begin
  if new.sub_order_id is null then
    return new;
  end if;
  select * into v_so from public.sub_orders where id = new.sub_order_id;
  if not found then
    return new;
  end if;
  select o.customer_id into v_customer
  from public.orders o where o.id = v_so.order_group_id;
  if v_customer is null then
    return new;
  end if;

  select coalesce(sum(t.points), 0)::integer into v_earned
  from public.loyalty_transactions t
  where t.user_id = v_customer and t.kind = 'earn' and t.ref = v_so.id::text;
  if v_earned <= 0 then
    return new;
  end if;

  v_gross := round(coalesce(v_so.subtotal, 0) + coalesce(v_so.shipping_fee, 0), 2);
  if v_gross <= 0 then
    return new;
  end if;

  select coalesce(sum(r.amount), 0) into v_refunded
  from public.refunds r where r.sub_order_id = v_so.id;
  v_target := floor(v_earned * least(v_refunded, v_gross) / v_gross)::integer;

  select coalesce(-sum(t.points), 0)::integer into v_reversed
  from public.loyalty_transactions t
  where t.user_id = v_customer and t.kind = 'clawback' and t.ref = v_so.id::text;

  v_delta := v_target - v_reversed;
  if v_delta <= 0 then
    return new;
  end if;

  select points into v_balance
  from public.loyalty_accounts where user_id = v_customer for update;
  if not found then
    return new;
  end if;
  v_applied := least(v_delta, v_balance);
  if v_applied <= 0 then
    return new;
  end if;

  insert into public.loyalty_transactions (user_id, kind, points, ref)
  values (v_customer, 'clawback', -v_applied, v_so.id::text);

  update public.loyalty_accounts
  set points = points - v_applied, updated_at = now()
  where user_id = v_customer;

  return new;
end;
$$;

drop trigger if exists trg_refunds_loyalty_clawback on public.refunds;
create trigger trg_refunds_loyalty_clawback
  after insert on public.refunds
  for each row execute function public.handle_refund_loyalty_clawback();

revoke execute on function public.handle_refund_loyalty_clawback() from public, anon, authenticated;
