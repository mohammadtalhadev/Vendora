-- ==============================================================================
-- Vendora Marketplace: Instant Fix for Null seller_name Column in products
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure seller_name column exists
alter table public.products
add column if not exists seller_name text;

-- 2. Populate vendor products from vendor_profiles store_name
update public.products p
set seller_name = v.store_name
from public.vendor_profiles v
where p.seller_id = v.id
  and p.seller_type = 'vendor';

-- 3. Populate platform products (1P) with 'Vendora'
update public.products
set seller_name = 'Vendora'
where seller_type = 'platform' or seller_name is null;

-- 4. Verify no remaining nulls
select id, title, brand, seller_id, seller_name, seller_type
from public.products
order by id
limit 15;
