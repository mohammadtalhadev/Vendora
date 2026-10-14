-- ============================================================================
-- Batch 40 — vendor power tools
--
-- 1. request_payout: serialize concurrent requests per vendor. Two requests
--    fired at the same moment previously both read the same available
--    balance, both passed the balance check, and both inserted a payout —
--    a double payment out of one balance. Taking the vendor_profiles row
--    `for update` at the start of the transaction makes the second request
--    wait until the first commits, so its balance check sees the first
--    payout already recorded. The body below is the definition from
--    20261011000900_vendora_vendor_workspace.sql copied verbatim, with only
--    the lock (and this note) added.
--
-- 2. delete_vendor_product: a real hard delete for listings that have never
--    been ordered or reviewed. Listings with order history or reviews are
--    refused — past orders and buyer reviews keep referencing them, and the
--    honest path for those is withdraw/archive, not deletion.
--
-- 3. vendor_applications own-read: checked 20261011000200_vendora_rls.sql —
--    policy `applications_select_own` (user_id = auth.uid()) already exists,
--    so applicants can already read their own rows. Nothing to add, and
--    nothing is loosened here.
-- ============================================================================

create or replace function public.request_payout(p_amount numeric, p_method text default 'instant')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_available numeric;
  v_fee numeric;
  v_payout_id uuid;
  v_ref text;
begin
  if v_vendor is null then
    raise exception 'No vendor store for this account' using errcode = '42501';
  end if;
  -- Serialize concurrent payout requests for this vendor: two simultaneous
  -- requests previously both passed the balance check below against the same
  -- available balance and both inserted a payout. Locking the vendor's own
  -- vendor_profiles row makes later requests wait for this transaction to
  -- commit, so their balance check accounts for this payout.
  perform 1 from public.vendor_profiles where id = v_vendor for update;
  if p_method not in ('instant','standard') then
    raise exception 'Payout method must be instant or standard';
  end if;
  if p_amount <= 0 then
    raise exception 'Payout amount must be positive';
  end if;

  v_available := public.vendor_available_balance(v_vendor);
  if p_amount > v_available then
    raise exception 'Payout exceeds available balance of %', v_available;
  end if;

  v_fee := case when p_method = 'instant' then round(p_amount * 0.015, 2) else 0 end;
  v_ref := 'FAST-' || (floor(10000000 + random() * 90000000))::int::text;

  insert into public.payouts (vendor_id, amount, status, payment_method, payment_reference, metadata)
  values (
    v_vendor,
    p_amount,
    'processing',
    case when p_method = 'instant' then 'ACH Instant Direct Transfer' else 'ACH Standard Transfer' end,
    v_ref,
    jsonb_build_object(
      'type', p_method,
      'fee', v_fee,
      'deposit', round(p_amount - v_fee, 2),
      'balanceAfter', round(v_available - p_amount, 2)
    )
  )
  returning id into v_payout_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'Vendor', 'payout.requested', 'payout', v_payout_id::text,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'fee', v_fee));

  return jsonb_build_object(
    'payoutId', v_payout_id,
    'reference', v_ref,
    'amount', p_amount,
    'fee', v_fee,
    'deposit', round(p_amount - v_fee, 2)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Hard delete for a vendor's own listing. Refused when the product appears in
-- any sub-order's items or carries any review: those records are the store's
-- and the buyers' history, and deleting the product would orphan them. On
-- success the products row is deleted and the existing FK cascades clear the
-- dependent rows (reviews are already excluded above; cart items, wishlist
-- entries and product questions cascade).
-- ----------------------------------------------------------------------------
create or replace function public.delete_vendor_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor uuid := public.current_vendor_id();
  v_product public.products%rowtype;
begin
  if v_vendor is null then
    raise exception 'No vendor store for this account' using errcode = '42501';
  end if;

  select * into v_product from public.products
  where id = p_product_id and seller_id = v_vendor
  for update;
  if not found then
    raise exception 'Product not found for this store';
  end if;

  if exists (
    select 1
    from public.sub_orders so, jsonb_array_elements(so.items) i
    where i->>'product_id' = p_product_id::text
  ) then
    raise exception 'This product has orders and cannot be deleted. Withdraw it from sale instead.';
  end if;

  if exists (select 1 from public.reviews r where r.product_id = p_product_id) then
    raise exception 'This product has reviews and cannot be deleted. Withdraw it from sale instead.';
  end if;

  delete from public.products where id = p_product_id;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data)
  values (auth.uid(), 'Vendor', 'product.deleted', 'product', p_product_id::text,
          jsonb_build_object('title', v_product.title, 'status', v_product.status));

  return jsonb_build_object('deleted', true, 'productId', p_product_id);
end;
$$;

grant execute on function public.delete_vendor_product(uuid) to authenticated, service_role;
revoke execute on function public.delete_vendor_product(uuid) from anon;
