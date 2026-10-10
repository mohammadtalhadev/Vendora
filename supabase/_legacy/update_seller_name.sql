-- ==============================================================================
-- Vendora Marketplace: Update Platform Seller Name to "Vendora"
-- ==============================================================================

update public.products
set seller_name = 'Vendora'
where seller_name = 'Vendora Direct';
