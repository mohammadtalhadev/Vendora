-- ============================================================================
-- Vendora 0007: Review trust.
--
-- reviews.verified_purchase used to be a plain client-supplied boolean with a
-- default of true, so any signed-in browser could stamp "Verified Purchaser" on
-- its own review. The flag is now derived in Postgres from a sub_order that
-- actually contains the product, and the two update policies pin every column
-- they did not pin before, so bumping a helpful count or posting a merchant
-- reply can no longer rewrite review content either.
-- ============================================================================

alter table public.reviews
  alter column verified_purchase set default false;

-- A purchase is verified when the reviewer owns a sub_order of the reviewed
-- product that has been delivered (physical) or issued (digital licence).
create or replace function public.flag_verified_purchase()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Bulk imports and seeds run without a JWT subject and keep whatever they
  -- declare; a browser request never takes this branch.
  if auth.uid() is null then
    return new;
  end if;

  new.verified_purchase := exists (
    select 1
    from public.sub_orders so
    join public.orders o on o.id = so.order_group_id
    where o.customer_id = new.author_id
      and so.seller_id = (select p.seller_id from public.products p where p.id = new.product_id)
      and (
        so.status = 'delivered'
        or (so.type = 'digital' and so.status in ('available', 'paid'))
      )
      and so.items @> jsonb_build_array(jsonb_build_object('productId', new.product_id))
  );
  return new;
end;
$$;

create trigger trg_reviews_verified_purchase
  before insert on public.reviews
  for each row
  when (new.author_id is not null)
  execute function public.flag_verified_purchase();

comment on function public.flag_verified_purchase() is
  'Derives reviews.verified_purchase from delivered/issued sub_orders. SECURITY INVOKER: the reviewer can only ever prove their own purchases, because sub_orders RLS exposes exactly their own rows.';

-- ----------------------------------------------------------------------------
-- Tighten the two review update policies. Both compare NEW against the stored
-- row for every column except the one the actor is allowed to change.
-- ----------------------------------------------------------------------------

drop policy reviews_update_helpful on public.reviews;
create policy reviews_update_helpful on public.reviews
  for update to authenticated
  using (true)
  with check (
    author_id = (select old_r.author_id from public.reviews old_r where old_r.id = reviews.id)
    and product_id = (select old_r.product_id from public.reviews old_r where old_r.id = reviews.id)
    and author_name = (select old_r.author_name from public.reviews old_r where old_r.id = reviews.id)
    and author_avatar = (select old_r.author_avatar from public.reviews old_r where old_r.id = reviews.id)
    and author_country = (select old_r.author_country from public.reviews old_r where old_r.id = reviews.id)
    and verified_purchase = (select old_r.verified_purchase from public.reviews old_r where old_r.id = reviews.id)
    and order_number is not distinct from (select old_r.order_number from public.reviews old_r where old_r.id = reviews.id)
    and rating = (select old_r.rating from public.reviews old_r where old_r.id = reviews.id)
    and headline = (select old_r.headline from public.reviews old_r where old_r.id = reviews.id)
    and body = (select old_r.body from public.reviews old_r where old_r.id = reviews.id)
    and photos = (select old_r.photos from public.reviews old_r where old_r.id = reviews.id)
    and seller_reply is not distinct from (select old_r.seller_reply from public.reviews old_r where old_r.id = reviews.id)
  );

drop policy reviews_update_vendor_reply on public.reviews;
create policy reviews_update_vendor_reply on public.reviews
  for update to authenticated
  using (public.owns_review(id))
  with check (
    public.owns_review(id)
    and author_id = (select old_r.author_id from public.reviews old_r where old_r.id = reviews.id)
    and product_id = (select old_r.product_id from public.reviews old_r where old_r.id = reviews.id)
    and author_name = (select old_r.author_name from public.reviews old_r where old_r.id = reviews.id)
    and author_avatar = (select old_r.author_avatar from public.reviews old_r where old_r.id = reviews.id)
    and author_country = (select old_r.author_country from public.reviews old_r where old_r.id = reviews.id)
    and verified_purchase = (select old_r.verified_purchase from public.reviews old_r where old_r.id = reviews.id)
    and order_number is not distinct from (select old_r.order_number from public.reviews old_r where old_r.id = reviews.id)
    and rating = (select old_r.rating from public.reviews old_r where old_r.id = reviews.id)
    and headline = (select old_r.headline from public.reviews old_r where old_r.id = reviews.id)
    and body = (select old_r.body from public.reviews old_r where old_r.id = reviews.id)
    and photos = (select old_r.photos from public.reviews old_r where old_r.id = reviews.id)
    and helpful_count = (select old_r.helpful_count from public.reviews old_r where old_r.id = reviews.id)
  );
