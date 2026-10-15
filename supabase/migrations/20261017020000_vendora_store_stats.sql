-- ============================================================================
-- Vendora Batch 74: store order stats — the public "orders delivered" count.
--
-- The homepage "Shop by Store" cards (and the /brands store directory) show
-- each store's real rating/review rollup from `vendor_profiles`, but an
-- orders-delivered count was impossible to show honestly: the counts live in
-- `sub_orders`, whose RLS policies expose rows only to the order's customer,
-- its vendor, staff, and the assigned rider. This migration adds the one
-- public window onto that data the storefront is allowed to have — an
-- aggregate-only view:
--
--   * one row per vendor, ONLY for vendors with at least one delivery;
--   * two columns: the vendor id and the count of delivered sub-orders;
--   * no order rows, no customer data, no amounts — counts, nothing else.
--
-- `sub_orders` names its vendor column `seller_id` (a foreign key to
-- `vendor_profiles.id`, which is the id the store cards already carry); the
-- view exposes it under the name `vendor_id`.
--
-- A plain view is deliberate here: a view reads with its owner's privileges
-- unless marked SECURITY INVOKER, so this aggregate stays readable while the
-- underlying rows remain exactly as locked down as they were. Do NOT add
-- `security_invoker` — it would re-apply the caller's RLS and the public
-- counts would silently read as zero.
--
-- The SELECT grant is explicit: the grants hygiene migrations revoked the
-- default privileges that used to hand new relations to anon automatically.
-- ============================================================================

create or replace view public.store_order_stats as
select
  so.seller_id as vendor_id,
  count(*)::bigint as orders_delivered
from public.sub_orders so
where so.status = 'delivered'
group by so.seller_id;

comment on view public.store_order_stats is
  'Public aggregate: delivered sub-order count per vendor (vendor_id = vendor_profiles.id). Counts only — no order rows or customer data.';

grant select on public.store_order_stats to anon, authenticated;
grant select on public.store_order_stats to service_role;
