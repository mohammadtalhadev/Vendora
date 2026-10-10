-- ==============================================================================
-- Vendora E-Commerce Marketplace: Supabase Storage Buckets & Access Policies
-- Buckets:
--   1. 'product-images' (Public): Product photos and gallery media
--   2. 'vendor-assets'  (Public): Store logos, header banners, brand badges
-- ==============================================================================

-- 1. Create Public Storage Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    10485760, -- 10MB limit per image
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
  ),
  (
    'vendor-assets',
    'vendor-assets',
    true,
    10485760, -- 10MB limit
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage Policies for 'product-images'
-- Public read access: Anyone can view product images
create policy "Public can view product images"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Authenticated upload: Logged-in vendors and users can upload product photos
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'product-images' );

-- Allow users to update their own uploads (required for upsert / replacements)
create policy "Users can update own product images"
on storage.objects for update
to authenticated
using ( bucket_id = 'product-images' and (select auth.uid())::text = owner::text )
with check ( bucket_id = 'product-images' and (select auth.uid())::text = owner::text );

-- Allow users to delete their own uploaded product images
create policy "Users can delete own product images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'product-images' and (select auth.uid())::text = owner::text );

-- 3. Storage Policies for 'vendor-assets'
-- Public read access: Anyone can view store logos and banners
create policy "Public can view vendor assets"
on storage.objects for select
using ( bucket_id = 'vendor-assets' );

-- Authenticated upload: Logged-in vendors can upload logos & banners
create policy "Authenticated users can upload vendor assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'vendor-assets' );

-- Update & delete for vendor assets
create policy "Users can update own vendor assets"
on storage.objects for update
to authenticated
using ( bucket_id = 'vendor-assets' and (select auth.uid())::text = owner::text )
with check ( bucket_id = 'vendor-assets' and (select auth.uid())::text = owner::text );

create policy "Users can delete own vendor assets"
on storage.objects for delete
to authenticated
using ( bucket_id = 'vendor-assets' and (select auth.uid())::text = owner::text );
