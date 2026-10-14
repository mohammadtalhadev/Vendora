-- ----------------------------------------------------------------------------
-- Batch 41 — review moderation.
--
-- Until now every review was instantly public and counted toward the product
-- (and vendor) rating rollups. This migration gives the admin console a
-- moderation switch:
--
--   * `reviews.hidden` / `reviews.moderation_note` — the moderation state.
--   * Both rating rollups count only visible (hidden = false) reviews.
--   * `admin_set_review_hidden` — the audited governance write behind the
--     Hide / Restore actions in the new /admin/reviews queue.
--   * `admin_review_queue` — the guarded read that queue renders.
--   * RLS: the public can no longer read hidden reviews; the review's own
--     author still can (their account page marks it "Hidden by moderators"),
--     and staff (admin / support) keep full read. The two review UPDATE
--     policies are re-issued with `hidden` / `moderation_note` pinned, so a
--     helpful-count bump or a seller reply cannot smuggle a moderation change.
--
-- Runs after 20261015000000 (vendor rating rollup) when that migration is
-- present, but is self-sufficient without it: the vendor rollup function and
-- its trigger are (re)created here either way.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. Moderation state on the review row.
-- ----------------------------------------------------------------------------
alter table public.reviews
  add column if not exists hidden boolean not null default false;

alter table public.reviews
  add column if not exists moderation_note text;

create index if not exists reviews_hidden_idx on public.reviews (hidden);

-- ----------------------------------------------------------------------------
-- 2. Product rating rollup: only visible reviews count.
--
-- Same body as the core schema's function, with the aggregate narrowed to
-- hidden = false. The existing trigger (trg_reviews_rating, AFTER INSERT OR
-- UPDATE OR DELETE) already fires on UPDATE, so a moderation write — which
-- only changes `hidden` / `moderation_note` — recomputes the rollup.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p
  set rating = coalesce(agg.avg_rating, 0),
      review_count = coalesce(agg.cnt, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
    from public.reviews where product_id = pid and hidden = false
  ) agg
  where p.id = pid;
  return coalesce(new, old);
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Vendor rating rollup: same rule, one level up.
--
-- Recomputes vendor_profiles.rating / review_count for the seller of the
-- affected product from that seller's non-hidden reviews (reviews join
-- products on seller_id). Handles the product changing hands by refreshing
-- both the old and the new seller. CREATE OR REPLACE keeps this correct
-- whether or not 20261015000000 already defined the function.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_vendor_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_sellers uuid[] := '{}';
begin
  if tg_op <> 'DELETE' then
    select seller_id into v_seller from public.products where id = new.product_id;
    if v_seller is not null then v_sellers := v_sellers || v_seller; end if;
  end if;
  if tg_op <> 'INSERT' then
    select seller_id into v_seller from public.products where id = old.product_id;
    if v_seller is not null and not (v_sellers @> array[v_seller]) then
      v_sellers := v_sellers || v_seller;
    end if;
  end if;

  foreach v_seller in array v_sellers loop
    update public.vendor_profiles vp
    set rating = coalesce(agg.avg_rating, 0),
        review_count = coalesce(agg.cnt, 0)
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as cnt
      from public.reviews r
      join public.products p on p.id = r.product_id
      where p.seller_id = v_seller and r.hidden = false
    ) agg
    where vp.id = v_seller;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_vendor_rating on public.reviews;
create trigger trg_reviews_vendor_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_vendor_rating();

-- ----------------------------------------------------------------------------
-- 4. The moderation queue read.
--
-- Guarded like every console queue: the body reads across store boundaries
-- as the function owner, so admin_require_admin is the check, not RLS.
-- Counts are platform-wide (the summary chips), `total` is the filtered set.
-- ----------------------------------------------------------------------------
create or replace function public.admin_review_queue(
  p_status text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.admin_require_admin('read the review moderation queue');
with
  rollups as (
    select
      r.id, r.product_id, r.author_id, r.author_name, r.rating, r.headline,
      r.body, r.verified_purchase, r.helpful_count, r.seller_reply,
      r.hidden, r.moderation_note, r.created_at,
      p.title as product_title,
      p.slug as product_slug,
      vp.store_name as store_name
    from public.reviews r
    join public.products p on p.id = r.product_id
    left join public.vendor_profiles vp on vp.id = p.seller_id
    where (p_status = 'all'
           or (p_status = 'visible' and r.hidden = false)
           or (p_status = 'hidden' and r.hidden = true))
      and (btrim(coalesce(p_search, '')) = ''
           or r.author_name ilike '%' || p_search || '%'
           or r.headline ilike '%' || p_search || '%'
           or r.body ilike '%' || p_search || '%'
           or p.title ilike '%' || p_search || '%')
  ),
  paged as (
    select r.*, count(*) over () as total from rollups r
    order by r.created_at desc
    limit greatest(coalesce(p_page_size, 20), 1)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 20), 1)
  )
