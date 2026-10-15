-- ============================================================================
-- Vendora Batch 75: a category banner can be REMOVED, not only replaced.
--
-- `admin_update_category` (20261011001000) has coalesced a null `p_image`
-- back to the stored value since the console landed, and the Batch 52 banner
-- field inherited that: an admin could paste a new URL but never clear one
-- out — a banner, once set, was permanent. Clearing is now explicit. The RPC
-- gains a trailing parameter `p_clear_image boolean default false`:
--
--   * p_clear_image = true            -> image is set to NULL, whatever
--                                        p_image carries;
--   * p_image null or blank, no flag  -> the stored image is kept, exactly
--                                        as today (a partial form cannot
--                                        wipe a banner either);
--   * any other p_image, no flag      -> the image is replaced, as today.
--
-- The default keeps every existing caller on today's behaviour. Postgres
-- keys a function by its full signature, so the seven-argument original is
-- dropped and replaced by the eight-argument version below; the body is
-- otherwise the 20261011001000 body unchanged, and the grants are re-asserted
-- in the shape the recent batches use (no PUBLIC/anon execute; authenticated
-- and service_role may call, and the admin guard lives inside).
-- ============================================================================

drop function if exists public.admin_update_category(uuid, text, text, uuid, boolean, text, text);

create function public.admin_update_category(
  p_category_id uuid,
  p_name text default null,
  p_slug text default null,
  p_parent_id uuid default null,
  p_is_active boolean default null,
  p_icon text default null,
  p_image text default null,
  p_clear_image boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  perform public.admin_require_admin('edit a category');

  select jsonb_build_object('name', name, 'slug', slug, 'parentId', parent_id, 'isActive', is_active)
    into v_before from public.categories where id = p_category_id;
  if v_before is null then
    raise exception 'Category not found';
  end if;
  -- A category cannot sit inside itself; that breaks the tree the page walks.
  if p_parent_id = p_category_id then
    raise exception 'A category cannot be its own parent';
  end if;

  update public.categories
     set name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
         slug = coalesce(nullif(lower(btrim(coalesce(p_slug, ''))), ''), slug),
         parent_id = case when p_parent_id is not null then p_parent_id else parent_id end,
         is_active = coalesce(p_is_active, is_active),
         icon = coalesce(p_icon, icon),
         image = case when p_clear_image then null
                      when p_image is null or btrim(p_image) = '' then image
                      else p_image end
   where id = p_category_id;

  perform public.admin_audit('category.update', 'category', p_category_id::text, v_before,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'parentId', p_parent_id, 'isActive', p_is_active));

  return jsonb_build_object('id', p_category_id);
end;
$$;

revoke execute on function
  public.admin_update_category(uuid, text, text, uuid, boolean, text, text, boolean)
from public, anon;

grant execute on function
  public.admin_update_category(uuid, text, text, uuid, boolean, text, text, boolean)
to authenticated, service_role;
