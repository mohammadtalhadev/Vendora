-- ============================================================================
-- Vendora Batch 61: admin media full file management.
--
-- Until now `media_items.folder` was only a text label on each row: a folder
-- existed solely because a file carried its name, and the admin console could
-- do nothing with another store's assets but moderate them - row deletion had
-- no admin policy at all, so an admin delete would have stranded the record
-- or the object. This batch gives folders a row of their own and gives staff
-- one guarded delete path:
--
--   1. `media_folders` - one row per (vendor, folder name), backfilled from
--      the folder labels the existing rows already carry. Folder writes go
--      directly against this table under RLS (owner or admin); renaming a
--      folder also bulk-updates the `media_items.folder` labels, which the
--      existing `media_moderate_admin` UPDATE policy already admits for
--      admins and `media_update_owner` admits for the owning seller.
--   2. `admin_delete_media(uuid)` - the admin row-delete the table policy
--      never granted. SECURITY DEFINER, guarded by `admin_require_admin`,
--      audited through `admin_audit`, and it returns the captured storage
--      paths so the client can remove the bucket object after the row is
--      gone (storage removal is a client call, as in the vendor delete).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. media_folders: a folder is a row, not just a label other rows carry.
-- ----------------------------------------------------------------------------
create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, name)
);

create index if not exists media_folders_vendor_idx
  on public.media_folders (vendor_id, name);

-- Every folder label already in use becomes a real folder row.
insert into public.media_folders (vendor_id, name)
select distinct vendor_id, folder
  from public.media_items
 where folder is not null and folder <> ''
on conflict (vendor_id, name) do nothing;

alter table public.media_folders enable row level security;

drop policy if exists media_folders_select on public.media_folders;
create policy media_folders_select on public.media_folders
  for select to authenticated
  using (
    vendor_id = public.current_vendor_id()
    or public.is_admin()
    or public.has_role('support')
  );

drop policy if exists media_folders_insert on public.media_folders;
create policy media_folders_insert on public.media_folders
  for insert to authenticated
  with check (
    vendor_id = public.current_vendor_id()
    or public.is_admin()
  );

drop policy if exists media_folders_update on public.media_folders;
create policy media_folders_update on public.media_folders
  for update to authenticated
  using (
    vendor_id = public.current_vendor_id()
    or public.is_admin()
  )
  with check (
    vendor_id = public.current_vendor_id()
    or public.is_admin()
  );

drop policy if exists media_folders_delete on public.media_folders;
create policy media_folders_delete on public.media_folders
  for delete to authenticated
  using (
    vendor_id = public.current_vendor_id()
    or public.is_admin()
  );

grant select, insert, update, delete on public.media_folders to authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on public.media_folders to service_role;
revoke select, insert, update, delete on public.media_folders from anon;

-- ----------------------------------------------------------------------------
-- 2. admin_delete_media: capture the paths, delete the row, audit the delete.
--    The caller removes the storage object with the returned paths; a demo
--    row pointing at an external CDN has no object, which its `cdn_url`
--    tells the caller (it does not contain '/vendor-assets/').
-- ----------------------------------------------------------------------------
create or replace function public.admin_delete_media(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_name text;
  v_object_path text;
  v_cdn_url text;
begin
  perform public.admin_require_admin('delete a media asset');

  select vendor_id, name, object_path, cdn_url
    into v_vendor_id, v_name, v_object_path, v_cdn_url
    from public.media_items
   where id = p_id;

  if not found then
    raise exception 'Media asset not found';
  end if;

  delete from public.media_items where id = p_id;

  perform public.admin_audit('media.delete', 'media_item', p_id::text,
    jsonb_build_object('name', v_name, 'vendorId', v_vendor_id,
                       'objectPath', v_object_path, 'cdnUrl', v_cdn_url),
    null);

  return jsonb_build_object(
    'id', p_id,
    'deleted', true,
    'objectPath', v_object_path,
    'cdnUrl', v_cdn_url
  );
end;
$$;

revoke execute on function public.admin_delete_media(uuid) from public, anon;
grant execute on function public.admin_delete_media(uuid) to authenticated, service_role;
