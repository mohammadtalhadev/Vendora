-- ============================================================================
-- Vendora Batch 62: the brands registry.
--
-- Until now there was no `brands` table at all: `products.brand` is free text
-- (NOT NULL DEFAULT '') and the admin brands page could only group approved
-- listings by that text, read-only. This batch adds the registry the console
-- asked for - admins can add, edit, rename and delete brands - WITHOUT turning
-- `products.brand` into a foreign key and without closing the add-product
-- forms' free-text brand inputs: a brand string a seller types still works,
-- it simply shows up in the registry as "unregistered" until an admin
-- registers it. The storefront catalog brand filter keeps matching the
-- product text exactly, untouched.
--
-- Writes go ONLY through the SECURITY DEFINER RPCs below, mirroring the
-- category RPCs in 20261011001000 (`admin_require_admin()` + `admin_audit()`).
-- The table itself grants SELECT and nothing else to app roles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The registry table.
-- ----------------------------------------------------------------------------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One registry row per brand name, however the name is capitalised, and one
-- per slug: the slug is derived from the name, never typed by hand.
create unique index if not exists brands_name_lower_key on public.brands (lower(name));
create unique index if not exists brands_slug_key on public.brands (slug);

create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

-- Backfill: every distinct brand string the catalog already carries becomes a
-- registered brand, so the registry starts from the truth the products prove
-- instead of from an empty table an admin would have to retype.
insert into public.brands (name, slug)
select candidate.name, candidate.slug
from (
  select distinct on (lower(btrim(p.brand)))
    btrim(p.brand) as name,
    btrim(regexp_replace(lower(btrim(p.brand)), '[^a-z0-9]+', '-', 'g'), '-') as slug
  from public.products p
  where btrim(p.brand) <> ''
  order by lower(btrim(p.brand)), btrim(p.brand)
) candidate
where candidate.slug <> ''
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 2. RLS: the public reads active brands, an admin reads all of them, and
--    nobody writes the table directly - the RPCs below are the only door.
-- ----------------------------------------------------------------------------
alter table public.brands enable row level security;

-- Two policies, not one: anon holds no EXECUTE on `is_admin()` (the grants
-- migration revoked it), so an expression that calls it can never sit in a
-- policy anon is evaluated against - the categories/products split is the
-- shape the rest of the schema uses for the same reason.
create policy brands_read_public on public.brands
  for select to anon, authenticated
  using (is_active);

create policy brands_read_admin on public.brands
  for select to authenticated
  using (public.is_admin());

grant select on public.brands to anon, authenticated;
grant select, insert, update, delete on public.brands to service_role;
-- The default privileges asserted in the grants migration hand authenticated
-- CRUD on every new table; take the write half back so "writes only via the
-- RPCs" holds at the grant level too, not just for want of a write policy.
revoke insert, update, delete on public.brands from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Governance writes, mirroring admin_create/update/delete_category.
--    Create and update return the registry row they landed.
-- ----------------------------------------------------------------------------
create or replace function public.admin_create_brand(
  p_name text,
  p_logo_url text default null,
  p_description text default null
)
returns public.brands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
  v_row public.brands;
begin
  perform public.admin_require_admin('create a brand');
  if v_name = '' then
    raise exception 'A brand needs a name';
  end if;
  v_slug := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' then
    raise exception 'A brand name needs at least one letter or digit';
  end if;
  if exists (select 1 from public.brands where lower(name) = lower(v_name)) then
    raise exception 'A brand named "%" already exists', v_name;
  end if;
  if exists (select 1 from public.brands where slug = v_slug) then
    raise exception 'A brand with a similar name already exists';
  end if;

  insert into public.brands (name, slug, logo_url, description)
  values (
    v_name,
    v_slug,
    nullif(btrim(coalesce(p_logo_url, '')), ''),
    nullif(btrim(coalesce(p_description, '')), '')
  )
  returning * into v_row;

  perform public.admin_audit('brand.create', 'brand', v_row.id::text, null,
    jsonb_build_object('name', v_row.name, 'slug', v_row.slug));

  return v_row;
end;
$$;

-- Coalesce-update: only the arguments actually given move, so a partial form
-- cannot wipe a brand. Changing the name here edits the registry row only -
-- the listings carrying the old text are moved by `admin_rename_brand`.
create or replace function public.admin_update_brand(
  p_id uuid,
  p_name text default null,
  p_logo_url text default null,
  p_description text default null,
  p_is_active boolean default null
)
returns public.brands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.brands;
  v_name text;
  v_slug text;
  v_row public.brands;
