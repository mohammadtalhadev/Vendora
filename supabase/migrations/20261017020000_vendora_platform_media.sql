-- ============================================================================
-- Vendora Batch 72: platform media - the admin's OWN folders and files.
--
-- Until now every media row had to belong to a store: `media_folders.vendor_id`
-- and `media_items.vendor_id` were NOT NULL, so the platform team could
-- organise and moderate sellers' assets (Batch 61) but could not own a single
-- folder or file itself - there was nowhere for a banner or CMS asset the
-- platform uploads to live, and the console's Upload stayed gated off.
--
-- This batch makes NULL the platform owner:
--
--   1. `vendor_id` drops NOT NULL on both tables (the FK stays: a non-null
--      value must still be a real store). A NULL row is platform-owned.
--   2. Platform folder names are unique case-insensitively through a partial
--      unique index - the table's UNIQUE(vendor_id, name) treats NULLs as
--      distinct, so it cannot speak for the platform's own rows. Vendor rows
--      keep that existing constraint untouched.
--   3. Platform RLS is written out explicitly. The Batch 61 folder policies
--      and the `media_select_owner` / `media_moderate_admin` item policies
--      already admit staff to NULL-owned rows as a side effect of their
--      `is_admin()` branches (a NULL never equals `current_vendor_id()`, so
--      sellers gain nothing), but ownership rules should not rest on a
--      fallthrough: platform folders and items are staff-read, and platform
--      writes are admin-only. A platform item row is still deleted through
--      the Batch 61 `admin_delete_media` RPC, which keys on the row id and
--      never assumed an owner, so it needed no change.
--   4. `admin_upload_media` - the recording half of a staff upload. The
--      console writes the object to `vendor-assets` itself (the bucket
--      policy already admits an admin to any path), but the ROW for a
--      store-owned file cannot be inserted by an admin directly:
--      `media_insert_owner` demands `vendor_id = current_vendor_id()`, which
--      staff never satisfy. This definer RPC is the guarded, audited insert
--      for both destinations - a store's slug path or the platform's own
--      `platform/` path - and staff uploads are born `approved`, since the
--      review queue exists for sellers' files, not the platform's own.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NULL vendor_id = platform-owned, on both media tables.
-- ----------------------------------------------------------------------------
alter table public.media_folders alter column vendor_id drop not null;
alter table public.media_items alter column vendor_id drop not null;

-- ----------------------------------------------------------------------------
-- 2. Platform folder names are unique, case-insensitively.
-- ----------------------------------------------------------------------------
create unique index if not exists media_folders_platform_name_unique
  on public.media_folders (lower(name))
  where vendor_id is null;

-- ----------------------------------------------------------------------------
-- 3a. Platform folders: staff may read, only admins may write.
-- ----------------------------------------------------------------------------
drop policy if exists media_folders_select_platform on public.media_folders;
create policy media_folders_select_platform on public.media_folders
  for select to authenticated
  using (
    vendor_id is null
    and (public.is_admin() or public.has_role('support'))
  );

drop policy if exists media_folders_insert_platform on public.media_folders;
create policy media_folders_insert_platform on public.media_folders
  for insert to authenticated
  with check (vendor_id is null and public.is_admin());

drop policy if exists media_folders_update_platform on public.media_folders;
create policy media_folders_update_platform on public.media_folders
  for update to authenticated
  using (vendor_id is null and public.is_admin())
  with check (vendor_id is null and public.is_admin());

drop policy if exists media_folders_delete_platform on public.media_folders;
create policy media_folders_delete_platform on public.media_folders
  for delete to authenticated
  using (vendor_id is null and public.is_admin());

-- ----------------------------------------------------------------------------
-- 3b. Platform items: staff may read; only admins may insert or update rows
--     directly (rename / move). Deletes stay on the audited RPC.
-- ----------------------------------------------------------------------------
drop policy if exists media_select_platform on public.media_items;
create policy media_select_platform on public.media_items
  for select to authenticated
  using (
    vendor_id is null
    and (public.is_admin() or public.has_role('support'))
  );

drop policy if exists media_insert_platform on public.media_items;
create policy media_insert_platform on public.media_items
  for insert to authenticated
  with check (vendor_id is null and public.is_admin());

drop policy if exists media_update_platform on public.media_items;
create policy media_update_platform on public.media_items
  for update to authenticated
  using (vendor_id is null and public.is_admin())
  with check (vendor_id is null and public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. admin_upload_media: the guarded, audited row insert behind a staff
--    upload, for a store destination (p_vendor_id set) or the platform's own
--    library (p_vendor_id null). Returns the recorded row.
-- ----------------------------------------------------------------------------
create or replace function public.admin_upload_media(
  p_vendor_id uuid,
  p_name text,
  p_folder text,
  p_object_path text,
  p_cdn_url text,
  p_mime_type text,
  p_size_bytes bigint,
  p_width integer default null,
  p_height integer default null
)
returns public.media_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.media_items%rowtype;
begin
  perform public.admin_require_admin('upload a media asset');

  if p_name is null or btrim(p_name) = '' then
    raise exception 'An uploaded asset needs a file name';
  end if;
  if p_folder is null or btrim(p_folder) = '' then
    raise exception 'An uploaded asset needs a destination folder';
  end if;
  if p_object_path is null or btrim(p_object_path) = '' then
    raise exception 'An uploaded asset needs a stored object path';
  end if;
  if p_vendor_id is not null
     and not exists (select 1 from public.vendor_profiles where id = p_vendor_id) then
    raise exception 'That store does not exist';
  end if;

  insert into public.media_items (
    vendor_id, name, folder, object_path, cdn_url, mime_type,
    size_bytes, width, height, status
  )
  values (
    p_vendor_id, p_name, p_folder, p_object_path,
    coalesce(p_cdn_url, ''), coalesce(p_mime_type, ''),
    greatest(coalesce(p_size_bytes, 0), 0), p_width, p_height, 'approved'
  )
  returning * into v_row;

  perform public.admin_audit('media.upload', 'media_item', v_row.id::text,
    jsonb_build_object('name', v_row.name, 'vendorId', v_row.vendor_id,
                       'folder', v_row.folder, 'objectPath', v_row.object_path),
    null);

  return v_row;
end;
$$;

revoke execute on function public.admin_upload_media(uuid, text, text, text, text, text, bigint, integer, integer)
  from public, anon;
grant execute on function public.admin_upload_media(uuid, text, text, text, text, text, bigint, integer, integer)
  to authenticated, service_role;
