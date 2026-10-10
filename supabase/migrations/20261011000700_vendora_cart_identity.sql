-- ============================================================================
-- Vendora 0008: Cart line identity.
--
-- cart_items were keyed by unique (user_id, product_id, variant_id) with a
-- nullable variant_id. Postgres considers NULLs distinct inside a unique
-- constraint, so a line with no variant could be inserted again and again, and a
-- client upsert with on_conflict = user_id,product_id,variant_id could never
-- match the row it was meant to update. "No variant" is now the empty string:
-- one normal value that the key and the upsert both understand.
-- ============================================================================

update public.cart_items set variant_id = '' where variant_id is null;

alter table public.cart_items
  alter column variant_id set default '',
  alter column variant_id set not null;

comment on column public.cart_items.variant_id is
  'products.variants[] id, or the empty string when the line has no variant. Never NULL: a NULL escapes the unique (user_id, product_id, variant_id) key, letting a customer stack duplicate lines.';