begin
  perform public.admin_require_admin('edit a brand');

  select * into v_before from public.brands where id = p_id;
  if not found then
    raise exception 'Brand not found';
  end if;

  v_name := coalesce(nullif(btrim(coalesce(p_name, '')), ''), v_before.name);
  v_slug := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' then
    raise exception 'A brand name needs at least one letter or digit';
  end if;
  if exists (select 1 from public.brands where lower(name) = lower(v_name) and id <> p_id) then
    raise exception 'A brand named "%" already exists', v_name;
  end if;
  if exists (select 1 from public.brands where slug = v_slug and id <> p_id) then
    raise exception 'A brand with a similar name already exists';
  end if;

  update public.brands
     set name = v_name,
         slug = v_slug,
         logo_url = coalesce(nullif(btrim(coalesce(p_logo_url, '')), ''), logo_url),
         description = coalesce(nullif(btrim(coalesce(p_description, '')), ''), description),
         is_active = coalesce(p_is_active, is_active),
         updated_at = now()
   where id = p_id
  returning * into v_row;

  perform public.admin_audit('brand.update', 'brand', p_id::text,
    jsonb_build_object('name', v_before.name, 'slug', v_before.slug, 'isActive', v_before.is_active),
    jsonb_build_object('name', v_row.name, 'slug', v_row.slug, 'isActive', v_row.is_active));

  return v_row;
end;
$$;

-- The rename a free-text catalog actually needs: every product carrying the
-- old brand string - in ANY status, not just approved - is re-lettered in
-- the same transaction, and the registry row (when one matches the old name)
-- follows. Returns how many products moved. Merging onto a DIFFERENT existing
-- brand is refused: that is a data decision, not a rename.
create or replace function public.admin_rename_brand(
  p_old_name text,
  p_new_name text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text := btrim(coalesce(p_old_name, ''));
  v_new text := btrim(coalesce(p_new_name, ''));
  v_slug text;
  v_count integer;
  v_registry_id uuid;
begin
  perform public.admin_require_admin('rename a brand');
  if v_old = '' then
    raise exception 'The current brand name is missing';
  end if;
  if v_new = '' then
    raise exception 'A brand needs a name';
  end if;
  v_slug := btrim(regexp_replace(lower(v_new), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' then
    raise exception 'A brand name needs at least one letter or digit';
  end if;
  if exists (
    select 1 from public.brands
    where lower(name) = lower(v_new) and lower(name) <> lower(v_old)
  ) then
    raise exception 'A brand named "%" already exists. Renaming onto an existing brand is not supported', v_new;
  end if;
  if exists (
    select 1 from public.brands
    where slug = v_slug and lower(name) <> lower(v_old)
  ) then
    raise exception 'A brand with a similar name already exists';
  end if;

  update public.products
     set brand = v_new
   where lower(btrim(brand)) = lower(v_old);
  get diagnostics v_count = row_count;

  update public.brands
     set name = v_new,
         slug = v_slug,
         updated_at = now()
   where lower(name) = lower(v_old)
  returning id into v_registry_id;

  perform public.admin_audit('brand.rename', 'brand', coalesce(v_registry_id::text, v_old),
    jsonb_build_object('name', v_old),
    jsonb_build_object('name', v_new, 'productsUpdated', v_count));

  return v_count;
end;
$$;

-- Deleting is refused while any product still carries the brand name, in any
-- status: the registry row going away must never strand the catalog text it
-- described. Rename (or reassign) the products first.
create or replace function public.admin_delete_brand(p_id uuid)
returns public.brands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.brands;
  v_products integer;
begin
  perform public.admin_require_admin('delete a brand');

  select * into v_row from public.brands where id = p_id;
  if not found then
    raise exception 'Brand not found';
  end if;

  select count(*) into v_products
    from public.products
   where lower(btrim(brand)) = lower(btrim(v_row.name));
  if v_products > 0 then
    raise exception 'This brand still has % product(s) carrying the name "%". Rename or reassign them first',
      v_products, v_row.name;
  end if;

  delete from public.brands where id = p_id;

  perform public.admin_audit('brand.delete', 'brand', p_id::text,
    jsonb_build_object('name', v_row.name, 'slug', v_row.slug), null);

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Grants: authenticated may call the RPCs (which re-check admin inside),
--    anon may not, and the internal audit helper stays staff-proof as set in
--    the console migration.
-- ----------------------------------------------------------------------------
revoke execute on function
  public.admin_create_brand(text, text, text),
  public.admin_update_brand(uuid, text, text, text, boolean),
  public.admin_rename_brand(text, text),
  public.admin_delete_brand(uuid)
from public, anon;

grant execute on function
  public.admin_create_brand(text, text, text),
  public.admin_update_brand(uuid, text, text, text, boolean),
  public.admin_rename_brand(text, text),
  public.admin_delete_brand(uuid)
to authenticated, service_role;
