-- ============================================================================
-- Vendora 0006: Catalog read support
-- The storefront renders, filters and facets products by the kind of seller
-- behind them ("sold by Vendora" vs a third-party store). The products table
-- only carries seller_id, so every read had to guess the kind from the store
-- slug. The enum already existed but no column used it.
-- ============================================================================

alter table public.vendor_profiles
  add column if not exists seller_type public.seller_type not null default 'vendor';

comment on column public.vendor_profiles.seller_type is
  'platform = sold and fulfilled by the marketplace itself; vendor = third-party store.';