select jsonb_build_object(
  'page', greatest(coalesce(p_page, 1), 1),
  'pageSize', greatest(coalesce(p_page_size, 20), 1),
  'total', coalesce((select max(total) from paged), 0),
  'counts', jsonb_build_object(
    'total', (select count(*) from public.reviews),
    'visible', (select count(*) from public.reviews where hidden = false),
    'hidden', (select count(*) from public.reviews where hidden = true)
  ),
  'rows', coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'productId', product_id,
    'productTitle', product_title,
    'productSlug', product_slug,
    'storeName', store_name,
    'authorId', author_id,
    'authorName', author_name,
    'rating', rating,
    'headline', headline,
    'body', body,
    'verifiedPurchase', verified_purchase,
    'helpfulCount', helpful_count,
    'hasSellerReply', seller_reply is not null,
    'hidden', hidden,
    'moderationNote', moderation_note,
    'createdAt', created_at
  ) order by created_at desc), '[]'::jsonb)
) from paged;
$$;

-- ----------------------------------------------------------------------------
-- 5. The moderation write: hide / restore one review, audited.
--
-- Admin-only (42501 for everyone else, the codebase's staff-denied code).
-- The UPDATE fires both rating rollup triggers, so the product and vendor
-- aggregates follow the new visibility without any client-side patching.
-- ----------------------------------------------------------------------------
create or replace function public.admin_set_review_hidden(
  p_review_id uuid,
  p_hidden boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before boolean;
begin
  if not public.is_admin() then
    raise exception 'Only the platform team can moderate reviews' using errcode = '42501';
  end if;

  select hidden into v_before from public.reviews where id = p_review_id;
  if v_before is null then
    raise exception 'Review not found';
  end if;

  update public.reviews
     set hidden = p_hidden,
         moderation_note = p_note
   where id = p_review_id;

  perform public.admin_audit(
    case when p_hidden then 'review.hidden' else 'review.restored' end,
    'review', p_review_id::text,
    jsonb_build_object('hidden', v_before),
    jsonb_build_object('hidden', p_hidden, 'note', p_note));

  return jsonb_build_object('id', p_review_id, 'hidden', p_hidden);
end;
$$;

grant execute on function
  public.admin_review_queue(text, text, integer, integer),
  public.admin_set_review_hidden(uuid, boolean, text)
to authenticated, service_role;

revoke execute on function
  public.admin_review_queue(text, text, integer, integer),
  public.admin_set_review_hidden(uuid, boolean, text)
from anon;

-- ----------------------------------------------------------------------------
-- 6. RLS: hidden reviews leave the public read.
--
-- Was: reviews_select_public `using (true)` — every role, hidden or not.
-- Now: the public policy exposes visible reviews plus a review to its own
-- author (so Account → My Reviews can show it, marked as hidden), and a
-- separate staff policy keeps admin / support reads complete. The insert
-- policy and the delete policy are untouched.
-- ----------------------------------------------------------------------------
drop policy if exists reviews_select_public on public.reviews;
drop policy if exists reviews_select_visible on public.reviews;
create policy reviews_select_visible on public.reviews
  for select
  using (
    hidden = false
    -- Plain call, NOT the usual `(select auth.uid())` wrapper: the two
    -- review UPDATE policies reference reviews itself (the old-row snapshot
    -- subqueries), and a SubLink in this policy makes Postgres report
    -- "infinite recursion detected in policy for relation reviews" on any
    -- review UPDATE (verified in PGlite via scripts/smoke-rpcs.ts).
    or author_id = auth.uid()
  );

drop policy if exists reviews_select_staff on public.reviews;
create policy reviews_select_staff on public.reviews
  for select to authenticated
  using (public.is_admin() or public.has_role('support'));

-- The two UPDATE policies are re-issued from their current (review-trust)
-- definitions with the moderation columns pinned to the stored row: without
-- this, anyone could flip `hidden` through the helpful-count policy, and a
-- vendor could hide reviews of their own products through the reply policy.
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
    and hidden = (select old_r.hidden from public.reviews old_r where old_r.id = reviews.id)
    and moderation_note is not distinct from (select old_r.moderation_note from public.reviews old_r where old_r.id = reviews.id)
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
    and hidden = (select old_r.hidden from public.reviews old_r where old_r.id = reviews.id)
    and moderation_note is not distinct from (select old_r.moderation_note from public.reviews old_r where old_r.id = reviews.id)
  );
