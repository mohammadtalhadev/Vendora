-- ============================================================================
-- Vendora Batch 91: seller-set regional delivery times.
--
-- Until now the only delivery-time statement the site could make was the
-- platform standard (2–4 business days, canonised in
-- src/lib/delivery-estimate.ts): no per-seller transit data existed anywhere
-- in the schema. This migration gives each store a place to publish its own
-- times — a `delivery_times` jsonb bag on its existing shipping-settings row,
-- one {min, max} business-day range per region tier:
--
--   { "sameCity": {"min":1,"max":2}, "sameProvince": {"min":2,"max":3},
--     "nationwide": {"min":3,"max":5} }
--
-- Tiers, not a province table: the seller's origin city/state and the
-- buyer's address city/state are all free text in this schema, so the
-- client classifies a buyer by comparing those (same city, else same
-- province/state, else nationwide). A tier the seller leaves out is unset;
-- the client quotes the platform standard for it. Ranges are validated
-- (1–15 days, min <= max) by the client parser and the seller form; the
-- database only guarantees the bag is a JSON object.
--
-- Buyer reads: `vendor_shipping_settings` stays owner-only (it holds
-- freight rates, the dispatch phone and the gate note). Buyers read the
-- new `store_delivery_times` view instead, which exposes ONLY the vendor
-- id, the delivery-times bag and the origin city/state the tier matching
-- runs on — no rates, no street, no phone. The view is a plain view on
-- purpose (same reasoning as Batch 74's store_order_stats): it reads with
-- its owner's privileges, so the public rows stay readable while the
-- underlying settings rows remain exactly as locked down as they were. Do
-- NOT add `security_invoker`.
--
-- Pre-migration the site keeps working: the client reads this column and
-- view best-effort and falls back to the standard 2–4 day quote wherever
-- they are missing (soft-fail, Batch 74 pattern).
-- ============================================================================

alter table public.vendor_shipping_settings
  add column if not exists delivery_times jsonb not null default '{}'::jsonb;

alter table public.vendor_shipping_settings
  drop constraint if exists vendor_shipping_settings_delivery_times_shape;
alter table public.vendor_shipping_settings
  add constraint vendor_shipping_settings_delivery_times_shape
  check (jsonb_typeof(delivery_times) = 'object');

create or replace view public.store_delivery_times as
select
  vss.vendor_id as vendor_id,
  vss.delivery_times as delivery_times,
  vss.city as origin_city,
  vss.state as origin_state
from public.vendor_shipping_settings vss;

comment on view public.store_delivery_times is
  'Public per-store delivery times (Batch 91): vendor_id (= vendor_profiles.id), the seller-set delivery_times tier bag, and the origin city/state buyer tiers are matched against. No rates, street, phone or other settings columns.';

grant select on public.store_delivery_times to anon, authenticated;
grant select on public.store_delivery_times to service_role;
