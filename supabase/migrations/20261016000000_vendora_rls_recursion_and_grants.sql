-- ============================================================================
-- VENDORA — Batch 55: RLS recursion repair + grant hygiene + bucket limits
--
-- 1. RECURSION (Postgres 42P17), profiles + vendor_profiles.
--    `profiles_update_self` (final form: 20261015040000 §P9a) and
--    `vendor_profiles_update_owner` (20261011000200) pin protected columns by
--    subquerying the SAME table inside WITH CHECK. Because each policy's
--    ownership test is a direct column-to-auth.uid() comparison, the rewriter
--    expands the policy's own table reference against the table's policies
--    and aborts EVERY authenticated UPDATE — even one touching only `name` —
--    with "infinite recursion detected in policy". Profile save and vendor
--    store-settings save are both dead on the live database today (verified
--    live and reproduced in PGlite).
--
--    The same pin idiom on products / media_items / promotions / reviews does
--    NOT recurse (reproduced in PGlite with row-matching updates): there the
--    ownership test resolves through a SECURITY DEFINER helper
--    (current_vendor_id() / owns_review()), which is opaque to the rewriter.
--    Those policies are deliberately left untouched.
--
--    Repair (the pattern BACKEND.md prescribes, mirroring has_role()): move
--    the "read the OLD row" lookup into a SECURITY DEFINER helper whose body
--    the rewriter cannot see, and call it from WITH CHECK. The helpers only
--    ever answer for the caller's own row, so granting them to authenticated
--    exposes nothing a direct RPC call could abuse. Comparison semantics are
--    preserved exactly (plain `=` where the old policy used `=`,
--    IS NOT DISTINCT FROM for the nullable commission override): a protected
--    column still cannot be changed by its owner — the update is rejected,
--    never coerced.
--
-- 2. GRANT REPAIR. The Phase-11 sweep (20261015040000 §P11b) granted EXECUTE
--    to authenticated on every definer function, silently undoing the
--    deliberate exclusion in 20261015030000: enqueue_notification and
--    profile_phone were never meant to be client-callable. Their only callers
--    are SECURITY DEFINER trigger functions in that same migration, which run
--    as the function owner and are unaffected by these revokes. Separately,
--    admin_vendor_settled_gmv / admin_vendor_tier are unguarded definer reads
--    swept into the same grant; their only callers are the admin console
--    queue/detail RPCs (already behind admin_require_admin), so instead of a
--    revoke they gain the house guard in-body and keep their grants — an
--    admin's direct call keeps working, a customer's now raises 42501.
--
-- 3. BUCKET LIMITS. delivery-proofs (created 20261015050000) was never added
--    to the storage.buckets limits block in 20261015040000 and has no
--    server-side size/MIME limits at all. It gets the same limits as the
--    other image buckets: 5 MB, images only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. profiles: pinned-column helper + policy re-issue
-- ----------------------------------------------------------------------------
create or replace function public.profile_pinned(p_id uuid)
returns table (
  roles public.user_role[],
  vendor_status public.vendor_status,
  account_status public.account_state
)
language sql
stable
security definer
set search_path = public
as $$
  select p.roles, p.vendor_status, p.account_status
  from public.profiles p
  where p.id = p_id
    and p.id = (select auth.uid());
$$;

revoke execute on function public.profile_pinned(uuid) from public;
grant execute on function public.profile_pinned(uuid) to authenticated, service_role;

drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and roles = (select g.roles from public.profile_pinned(profiles.id) g)
    and vendor_status = (select g.vendor_status from public.profile_pinned(profiles.id) g)
    and account_status = (select g.account_status from public.profile_pinned(profiles.id) g)
  );

-- ----------------------------------------------------------------------------
-- 1b. vendor_profiles: pinned-column helper + policy re-issue
-- ----------------------------------------------------------------------------
create or replace function public.vendor_profile_pinned(p_id uuid)
returns table (
  status public.vendor_state,
  commission_rate_override numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select vp.status, vp.commission_rate_override
  from public.vendor_profiles vp
  where vp.id = p_id
    and vp.user_id = (select auth.uid());
$$;

revoke execute on function public.vendor_profile_pinned(uuid) from public;
grant execute on function public.vendor_profile_pinned(uuid) to authenticated, service_role;

drop policy vendor_profiles_update_owner on public.vendor_profiles;
create policy vendor_profiles_update_owner on public.vendor_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and status = (select g.status from public.vendor_profile_pinned(vendor_profiles.id) g)
    and commission_rate_override is not distinct from
      (select g.commission_rate_override from public.vendor_profile_pinned(vendor_profiles.id) g)
  );

-- ----------------------------------------------------------------------------
-- 2a. enqueue_notification / profile_phone: restore the deliberate exclusion
-- from 20261015030000. Internal callers are SECURITY DEFINER triggers and run
-- as the owner, so they keep working; service_role keeps its grant.
-- ----------------------------------------------------------------------------
revoke execute on function
  public.enqueue_notification(text, text, text, text, text, uuid)
  from public, authenticated;

revoke execute on function
  public.profile_phone(uuid)
  from public, authenticated;

-- ----------------------------------------------------------------------------
-- 2b. admin_vendor_settled_gmv / admin_vendor_tier: same bodies, now behind
-- the house guard. Grants are untouched (the sweep's authenticated grant
-- stays, and admin console callers arrive with an admin JWT).
-- ----------------------------------------------------------------------------
create or replace function public.admin_vendor_settled_gmv(p_vendor uuid, p_days integer)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_admin('read vendor revenue figures');

  return (
    select coalesce(sum(so.subtotal + so.shipping_fee), 0)::numeric
    from public.sub_orders so
    where so.seller_id = p_vendor
      and so.status in ('delivered', 'refunded')
      and so.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  );
end;
$$;

create or replace function public.admin_vendor_tier(p_vendor uuid, p_days integer default 365)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_admin('read vendor revenue figures');

  return (
    select case
             when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 100000 then 'enterprise'
             when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 25000 then 'volume_preferred'
             when public.admin_vendor_settled_gmv(p_vendor, p_days) >= 5000 then 'growing'
             else 'standard'
           end
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. delivery-proofs bucket limits. Same guarded DO block as 20261015040000:
-- the local PGlite stub storage.buckets lacks the limit columns, so this
-- applies on hosted Supabase and skips in local validation.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets'
      and column_name in ('file_size_limit', 'allowed_mime_types')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    update storage.buckets
      set file_size_limit = 5242880,
          allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
      where id = 'delivery-proofs';
  end if;
end $$;
